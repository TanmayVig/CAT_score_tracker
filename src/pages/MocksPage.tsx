import { BarChart3, ChevronDown, ChevronRight, Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createMock, deleteMock, fetchMocks, updateMock } from "../api";
import { ChartFrame } from "../components/ChartFrame";
import { AnalysisStatus, CheckboxField, ChipButton } from "../components/FormControls";
import { PanelTitle } from "../components/PageScaffold";
import {
  CAT_SECTIONS,
  GAP_TOPICS,
  createEmptyMock,
  type CatSection,
  type MockAttempt,
  type MockAttemptInput,
} from "../shared/cat";
import { formatAttemptDate, getAnalysedPercentage } from "../utils/format";
import { cloneMockInput, toMockInput } from "../utils/mockTransforms";

type MetricMode = "percentile" | "marks";

const sectionColors: Record<CatSection, string> = {
  VARC: "#2f80ed",
  DILR: "#16a34a",
  QA: "#b45309",
};

type PageHandle = {
  refresh: () => Promise<void>;
  loading: boolean;
};

type MocksPageProps = {
  onStatusChange: (handle: PageHandle) => void;
};

export function MocksPage({ onStatusChange }: MocksPageProps) {
  const [mocks, setMocks] = useState<MockAttempt[]>([]);
  const [draft, setDraft] = useState<MockAttemptInput>(() => createEmptyMock());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [metricMode, setMetricMode] = useState<MetricMode>("percentile");
  const [expandedMockIds, setExpandedMockIds] = useState<Set<number>>(() => new Set());

  async function loadMocks() {
    setLoading(true);
    setError("");

    try {
      setMocks(await fetchMocks());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load mocks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMocks();
  }, []);

  useEffect(() => {
    onStatusChange({ refresh: loadMocks, loading });
  }, [loading, onStatusChange]);

  const sortedForCharts = useMemo(
    () =>
      [...mocks].sort((first, second) => {
        const attemptDifference = new Date(first.attemptDate).getTime() - new Date(second.attemptDate).getTime();
        return attemptDifference || new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
      }),
    [mocks],
  );

  const totalTrendData = useMemo(
    () =>
      sortedForCharts.map((mock) => ({
        name: `${mock.attemptDate.slice(5)} ${mock.name}`,
        Marks: mock.totalMarks,
        Percentile: mock.percentile,
      })),
    [sortedForCharts],
  );

  const sectionTrendData = useMemo(
    () =>
      sortedForCharts.map((mock) => ({
        name: `${mock.attemptDate.slice(5)} ${mock.name}`,
        VARC: metricMode === "percentile" ? mock.sections.VARC.percentile : mock.sections.VARC.marks,
        DILR: metricMode === "percentile" ? mock.sections.DILR.percentile : mock.sections.DILR.marks,
        QA: metricMode === "percentile" ? mock.sections.QA.percentile : mock.sections.QA.marks,
      })),
    [metricMode, sortedForCharts],
  );

  const gapData = useMemo(() => {
    const counts = new Map<string, number>();

    mocks.forEach((mock) => {
      CAT_SECTIONS.forEach((section) => {
        mock.sections[section].gaps.forEach((gap) => {
          counts.set(`${section}: ${gap}`, (counts.get(`${section}: ${gap}`) ?? 0) + 1);
        });
      });
    });

    return [...counts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 10);
  }, [mocks]);

  function updateField<Key extends keyof MockAttemptInput>(key: Key, value: MockAttemptInput[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateSection(section: CatSection, patch: Partial<MockAttemptInput["sections"][CatSection]>) {
    setDraft((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [section]: {
          ...current.sections[section],
          ...patch,
        },
      },
    }));
  }

  function toggleGap(section: CatSection, topic: string) {
    const gaps = draft.sections[section].gaps;
    updateSection(section, {
      gaps: gaps.includes(topic) ? gaps.filter((gap) => gap !== topic) : [...gaps, topic],
    });
  }

  function updateLearning(section: CatSection, index: number, value: string) {
    const nextLearnings = [...draft.sections[section].learnings];
    nextLearnings[index] = value;
    updateSection(section, { learnings: nextLearnings });
  }

  function addLearning(section: CatSection) {
    updateSection(section, { learnings: [...draft.sections[section].learnings, ""] });
  }

  function removeLearning(section: CatSection, index: number) {
    const nextLearnings = draft.sections[section].learnings.filter((_, itemIndex) => itemIndex !== index);
    updateSection(section, { learnings: nextLearnings.length ? nextLearnings : [""] });
  }

  function resetForm() {
    setDraft(createEmptyMock());
    setEditingId(null);
    setError("");
  }

  function editMock(mock: MockAttempt) {
    setDraft(toMockInput(mock));
    setEditingId(mock.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleMockDetails(mockId: number) {
    setExpandedMockIds((current) => {
      const next = new Set(current);
      next.has(mockId) ? next.delete(mockId) : next.add(mockId);
      return next;
    });
  }

  async function removeMock(mock: MockAttempt) {
    if (!window.confirm(`Delete "${mock.name}" from ${formatAttemptDate(mock.attemptDate)}?`)) {
      return;
    }

    setDeletingId(mock.id);
    setError("");

    try {
      await deleteMock(mock.id);
      if (editingId === mock.id) {
        resetForm();
      }
      setExpandedMockIds((current) => {
        const next = new Set(current);
        next.delete(mock.id);
        return next;
      });
      await loadMocks();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete mock.");
    } finally {
      setDeletingId(null);
    }
  }

  async function submitMock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = cloneMockInput(draft);
      editingId ? await updateMock(editingId, payload) : await createMock(payload);
      resetForm();
      await loadMocks();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save mock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error ? <div className="alert">{error}</div> : null}

      <section className="layout-grid">
        <MockForm
          draft={draft}
          editing={editingId !== null}
          saving={saving}
          onSubmit={submitMock}
          onReset={resetForm}
          onFieldChange={updateField}
          onSectionChange={updateSection}
          onToggleGap={toggleGap}
          onLearningChange={updateLearning}
          onAddLearning={addLearning}
          onRemoveLearning={removeLearning}
        />
        <MockList
          mocks={mocks}
          loading={loading}
          deletingId={deletingId}
          expandedIds={expandedMockIds}
          analysedPercentage={getAnalysedPercentage(mocks)}
          onEdit={editMock}
          onDelete={removeMock}
          onToggleDetails={toggleMockDetails}
        />
      </section>

      <MockAnalytics
        totalTrendData={totalTrendData}
        sectionTrendData={sectionTrendData}
        gapData={gapData}
        metricMode={metricMode}
        onMetricModeChange={setMetricMode}
      />
    </>
  );
}

