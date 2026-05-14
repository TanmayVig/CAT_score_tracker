import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createMock,
  createSmallTest,
  deleteMock,
  deleteSmallTest,
  fetchMocks,
  fetchSmallTests,
  updateMock,
  updateSmallTest,
} from "./api";
import {
  CAT_SECTIONS,
  GAP_TOPICS,
  SMALL_TEST_SECTIONS,
  SMALL_TEST_SOURCES,
  SMALL_TEST_TYPES,
  createEmptyMock,
  createEmptySmallTest,
  createEmptySmallTestTypes,
  type CatSection,
  type MockAttempt,
  type MockAttemptInput,
  type SmallTest,
  type SmallTestInput,
  type SmallTestSection,
} from "./shared/cat";

type MetricMode = "percentile" | "marks";
type ActivePage = "mocks" | "small-tests";

const sectionColors: Record<CatSection, string> = {
  VARC: "#2f80ed",
  DILR: "#16a34a",
  QA: "#b45309",
};

const smallSectionColors: Record<SmallTestSection, string> = {
  VA: "#2f80ed",
  RC: "#7c3aed",
  LR: "#16a34a",
  DI: "#0891b2",
  Quants: "#b45309",
};

function formatAttemptDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function cloneMockInput(mock: MockAttemptInput): MockAttemptInput {
  return {
    name: mock.name,
    attemptDate: mock.attemptDate,
    analysed: mock.analysed,
    totalMarks: mock.totalMarks,
    percentile: mock.percentile,
    sections: {
      VARC: {
        ...mock.sections.VARC,
        gaps: [...mock.sections.VARC.gaps],
        learnings: [...mock.sections.VARC.learnings],
      },
      DILR: {
        ...mock.sections.DILR,
        gaps: [...mock.sections.DILR.gaps],
        learnings: [...mock.sections.DILR.learnings],
      },
      QA: {
        ...mock.sections.QA,
        gaps: [...mock.sections.QA.gaps],
        learnings: [...mock.sections.QA.learnings],
      },
    },
  };
}

function toMockInput(mock: MockAttempt): MockAttemptInput {
  return cloneMockInput(mock);
}

function cloneSmallTestInput(test: SmallTestInput): SmallTestInput {
  return {
    sections: [...test.sections],
    source: test.source,
    score: test.score,
    totalQuestions: test.totalQuestions,
    totalCorrect: test.totalCorrect,
    totalIncorrect: test.totalIncorrect,
    types: {
      VA: [...test.types.VA],
      RC: [...test.types.RC],
      LR: [...test.types.LR],
      DI: [...test.types.DI],
      Quants: [...test.types.Quants],
    },
    attemptDate: test.attemptDate,
    analysed: test.analysed,
  };
}

function toSmallTestInput(test: SmallTest): SmallTestInput {
  return cloneSmallTestInput(test);
}

