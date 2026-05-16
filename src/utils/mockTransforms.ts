import type { MockAttempt, MockAttemptInput, SmallTest, SmallTestInput } from "../shared/cat";

export function cloneMockInput(mock: MockAttemptInput): MockAttemptInput {
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

export function toMockInput(mock: MockAttempt): MockAttemptInput {
  return cloneMockInput(mock);
}

export function cloneSmallTestInput(test: SmallTestInput): SmallTestInput {
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

export function toSmallTestInput(test: SmallTest): SmallTestInput {
  return cloneSmallTestInput(test);
}
