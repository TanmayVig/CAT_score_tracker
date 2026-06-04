import { ClipboardList, Edit3, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { createSmallTest, deleteSmallTest, fetchSmallTests, updateSmallTest } from "../api";
import { ChartFrame } from "../components/ChartFrame";
import { AnalysisStatus, CheckboxField, ChipButton } from "../components/FormControls";
import { PanelTitle, type PageHandle } from "../components/PageScaffold";
import {
  SMALL_TEST_SECTIONS,
  SMALL_TEST_SOURCES,
  SMALL_TEST_TYPES,
  createEmptySmallTest,
  createEmptySmallTestTypes,
  type SmallTest,
  type SmallTestInput,
  type SmallTestSection,
} from "../shared/cat";
import { formatAttemptDate, getAnalysedPercentage } from "../utils/format";
import { exportSmallTestsForLLM } from "../utils/llmExport";
import { cloneSmallTestInput, toSmallTestInput } from "../utils/mockTransforms";

const smallSectionColors: Record<SmallTestSection, string> = {
  VA: "#2f80ed",
  RC: "#7c3aed",
  LR: "#16a34a",
  DI: "#0891b2",
  Quants: "#b45309",
};

type SectionAnalysis = {
  section: SmallTestSection;
  tests: SmallTest[];
  trendData: Array<{ name: string; Accuracy: number; Score: number }>;
  topicStrength: Array<{ topic: string; accuracy: number; tests: number }>;
};

type SmallTestsPageProps = {
  onStatusChange: (handle: PageHandle) => void;
};

export function SmallTestsPage({ onStatusChange }: SmallTestsPageProps) {
  const [tests, setTests] = useState<SmallTest[]>([]);
  const [draft, setDraft] = useState<SmallTestInput>(() => createEmptySmallTest());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadSmallTests() {
    setLoading(true);
    setError("");

    try {
      setTests(await fetchSmallTests());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load small tests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSmallTests();
  }, []);

  useEffect(() => {
    onStatusChange({
      refresh: loadSmallTests,
      loading,
      exportData: () => exportSmallTestsForLLM(tests),
      exportDisabled: tests.length === 0,
      exportLabel: "Export tests",
    });
  }, [loading, tests, onStatusChange]);

  const unattempted = Math.max(0, draft.totalQuestions - (draft.totalCorrect + draft.totalIncorrect));
  const groupedAnalysis = useMemo(() => buildSectionAnalysis(tests), [tests]);

  function updateField<Key extends keyof SmallTestInput>(key: Key, value: SmallTestInput[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleSection(section: SmallTestSection) {
    setDraft((current) => {
      const selected = current.sections.includes(section);

      return {
        ...current,
        sections: selected ? current.sections.filter((item) => item !== section) : [...current.sections, section],
        types: {
          ...current.types,
          [section]: selected ? [] : current.types[section],
        },
      };
    });
  }

  function toggleType(section: SmallTestSection, type: string) {
    setDraft((current) => {
      const sectionTypes = current.types[section];

      return {
        ...current,
        types: {
          ...current.types,
          [section]: sectionTypes.includes(type) ? sectionTypes.filter((item) => item !== type) : [...sectionTypes, type],
        },
      };
    });
  }

  function resetForm() {
    setDraft(createEmptySmallTest());
    setEditingId(null);
    setError("");
  }

  function editTest(test: SmallTest) {
    setDraft(toSmallTestInput(test));
    setEditingId(test.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeTest(test: SmallTest) {
    if (!window.confirm(`Delete ${test.source} test from ${formatAttemptDate(test.attemptDate)}?`)) {
      return;
    }

    setDeletingId(test.id);
    setError("");

    try {
      await deleteSmallTest(test.id);
      if (editingId === test.id) {
        resetForm();
      }
      await loadSmallTests();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete small test.");
    } finally {
      setDeletingId(null);
    }
  }

  async function submitTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = cloneSmallTestInput({
        ...draft,
        types: {
          ...createEmptySmallTestTypes(),
          ...draft.types,
        },
      });

      editingId ? await updateSmallTest(editingId, payload) : await createSmallTest(payload);
      resetForm();
      await loadSmallTests();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save small test.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error ? <div className="alert">{error}</div> : null}

      <section className="layout-grid small-test-layout">
        <SmallTestForm
          draft={draft}
          editing={editingId !== null}
          saving={saving}
          unattempted={unattempted}
          onSubmit={submitTest}
          onReset={resetForm}
          onFieldChange={updateField}
          onToggleSection={toggleSection}
          onToggleType={toggleType}
        />
        <SmallTestList
          tests={tests}
          loading={loading}
          deletingId={deletingId}
          analysedPercentage={getAnalysedPercentage(tests)}
          onEdit={editTest}
          onDelete={removeTest}
        />
      </section>

      <SmallTestAnalysis groupedAnalysis={groupedAnalysis} />
    </>
  );
}

function buildSectionAnalysis(tests: SmallTest[]): SectionAnalysis[] {
  return SMALL_TEST_SECTIONS.map((section) => {
    const sectionTests = tests
      .filter((test) => test.sections.includes(section))
      .sort(
        (first, second) =>
          new Date(first.attemptDate).getTime() - new Date(second.attemptDate).getTime() ||
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
      );
    const topicStats = new Map<string, { topic: string; tests: number; accuracyTotal: number }>();

    sectionTests.forEach((test) => {
      test.types[section].forEach((topic) => {
        const current = topicStats.get(topic) ?? { topic, tests: 0, accuracyTotal: 0 };
        topicStats.set(topic, {
          topic,
          tests: current.tests + 1,
          accuracyTotal: current.accuracyTotal + test.accuracy,
        });
      });
    });

    return {
      section,
      tests: sectionTests,
      trendData: sectionTests.map((test) => ({
        name: `${test.attemptDate.slice(5)} ${test.source}`,
        Accuracy: test.accuracy,
        Score: test.score,
      })),
      topicStrength: [...topicStats.values()]
        .map((topic) => ({
          topic: topic.topic,
          accuracy: Math.round(topic.accuracyTotal / topic.tests),
          tests: topic.tests,
        }))
        .sort((first, second) => second.accuracy - first.accuracy || second.tests - first.tests),
    };
  });
}

type SmallTestFormProps = {
  draft: SmallTestInput;
  editing: boolean;
  saving: boolean;
  unattempted: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onFieldChange: <Key extends keyof SmallTestInput>(key: Key, value: SmallTestInput[Key]) => void;
  onToggleSection: (section: SmallTestSection) => void;
  onToggleType: (section: SmallTestSection, type: string) => void;
};

function SmallTestForm({ draft, editing, saving, unattempted, onSubmit, onReset, onFieldChange, onToggleSection, onToggleType }: SmallTestFormProps) {
  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <PanelTitle
        eyebrow={editing ? "Edit Small Test" : "Add Small Test"}
        title={editing ? "Update Test" : "New Test"}
        icon={
          editing ? (
            <button className="icon-button" type="button" onClick={onReset} aria-label="Cancel edit" title="Cancel edit">
              <X aria-hidden="true" size={18} />
            </button>
          ) : null
        }
      />

      <div className="field-grid small-test-fields">
        <label>
          Source
          <select value={draft.source} onChange={(event) => onFieldChange("source", event.target.value as SmallTestInput["source"])}>
            {SMALL_TEST_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
        <label>
          Attempt Date
          <input type="date" value={draft.attemptDate} onChange={(event) => onFieldChange("attemptDate", event.target.value)} required />
        </label>
        <label>
          Score
          <input type="number" step="0.01" value={draft.score} onChange={(event) => onFieldChange("score", Number(event.target.value))} required />
        </label>
        <label>
          Total Questions
          <input type="number" min="0" step="1" value={draft.totalQuestions} onChange={(event) => onFieldChange("totalQuestions", Number(event.target.value))} required />
        </label>
        <label>
          Correct
          <input type="number" min="0" step="1" value={draft.totalCorrect} onChange={(event) => onFieldChange("totalCorrect", Number(event.target.value))} required />
        </label>
        <label>
          Incorrect
          <input type="number" min="0" step="1" value={draft.totalIncorrect} onChange={(event) => onFieldChange("totalIncorrect", Number(event.target.value))} required />
        </label>
        <label>
          Unattempted
          <input type="number" value={unattempted} readOnly />
        </label>
        <CheckboxField checked={draft.analysed} onChange={(checked) => onFieldChange("analysed", checked)} />
      </div>

      <div className="section-box small-section-picker">
        <h3>Sections</h3>
        <div className="topic-group" aria-label="Small test sections">
          {SMALL_TEST_SECTIONS.map((section) => (
            <ChipButton key={section} selected={draft.sections.includes(section)} onClick={() => onToggleSection(section)}>
              {section}
            </ChipButton>
          ))}
        </div>
      </div>

      {draft.sections.length ? (
        <div className="section-stack">
          {draft.sections.map((section) => (
            <section className="section-box" key={section}>
              <div className="section-title">
                <h3>{section} types</h3>
              </div>
              <div className="topic-group" aria-label={`${section} types`}>
                {SMALL_TEST_TYPES[section].map((type) => (
                  <ChipButton key={type} selected={draft.types[section].includes(type)} onClick={() => onToggleType(section, type)}>
                    {type}
                  </ChipButton>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <button className="primary-button" type="submit" disabled={saving}>
        <Save aria-hidden="true" size={18} />
        {saving ? "Saving..." : editing ? "Save Changes" : "Add test"}
      </button>
    </form>
  );
}

type SmallTestListProps = {
  tests: SmallTest[];
  loading: boolean;
  deletingId: number | null;
  analysedPercentage: number;
  onEdit: (test: SmallTest) => void;
  onDelete: (test: SmallTest) => void;
};

function SmallTestList({ tests, loading, deletingId, analysedPercentage, onEdit, onDelete }: SmallTestListProps) {
  return (
    <section className="panel list-panel">
      <PanelTitle
        eyebrow="Small tests"
        title={`${tests.length} saved`}
        meta={<p className="analysis-progress">{analysedPercentage}% analysed</p>}
        icon={<ClipboardList aria-hidden="true" size={22} />}
      />

      {loading ? <p className="muted">Loading small tests...</p> : null}
      {!loading && tests.length === 0 ? <p className="muted">Add a small test to unlock section analysis.</p> : null}

      <div className="mock-list">
        {tests.map((test) => (
          <article className="mock-item" key={test.id}>
            <div>
              <h3>{test.source}</h3>
              <p className="mock-date">{formatAttemptDate(test.attemptDate)}</p>
              <p>
                {test.score} score - {test.accuracy}% Accuracy
              </p>
              <AnalysisStatus analysed={test.analysed} />
              <div className="mini-sections">
                {test.sections.map((section) => (
                  <span key={section}>{section}</span>
                ))}
                <span>{test.totalCorrect} Correct</span>
                <span>{test.totalIncorrect} Incorrect</span>
                <span>{test.unattempted} Unattempted</span>
              </div>
            </div>
            <div className="mock-actions">
              <button className="icon-button" type="button" onClick={() => onEdit(test)} aria-label={`Edit ${test.source} test`} title="Edit test">
                <Edit3 aria-hidden="true" size={17} />
              </button>
              <button className="icon-button danger" type="button" onClick={() => onDelete(test)} aria-label={`Delete ${test.source} test`} title="Delete test" disabled={deletingId === test.id}>
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SmallTestAnalysis({ groupedAnalysis }: { groupedAnalysis: SectionAnalysis[] }) {
  return (
    <section className="section-analysis-grid">
      {groupedAnalysis.map(({ section, tests, trendData, topicStrength }) => (
        <article className="panel chart-panel section-analysis-card" key={section}>
          <PanelTitle eyebrow={section} title={`${tests.length} tests`} />

          <ChartFrame empty={trendData.length === 0}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Accuracy" stroke={smallSectionColors[section]} strokeWidth={2} />
              <Line type="monotone" dataKey="Score" stroke="#475569" strokeWidth={2} />
            </LineChart>
          </ChartFrame>

          <div className="topic-strength-list">
            <h3>Topic strength</h3>
            {topicStrength.length ? (
              topicStrength.map((topic) => (
                <div className="topic-strength-row" key={topic.topic}>
                  <span>{topic.topic}</span>
                  <strong>
                    {topic.accuracy}% - {topic.tests} tests
                  </strong>
                </div>
              ))
            ) : (
              <p className="muted">Tag tests with types to see strengths.</p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