function App() {
  const [activePage, setActivePage] = useState<ActivePage>("mocks");
  const [mocks, setMocks] = useState<MockAttempt[]>([]);
  const [draft, setDraft] = useState<MockAttemptInput>(() => createEmptyMock());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [smallTests, setSmallTests] = useState<SmallTest[]>([]);
  const [smallTestDraft, setSmallTestDraft] = useState<SmallTestInput>(() =>
    createEmptySmallTest(),
  );
  const [editingSmallTestId, setEditingSmallTestId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [smallTestsLoading, setSmallTestsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSmallTest, setSavingSmallTest] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingSmallTestId, setDeletingSmallTestId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState("");
  const [metricMode, setMetricMode] = useState<MetricMode>("percentile");
  const [expandedMockIds, setExpandedMockIds] = useState<Set<number>>(
    () => new Set(),
  );

  const sortedForCharts = useMemo(
    () =>
      [...mocks].sort((first, second) => {
        const attemptDifference =
          new Date(first.attemptDate).getTime() -
          new Date(second.attemptDate).getTime();
        return (
          attemptDifference ||
          new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime()
        );
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
        VARC:
          metricMode === "percentile"
            ? mock.sections.VARC.percentile
            : mock.sections.VARC.marks,
        DILR:
          metricMode === "percentile"
            ? mock.sections.DILR.percentile
            : mock.sections.DILR.marks,
        QA:
          metricMode === "percentile"
            ? mock.sections.QA.percentile
            : mock.sections.QA.marks,
      })),
    [metricMode, sortedForCharts],
  );

  const gapData = useMemo(() => {
    const counts = new Map<string, number>();

    mocks.forEach((mock) => {
      CAT_SECTIONS.forEach((section) => {
        mock.sections[section].gaps.forEach((gap) => {
          counts.set(
            `${section}: ${gap}`,
            (counts.get(`${section}: ${gap}`) ?? 0) + 1,
          );
        });
      });
    });

    return [...counts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 10);
  }, [mocks]);

  const analysedPercentage = useMemo(() => {
    if (mocks.length === 0) {
      return 0;
    }

    const analysedCount = mocks.filter((mock) => mock.analysed).length;
    return Math.round((analysedCount / mocks.length) * 100);
  }, [mocks]);

  const smallTestUnattempted = Math.max(
    0,
    smallTestDraft.totalQuestions -
      (smallTestDraft.totalCorrect + smallTestDraft.totalIncorrect),
  );

  const smallTestsBySection = useMemo(() => {
    return SMALL_TEST_SECTIONS.map((section) => {
      const tests = smallTests
        .filter((test) => test.sections.includes(section))
        .sort(
          (first, second) =>
            new Date(first.attemptDate).getTime() -
              new Date(second.attemptDate).getTime() ||
            new Date(first.createdAt).getTime() -
              new Date(second.createdAt).getTime(),
        );
      const topicStats = new Map<
        string,
        { topic: string; tests: number; accuracyTotal: number }
      >();

      tests.forEach((test) => {
        test.types[section].forEach((topic) => {
          const current = topicStats.get(topic) ?? {
            topic,
            tests: 0,
            accuracyTotal: 0,
          };
          topicStats.set(topic, {
            topic,
            tests: current.tests + 1,
            accuracyTotal: current.accuracyTotal + test.accuracy,
          });
        });
      });

      return {
        section,
        tests,
        trendData: tests.map((test) => ({
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
          .sort(
            (first, second) =>
              second.accuracy - first.accuracy || second.tests - first.tests,
          ),
      };
    });
  }, [smallTests]);

  async function loadMocks() {
    setLoading(true);
    setError("");

    try {
      setMocks(await fetchMocks());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load mocks.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSmallTests() {
    setSmallTestsLoading(true);
    setError("");

    try {
      setSmallTests(await fetchSmallTests());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load small tests.",
      );
    } finally {
      setSmallTestsLoading(false);
    }
  }

  async function refreshCurrentPage() {
    if (activePage === "mocks") {
      await loadMocks();
    } else {
      await loadSmallTests();
    }
  }

  useEffect(() => {
    void loadMocks();
    void loadSmallTests();
  }, []);

  function updateField<Key extends keyof MockAttemptInput>(
    key: Key,
    value: MockAttemptInput[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateSmallTestField<Key extends keyof SmallTestInput>(
    key: Key,
    value: SmallTestInput[Key],
  ) {
    setSmallTestDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleSmallTestSection(section: SmallTestSection) {
    setSmallTestDraft((current) => {
      const selected = current.sections.includes(section);
      const sections = selected
        ? current.sections.filter((item) => item !== section)
        : [...current.sections, section];
      const types = {
        ...current.types,
        [section]: selected ? [] : current.types[section],
      };

      return { ...current, sections, types };
    });
  }

  function toggleSmallTestType(section: SmallTestSection, type: string) {
    setSmallTestDraft((current) => {
      const sectionTypes = current.types[section];
      const nextTypes = sectionTypes.includes(type)
        ? sectionTypes.filter((item) => item !== type)
        : [...sectionTypes, type];

      return {
        ...current,
        types: {
          ...current.types,
          [section]: nextTypes,
        },
      };
    });
  }

  function updateSection(
    section: CatSection,
    patch: Partial<MockAttemptInput["sections"][CatSection]>,
  ) {
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
    const nextGaps = gaps.includes(topic)
      ? gaps.filter((gap) => gap !== topic)
      : [...gaps, topic];
    updateSection(section, { gaps: nextGaps });
  }

  function updateLearning(section: CatSection, index: number, value: string) {
    const nextLearnings = [...draft.sections[section].learnings];
    nextLearnings[index] = value;
    updateSection(section, { learnings: nextLearnings });
  }

  function addLearning(section: CatSection) {
    updateSection(section, {
      learnings: [...draft.sections[section].learnings, ""],
    });
  }

  function removeLearning(section: CatSection, index: number) {
    const nextLearnings = draft.sections[section].learnings.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    updateSection(section, {
      learnings: nextLearnings.length ? nextLearnings : [""],
    });
  }

  function resetForm() {
    setDraft(createEmptyMock());
    setEditingId(null);
    setError("");
  }

  function resetSmallTestForm() {
    setSmallTestDraft(createEmptySmallTest());
    setEditingSmallTestId(null);
    setError("");
  }

  function editMock(mock: MockAttempt) {
    setDraft(toMockInput(mock));
    setEditingId(mock.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editSmallTest(test: SmallTest) {
    setSmallTestDraft(toSmallTestInput(test));
    setEditingSmallTestId(test.id);
    setActivePage("small-tests");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleMockDetails(mockId: number) {
    setExpandedMockIds((current) => {
      const next = new Set(current);

      if (next.has(mockId)) {
        next.delete(mockId);
      } else {
        next.add(mockId);
      }

      return next;
    });
  }

  async function removeMock(mock: MockAttempt) {
    const confirmed = window.confirm(
      `Delete "${mock.name}" from ${formatAttemptDate(mock.attemptDate)}?`,
    );

    if (!confirmed) {
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
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete mock.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function removeSmallTest(test: SmallTest) {
    const confirmed = window.confirm(
      `Delete ${test.source} test from ${formatAttemptDate(test.attemptDate)}?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingSmallTestId(test.id);
    setError("");

    try {
      await deleteSmallTest(test.id);

      if (editingSmallTestId === test.id) {
        resetSmallTestForm();
      }

      await loadSmallTests();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete small test.",
      );
    } finally {
      setDeletingSmallTestId(null);
    }
  }

  async function submitMock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = cloneMockInput(draft);
      if (editingId) {
        await updateMock(editingId, payload);
      } else {
        await createMock(payload);
      }
      resetForm();
      await loadMocks();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save mock.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitSmallTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSmallTest(true);
    setError("");

    try {
      const payload = cloneSmallTestInput({
        ...smallTestDraft,
        types: {
          ...createEmptySmallTestTypes(),
          ...smallTestDraft.types,
        },
      });

      if (editingSmallTestId) {
        await updateSmallTest(editingSmallTestId, payload);
      } else {
        await createSmallTest(payload);
      }

      resetSmallTestForm();
      await loadSmallTests();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save small test.",
      );
    } finally {
      setSavingSmallTest(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local CAT prep dashboard</p>
          <h1>CAT Mock Tracker</h1>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => void refreshCurrentPage()}
          disabled={activePage === "mocks" ? loading : smallTestsLoading}
        >
          <RefreshCw aria-hidden="true" size={18} />
          Refresh
        </button>
      </header>

      <nav className="page-tabs" aria-label="Tracker section">
        <button
          className={activePage === "mocks" ? "active" : ""}
          type="button"
          onClick={() => setActivePage("mocks")}
        >
          <BarChart3 aria-hidden="true" size={17} />
          Mocks
        </button>
        <button
          className={activePage === "small-tests" ? "active" : ""}
          type="button"
          onClick={() => setActivePage("small-tests")}
        >
          <ClipboardList aria-hidden="true" size={17} />
          Small tests
        </button>
      </nav>

      {error ? <div className="alert">{error}</div> : null}

      {activePage === "mocks" ? (
      <>
      <section className="layout-grid">
        <form
          className="panel form-panel"
          onSubmit={(event) => void submitMock(event)}
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{editingId ? "Edit mock" : "Add mock"}</p>
              <h2>{editingId ? "Update attempt" : "New attempt"}</h2>
            </div>
            {editingId ? (
              <button
                className="icon-button"
                type="button"
                onClick={resetForm}
                aria-label="Cancel edit"
                title="Cancel edit"
              >
                <X aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>

          <div className="field-grid">
            <label>
              Mock name
              <input
                value={draft.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="AIMCAT 2501"
                required
              />
            </label>
            <label>
              Attempt date
              <input
                type="date"
                value={draft.attemptDate}
                onChange={(event) =>
                  updateField("attemptDate", event.target.value)
                }
                required
              />
            </label>
            <label>
              Total marks
              <input
                type="number"
                min="-100"
                max="300"
                step="0.01"
                value={draft.totalMarks}
                onChange={(event) =>
                  updateField("totalMarks", Number(event.target.value))
                }
                required
              />
            </label>
            <label>
              Total percentile
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={draft.percentile}
                onChange={(event) =>
                  updateField("percentile", Number(event.target.value))
                }
                required
              />
            </label>
            <label className="checkbox-field">
              Analysed
              <span className="checkbox-control">
                <input
                  type="checkbox"
                  checked={draft.analysed}
                  onChange={(event) =>
                    updateField("analysed", event.target.checked)
                  }
                />
                <span>{draft.analysed ? "Yes" : "No"}</span>
              </span>
            </label>
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
                    <input
                      type="number"
                      min="-50"
                      max="150"
                      step="0.01"
                      value={draft.sections[section].marks}
                      onChange={(event) =>
                        updateSection(section, {
                          marks: Number(event.target.value),
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    Percentile
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={draft.sections[section].percentile}
                      onChange={(event) =>
                        updateSection(section, {
                          percentile: Number(event.target.value),
                        })
                      }
                      required
                    />
                  </label>
                </div>

                <div className="topic-group" aria-label={`${section} gaps`}>
                  <h4 className="color-grey">Gaps: </h4>
                  {GAP_TOPICS[section].map((topic) => (
                    <button
                      className={
                        draft.sections[section].gaps.includes(topic)
                          ? "topic-chip selected"
                          : "topic-chip"
                      }
                      type="button"
                      key={topic}
                      onClick={() => toggleGap(section, topic)}
                    >
                      {draft.sections[section].gaps.includes(topic) ? (
                        <Check aria-hidden="true" size={14} />
                      ) : null}
                      {topic}
                    </button>
                  ))}
                </div>

                <div className="learning-list">
                  {draft.sections[section].learnings.map((learning, index) => (
                    <div className="learning-row" key={`${section}-${index}`}>
                      <input
                        value={learning}
                        onChange={(event) =>
                          updateLearning(section, index, event.target.value)
                        }
                        placeholder={`${section} learning`}
                      />
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => removeLearning(section, index)}
                        aria-label="Remove learning"
                        title="Remove learning"
                      >
                        <X aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="ghost-button small"
                    type="button"
                    onClick={() => addLearning(section)}
                  >
                    <Plus aria-hidden="true" size={16} />
                    Learning
                  </button>
                </div>
              </section>
            ))}
          </div>

          <button className="primary-button" type="submit" disabled={saving}>
            <Save aria-hidden="true" size={18} />
            {saving ? "Saving..." : editingId ? "Save changes" : "Add mock"}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Attempted mocks</p>
              <h2>{mocks.length} saved</h2>
              <p className="analysis-progress">
                {analysedPercentage}% analysed
              </p>
            </div>
            <BarChart3 aria-hidden="true" size={22} />
          </div>

          {loading ? <p className="muted">Loading mocks...</p> : null}
          {!loading && mocks.length === 0 ? (
            <p className="muted">Add your first mock to unlock trends.</p>
          ) : null}

          <div className="mock-list">
            {mocks.map((mock) => {
              const isExpanded = expandedMockIds.has(mock.id);

              return (
                <article className="mock-item" key={mock.id}>
                  <div>
                    <h3>{mock.name}</h3>
                    <p className="mock-date">
                      {formatAttemptDate(mock.attemptDate)}
                    </p>
                    <p>
                      {mock.totalMarks} marks - {mock.percentile} percentile
                    </p>
                    <span
                      className={
                        mock.analysed
                          ? "analysis-status analysed"
                          : "analysis-status"
                      }
                    >
                      {mock.analysed ? "Analysed" : "Pending analysis"}
                    </span>
                    <div className="mini-sections">
                      {CAT_SECTIONS.map((section) => (
                        <span key={section}>
                          {section}: {mock.sections[section].marks} /{" "}
                          {mock.sections[section].percentile}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mock-actions">
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => toggleMockDetails(mock.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Hide" : "Show"} ${mock.name} details`}
                      title={isExpanded ? "Hide details" : "Show details"}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" size={18} />
                      ) : (
                        <ChevronRight aria-hidden="true" size={18} />
                      )}
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => editMock(mock)}
                      aria-label={`Edit ${mock.name}`}
                      title="Edit mock"
                    >
                      <Edit3 aria-hidden="true" size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      type="button"
                      onClick={() => void removeMock(mock)}
                      aria-label={`Delete ${mock.name}`}
                      title="Delete mock"
                      disabled={deletingId === mock.id}
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  </div>
                  {isExpanded ? (
                    <div className="mock-details">
                      {CAT_SECTIONS.map((section) => {
                        const details = mock.sections[section];

                        return (
                          <section
                            className="mock-detail-section"
                            key={section}
                          >
                            <div className="detail-section-heading">
                              <h4>{section}</h4>
                              <span>
                                {details.marks} marks - {details.percentile}{" "}
                                percentile
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
                                    <li key={`${section}-learning-${index}`}>
                                      {learning}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="detail-empty">
                                  No learnings added
                                </p>
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <section className="analytics-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Overall trend</p>
              <h2>Total score and percentile</h2>
            </div>
          </div>
          <ChartFrame empty={totalTrendData.length === 0}>
            <LineChart data={totalTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Marks"
                stroke="#2f80ed"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Percentile"
                stroke="#b45309"
                strokeWidth={2}
              />
            </LineChart>
          </ChartFrame>
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Section trend</p>
              <h2>Section-wise {metricMode}</h2>
            </div>
            <div className="segmented-control" aria-label="Section metric">
              <button
                className={metricMode === "percentile" ? "active" : ""}
                type="button"
                onClick={() => setMetricMode("percentile")}
              >
                Percentile
              </button>
              <button
                className={metricMode === "marks" ? "active" : ""}
                type="button"
                onClick={() => setMetricMode("marks")}
              >
                Marks
              </button>
            </div>
          </div>
          <ChartFrame empty={sectionTrendData.length === 0}>
            <LineChart data={sectionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {CAT_SECTIONS.map((section) => (
                <Line
                  key={section}
                  type="monotone"
                  dataKey={section}
                  stroke={sectionColors[section]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ChartFrame>
        </article>

        <article className="panel chart-panel wide-chart">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Gap areas</p>
              <h2>Most frequent weak topics</h2>
            </div>
          </div>
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
      </>
      ) : (
        <SmallTestsView
          draft={smallTestDraft}
          tests={smallTests}
          loading={smallTestsLoading}
          saving={savingSmallTest}
          editingId={editingSmallTestId}
          deletingId={deletingSmallTestId}
          unattempted={smallTestUnattempted}
          groupedAnalysis={smallTestsBySection}
          onSubmit={submitSmallTest}
          onReset={resetSmallTestForm}
          onEdit={editSmallTest}
          onDelete={removeSmallTest}
          onFieldChange={updateSmallTestField}
          onToggleSection={toggleSmallTestSection}
          onToggleType={toggleSmallTestType}
        />
      )}
    </main>
  );
}

type SmallSectionAnalysis = {
  section: SmallTestSection;
  tests: SmallTest[];
  trendData: Array<{ name: string; Accuracy: number; Score: number }>;
  topicStrength: Array<{ topic: string; accuracy: number; tests: number }>;
};

function SmallTestsView({
  draft,
  tests,
  loading,
  saving,
  editingId,
  deletingId,
  unattempted,
  groupedAnalysis,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
  onFieldChange,
  onToggleSection,
  onToggleType,
}: {
  draft: SmallTestInput;
  tests: SmallTest[];
  loading: boolean;
  saving: boolean;
  editingId: number | null;
  deletingId: number | null;
  unattempted: number;
  groupedAnalysis: SmallSectionAnalysis[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onEdit: (test: SmallTest) => void;
  onDelete: (test: SmallTest) => void;
  onFieldChange: <Key extends keyof SmallTestInput>(
    key: Key,
    value: SmallTestInput[Key],
  ) => void;
  onToggleSection: (section: SmallTestSection) => void;
  onToggleType: (section: SmallTestSection, type: string) => void;
}) {
  const analysedCount = tests.filter((test) => test.analysed).length;
  const analysedPercent =
    tests.length === 0 ? 0 : Math.round((analysedCount / tests.length) * 100);

  return (
    <>
      <section className="layout-grid small-test-layout">
        <form
          className="panel form-panel"
          onSubmit={(event) => onSubmit(event)}
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {editingId ? "Edit small test" : "Add small test"}
              </p>
              <h2>{editingId ? "Update test" : "New test"}</h2>
            </div>
            {editingId ? (
              <button
                className="icon-button"
                type="button"
                onClick={onReset}
                aria-label="Cancel edit"
                title="Cancel edit"
              >
                <X aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>

          <div className="field-grid small-test-fields">
            <label>
              Source
              <select
                value={draft.source}
                onChange={(event) =>
                  onFieldChange(
                    "source",
                    event.target.value as SmallTestInput["source"],
                  )
                }
              >
                {SMALL_TEST_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Attempt date
              <input
                type="date"
                value={draft.attemptDate}
                onChange={(event) =>
                  onFieldChange("attemptDate", event.target.value)
                }
                required
              />
            </label>
            <label>
              Score
              <input
                type="number"
                step="0.01"
                value={draft.score}
                onChange={(event) =>
                  onFieldChange("score", Number(event.target.value))
                }
                required
              />
            </label>
            <label>
              Total questions
              <input
                type="number"
                min="0"
                step="1"
                value={draft.totalQuestions}
                onChange={(event) =>
                  onFieldChange("totalQuestions", Number(event.target.value))
                }
                required
              />
            </label>
            <label>
              Correct
              <input
                type="number"
                min="0"
                step="1"
                value={draft.totalCorrect}
                onChange={(event) =>
                  onFieldChange("totalCorrect", Number(event.target.value))
                }
                required
              />
            </label>
            <label>
              Incorrect
              <input
                type="number"
                min="0"
                step="1"
                value={draft.totalIncorrect}
                onChange={(event) =>
                  onFieldChange("totalIncorrect", Number(event.target.value))
                }
                required
              />
            </label>
            <label>
              Unattempted
              <input type="number" value={unattempted} readOnly />
            </label>
            <label className="checkbox-field">
              Analysed
              <span className="checkbox-control">
                <input
                  type="checkbox"
                  checked={draft.analysed}
                  onChange={(event) =>
                    onFieldChange("analysed", event.target.checked)
                  }
                />
                <span>{draft.analysed ? "Yes" : "No"}</span>
              </span>
            </label>
          </div>

          <div className="section-box small-section-picker">
            <h3>Sections</h3>
            <div className="topic-group" aria-label="Small test sections">
              {SMALL_TEST_SECTIONS.map((section) => (
                <button
                  className={
                    draft.sections.includes(section)
                      ? "topic-chip selected"
                      : "topic-chip"
                  }
                  type="button"
                  key={section}
                  onClick={() => onToggleSection(section)}
                >
                  {draft.sections.includes(section) ? (
                    <Check aria-hidden="true" size={14} />
                  ) : null}
                  {section}
                </button>
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
                      <button
                        className={
                          draft.types[section].includes(type)
                            ? "topic-chip selected"
                            : "topic-chip"
                        }
                        type="button"
                        key={type}
                        onClick={() => onToggleType(section, type)}
                      >
                        {draft.types[section].includes(type) ? (
                          <Check aria-hidden="true" size={14} />
                        ) : null}
                        {type}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}

          <button className="primary-button" type="submit" disabled={saving}>
            <Save aria-hidden="true" size={18} />
            {saving ? "Saving..." : editingId ? "Save changes" : "Add test"}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Small tests</p>
              <h2>{tests.length} saved</h2>
              <p className="analysis-progress">
                {analysedPercent}% analysed
              </p>
            </div>
            <ClipboardList aria-hidden="true" size={22} />
          </div>

          {loading ? <p className="muted">Loading small tests...</p> : null}
          {!loading && tests.length === 0 ? (
            <p className="muted">Add a small test to unlock section analysis.</p>
          ) : null}

          <div className="mock-list">
            {tests.map((test) => (
              <article className="mock-item" key={test.id}>
                <div>
                  <h3>{test.source}</h3>
                  <p className="mock-date">
                    {formatAttemptDate(test.attemptDate)}
                  </p>
                  <p>
                    {test.score} score - {test.accuracy}% accuracy
                  </p>
                  <span
                    className={
                      test.analysed
                        ? "analysis-status analysed"
                        : "analysis-status"
                    }
                  >
                    {test.analysed ? "Analysed" : "Pending analysis"}
                  </span>
                  <div className="mini-sections">
                    {test.sections.map((section) => (
                      <span key={section}>{section}</span>
                    ))}
                    <span>{test.totalCorrect} correct</span>
                    <span>{test.totalIncorrect} incorrect</span>
                    <span>{test.unattempted} unattempted</span>
                  </div>
                </div>
                <div className="mock-actions">
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onEdit(test)}
                    aria-label={`Edit ${test.source} test`}
                    title="Edit test"
                  >
                    <Edit3 aria-hidden="true" size={17} />
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    onClick={() => onDelete(test)}
                    aria-label={`Delete ${test.source} test`}
                    title="Delete test"
                    disabled={deletingId === test.id}
                  >
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="section-analysis-grid">
        {groupedAnalysis.map(({ section, tests: sectionTests, trendData, topicStrength }) => (
          <article className="panel chart-panel section-analysis-card" key={section}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{section}</p>
                <h2>{sectionTests.length} tests</h2>
              </div>
            </div>

            <ChartFrame empty={trendData.length === 0}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Accuracy"
                  stroke={smallSectionColors[section]}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Score"
                  stroke="#475569"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartFrame>

            <div className="topic-strength-list">
              <h3>Topic strength</h3>
              {topicStrength.length ? (
                topicStrength.map((topic) => (
                  <div className="topic-strength-row" key={topic.topic}>
                    <span>{topic.topic}</span>
                    <strong>
                      {topic.accuracy}% · {topic.tests} tests
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
    </>
  );
}

function ChartFrame({
  children,
  empty,
}: {
  children: React.ReactElement;
  empty: boolean;
}) {
  if (empty) {
    return <div className="empty-chart">No data yet</div>;
  }

  return (
    <div className="chart-frame">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export default App;