type MockFormProps = {
  draft: MockAttemptInput;
  editing: boolean;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onFieldChange: <Key extends keyof MockAttemptInput>(key: Key, value: MockAttemptInput[Key]) => void;
  onSectionChange: (section: CatSection, patch: Partial<MockAttemptInput["sections"][CatSection]>) => void;
  onToggleGap: (section: CatSection, topic: string) => void;
  onLearningChange: (section: CatSection, index: number, value: string) => void;
  onAddLearning: (section: CatSection) => void;
  onRemoveLearning: (section: CatSection, index: number) => void;
};

function MockForm({
  draft,
  editing,
  saving,
  onSubmit,
  onReset,
  onFieldChange,
  onSectionChange,
  onToggleGap,
  onLearningChange,
  onAddLearning,
  onRemoveLearning,
}: MockFormProps) {
  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <PanelTitle
        eyebrow={editing ? "Edit mock" : "Add mock"}
        title={editing ? "Update attempt" : "New attempt"}
        icon={
          editing ? (
            <button className="icon-button" type="button" onClick={onReset} aria-label="Cancel edit" title="Cancel edit">
              <X aria-hidden="true" size={18} />
            </button>
          ) : null
        }
      />

      <div className="field-grid">
        <label>
          Mock Name
          <input value={draft.name} onChange={(event) => onFieldChange("name", event.target.value)} placeholder="AIMCAT 2501" required />
        </label>
        <label>
          Attempt Date
          <input type="date" value={draft.attemptDate} onChange={(event) => onFieldChange("attemptDate", event.target.value)} required />
        </label>
        <label>
          Total Marks
          <input type="number" min="-100" max="300" step="0.01" value={draft.totalMarks} onChange={(event) => onFieldChange("totalMarks", Number(event.target.value))} required />
        </label>
        <label>
          Total Percentile
          <input type="number" min="0" max="100" step="0.01" value={draft.percentile} onChange={(event) => onFieldChange("percentile", Number(event.target.value))} required />
        </label>
        <CheckboxField checked={draft.analysed} onChange={(checked) => onFieldChange("analysed", checked)} />
      </div>

      <div className="section-stack">
        {CAT_SECTIONS.map((section) => (
          <section className="section-box" key={section}>
            <div className="section-title">
              <h3>{section}</h3>
            </div>

            <div className="field-grid compact">
              <label>
                Marks
                <input type="number" min="-50" max="150" step="0.01" value={draft.sections[section].marks} onChange={(event) => onSectionChange(section, { marks: Number(event.target.value) })} required />
              </label>
              <label>
                Percentile
                <input type="number" min="0" max="100" step="0.01" value={draft.sections[section].percentile} onChange={(event) => onSectionChange(section, { percentile: Number(event.target.value) })} required />
              </label>
            </div>

            <div className="topic-group" aria-label={`${section} gaps`}>
              <h4 className="color-grey">Gaps: </h4>
              {GAP_TOPICS[section].map((topic) => (
                <ChipButton key={topic} selected={draft.sections[section].gaps.includes(topic)} onClick={() => onToggleGap(section, topic)}>
                  {topic}
                </ChipButton>
              ))}
            </div>

            <div className="learning-list">
              {draft.sections[section].learnings.map((learning, index) => (
                <div className="learning-row" key={`${section}-${index}`}>
                  <input value={learning} onChange={(event) => onLearningChange(section, index, event.target.value)} placeholder={`${section} Learning`} />
                  <button className="icon-button" type="button" onClick={() => onRemoveLearning(section, index)} aria-label="Remove learning" title="Remove learning">
                    <X aria-hidden="true" size={16} />
                  </button>
                </div>
              ))}
              <button className="ghost-button small" type="button" onClick={() => onAddLearning(section)}>
                <Plus aria-hidden="true" size={16} />
                Learning
              </button>
            </div>
          </section>
        ))}
      </div>

      <button className="primary-button" type="submit" disabled={saving}>
        <Save aria-hidden="true" size={18} />
        {saving ? "Saving..." : editing ? "Save changes" : "Add mock"}
      </button>
    </form>
  );
}

