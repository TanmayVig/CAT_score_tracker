export const CAT_SECTIONS = ["VARC", "DILR", "QA"] as const;
export const SMALL_TEST_SECTIONS = ["VA", "RC", "LR", "DI", "Quants"] as const;
export const SMALL_TEST_SOURCES = ["Cracku", "Career Launcher", "Daily Target", "Daily Dose"] as const;

export type CatSection = (typeof CAT_SECTIONS)[number];
export type SmallTestSection = (typeof SMALL_TEST_SECTIONS)[number];
export type SmallTestSource = (typeof SMALL_TEST_SOURCES)[number];

export const GAP_TOPICS = {
  VARC: ["RC", "Para Jumble", "Para Summary", "Odd Sentence", "Sentence Placement"],
  DILR: ["Arrangement", "Games and Tournaments", "Venn Diagrams", "Tables", "Charts", "Caselets", "DI Calculation", "Set Selection"],
  QA: ["Average, Ratio and Proportion", "Functions", "Geometry", "Linear Equations", "Mensuration", "Number System", "Percentage", "Permutation and Combination", "Probability", "Profit and Loss", "Quadratic Equations + ", "Sequences and Series", "Sets and Venn Diagrams", "Time Speed and Distance", "Time and Work"]
} as const satisfies Record<CatSection, readonly string[]>;

export const SMALL_TEST_TYPES = {
  VA: ["Para Jumble", "Para Summary", "Odd Sentence", "Sentence Placement", "Grammar", "Vocabulary"],
  RC: ["Technology", "Psychology", "Philosophy", "Economy", "Science", "History", "Sociology", "Art and Culture"],
  LR: ["Arrangements", "Games and Tournaments", "Selection", "Distribution", "Routes and Networks", "Puzzles"],
  DI: ["Tables", "Bar Charts", "Line Graphs", "Pie Charts", "Caselets", "Calculation Intensive", "Mixed Graphs"],
  Quants: ["Arithmetic", "Algebra", "Geometry", "Number System", "Modern Math", "Mensuration", "TSD", "Time and Work"]
} as const satisfies Record<SmallTestSection, readonly string[]>;

export type GapTopic = {
  [Section in CatSection]: (typeof GAP_TOPICS)[Section][number];
}[CatSection];

export type SectionPerformance = {
  marks: number;
  percentile: number;
  gaps: string[];
  learnings: string[];
};

export type SectionMap = Record<CatSection, SectionPerformance>;

export type MockAttemptInput = {
  name: string;
  attemptDate: string;
  analysed: boolean;
  totalMarks: number;
  percentile: number;
  sections: SectionMap;
};

export type MockAttempt = MockAttemptInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type SmallTestTypeMap = Record<SmallTestSection, string[]>;

export type SmallTestInput = {
  sections: SmallTestSection[];
  source: SmallTestSource;
  score: number;
  totalQuestions: number;
  totalCorrect: number;
  totalIncorrect: number;
  types: SmallTestTypeMap;
  attemptDate: string;
  analysed: boolean;
};

export type SmallTest = SmallTestInput & {
  id: number;
  unattempted: number;
  accuracy: number;
  createdAt: string;
  updatedAt: string;
};

export const createEmptySections = (): SectionMap => ({
  VARC: { marks: 0, percentile: 0, gaps: [], learnings: [""] },
  DILR: { marks: 0, percentile: 0, gaps: [], learnings: [""] },
  QA: { marks: 0, percentile: 0, gaps: [], learnings: [""] }
});

export const createEmptySmallTestTypes = (): SmallTestTypeMap => ({
  VA: [],
  RC: [],
  LR: [],
  DI: [],
  Quants: []
});

export const getTodayDateInputValue = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const createEmptyMock = (): MockAttemptInput => ({
  name: "",
  attemptDate: getTodayDateInputValue(),
  analysed: false,
  totalMarks: 0,
  percentile: 0,
  sections: createEmptySections()
});

export const createEmptySmallTest = (): SmallTestInput => ({
  sections: [],
  source: "Cracku",
  score: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  types: createEmptySmallTestTypes(),
  attemptDate: getTodayDateInputValue(),
  analysed: false
});
