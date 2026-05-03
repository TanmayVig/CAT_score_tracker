export const CAT_SECTIONS = ["VARC", "DILR", "QA"] as const;

export type CatSection = (typeof CAT_SECTIONS)[number];

export const GAP_TOPICS = {
  VARC: ["RC", "Para Jumble", "Para Summary", "Odd Sentence", "Sentence Placement"],
  DILR: ["Arrangement", "Games and Tournaments", "Venn Diagrams", "Tables", "Charts", "Caselets", "DI Calculation"],
  QA: ["Average, Ratio and Proportion", "Functions", "Geometry", "Linear Equations", "Mensuration", "Number System", "Percentage", "Permutation and Combination", "Probability", "Profit and Loss", "Quadratic Equations + ", "Sequences and Series", "Sets and Venn Diagrams", "Time Speed and Distance", "Time and Work"]
} as const satisfies Record<CatSection, readonly string[]>;

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
  totalMarks: number;
  percentile: number;
  sections: SectionMap;
};

export type MockAttempt = MockAttemptInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export const createEmptySections = (): SectionMap => ({
  VARC: { marks: 0, percentile: 0, gaps: [], learnings: [""] },
  DILR: { marks: 0, percentile: 0, gaps: [], learnings: [""] },
  QA: { marks: 0, percentile: 0, gaps: [], learnings: [""] }
});

export const createEmptyMock = (): MockAttemptInput => ({
  name: "",
  totalMarks: 0,
  percentile: 0,
  sections: createEmptySections()
});