type MockListProps = {
  mocks: MockAttempt[];
  loading: boolean;
  deletingId: number | null;
  expandedIds: Set<number>;
  analysedPercentage: number;
  onEdit: (mock: MockAttempt) => void;
  onDelete: (mock: MockAttempt) => void;
  onToggleDetails: (mockId: number) => void;
};

function MockList({ mocks, loading, deletingId, expandedIds, analysedPercentage, onEdit, onDelete, onToggleDetails }: MockListProps) {
  return (
    <section className="panel list-panel">
      <PanelTitle
        eyebrow="Attempted mocks"
        title={`${mocks.length} saved`}
        meta={<p className="analysis-progress">{analysedPercentage}% Analysed</p>}
        icon={<BarChart3 aria-hidden="true" size={22} />}
      />

      {loading ? <p className="muted">Loading mocks...</p> : null}
      {!loading && mocks.length === 0 ? <p className="muted">Add your first mock to unlock trends.</p> : null}

      <div className="mock-list">
        {mocks.map((mock) => {
          const isExpanded = expandedIds.has(mock.id);

          return (
            <article className="mock-item" key={mock.id}>
              <div>
                <h3>{mock.name}</h3>
                <p className="mock-date">{formatAttemptDate(mock.attemptDate)}</p>
                <p>
                  {mock.totalMarks} Marks - {mock.percentile} Percentile
                </p>
                <AnalysisStatus analysed={mock.analysed} />
                <div className="mini-sections">
                  {CAT_SECTIONS.map((section) => (
                    <span key={section}>
                      {section}: {mock.sections[section].marks} / {mock.sections[section].percentile}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mock-actions">
                <button className="icon-button" type="button" onClick={() => onToggleDetails(mock.id)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Hide" : "Show"} ${mock.name} details`} title={isExpanded ? "Hide details" : "Show details"}>
                  {isExpanded ? <ChevronDown aria-hidden="true" size={18} /> : <ChevronRight aria-hidden="true" size={18} />}
                </button>
                <button className="icon-button" type="button" onClick={() => onEdit(mock)} aria-label={`Edit ${mock.name}`} title="Edit mock">
                  <Edit3 aria-hidden="true" size={17} />
                </button>
                <button className="icon-button danger" type="button" onClick={() => onDelete(mock)} aria-label={`Delete ${mock.name}`} title="Delete mock" disabled={deletingId === mock.id}>
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </div>
              {isExpanded ? <MockDetails mock={mock} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MockDetails({ mock }: { mock: MockAttempt }) {
  return (
    <div className="mock-details">
      {CAT_SECTIONS.map((section) => {
        const details = mock.sections[section];

        return (
          <section className="mock-detail-section" key={section}>
            <div className="detail-section-heading">
              <h4>{section}</h4>
              <span>
                {details.marks} Marks - {details.percentile} Percentile
              </span>
            </div>

            <div className="detail-block">
              <h5>Gaps</h5>
              {details.gaps.length ? (
                <div className="detail-chips">
                  {details.gaps.map((gap) => (
                    <span key={gap}>{gap}</span>
                  ))}
                </div>
              ) : (
                <p className="detail-empty">No gaps added</p>
              )}
            </div>

            <div className="detail-block">
              <h5>Learnings</h5>
              {details.learnings.length ? (
                <ul className="learning-points">
                  {details.learnings.map((learning, index) => (
                    <li key={`${section}-learning-${index}`}>{learning}</li>
                  ))}
                </ul>
              ) : (
                <p className="detail-empty">No learnings added</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

type MockAnalyticsProps = {
  totalTrendData: Array<{ name: string; Marks: number; Percentile: number }>;
  sectionTrendData: Array<{ name: string; VARC: number; DILR: number; QA: number }>;
  gapData: Array<{ topic: string; count: number }>;
  metricMode: MetricMode;
  onMetricModeChange: (mode: MetricMode) => void;
};

function MockAnalytics({ totalTrendData, sectionTrendData, gapData, metricMode, onMetricModeChange }: MockAnalyticsProps) {
  return (
    <section className="analytics-grid">
      <article className="panel chart-panel">
        <PanelTitle eyebrow="Overall trend" title="Total score and percentile" />
        <ChartFrame empty={totalTrendData.length === 0}>
          <LineChart data={totalTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Marks" stroke="#2f80ed" strokeWidth={2} />
            <Line type="monotone" dataKey="Percentile" stroke="#b45309" strokeWidth={2} />
          </LineChart>
        </ChartFrame>
      </article>

      <article className="panel chart-panel">
        <PanelTitle
          eyebrow="Section trend"
          title={`Section-wise ${metricMode}`}
          icon={
            <div className="segmented-control" aria-label="Section metric">
              <button className={metricMode === "percentile" ? "active" : ""} type="button" onClick={() => onMetricModeChange("percentile")}>
                Percentile
              </button>
              <button className={metricMode === "marks" ? "active" : ""} type="button" onClick={() => onMetricModeChange("marks")}>
                Marks
              </button>
            </div>
          }
        />
        <ChartFrame empty={sectionTrendData.length === 0}>
          <LineChart data={sectionTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {CAT_SECTIONS.map((section) => (
              <Line key={section} type="monotone" dataKey={section} stroke={sectionColors[section]} strokeWidth={2} />
            ))}
          </LineChart>
        </ChartFrame>
      </article>

      <article className="panel chart-panel wide-chart">
        <PanelTitle eyebrow="Gap areas" title="Most frequent weak topics" />
        <ChartFrame empty={gapData.length === 0}>
          <BarChart data={gapData} layout="vertical" margin={{ left: 84 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="topic" width={150} />
            <Tooltip />
            <Bar dataKey="count" fill="#475569" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartFrame>
      </article>
    </section>
  );
}
