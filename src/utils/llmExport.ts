import { CAT_SECTIONS, SMALL_TEST_SECTIONS, type MockAttempt, type SmallTest } from "../shared/cat";
import { formatAttemptDate } from "./format";

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function jsonBlock(data: unknown) {
  return ["```json", JSON.stringify(data, null, 2), "```"].join("\n");
}

export function exportMocksForLLM(mocks: MockAttempt[]) {
  const sortedMocks = [...mocks].sort(
    (first, second) =>
      new Date(first.attemptDate).getTime() - new Date(second.attemptDate).getTime() ||
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
  const analysedCount = sortedMocks.filter((mock) => mock.analysed).length;
  const gapCounts = new Map<string, number>();

  sortedMocks.forEach((mock) => {
    CAT_SECTIONS.forEach((section) => {
      mock.sections[section].gaps.forEach((gap) => {
        gapCounts.set(`${section}: ${gap}`, (gapCounts.get(`${section}: ${gap}`) ?? 0) + 1);
      });
    });
  });

  const content = [
    "# CAT Full Mock Data Export",
    "",
    "Use this file to analyse mock performance, identify patterns, and create a strategic CAT preparation plan.",
    "",
    "## Analysis Request",
    "",
    "Please analyse the full mock history below. Focus on score and percentile trends, section-wise strengths and weaknesses, repeated gap areas, learning themes, and a practical next-step study plan.",
    "",
    "## Summary",
    "",
    `- Total mocks: ${sortedMocks.length}`,
    `- Analysed mocks: ${analysedCount}`,
    `- Pending analysis: ${sortedMocks.length - analysedCount}`,
    "",
    "## Prominent Gap Areas",
    "",
    ...[...gapCounts.entries()]
      .sort((first, second) => second[1] - first[1])
      .map(([gap, count]) => `- ${gap}: ${count}`),
    "",
    "## Mock Timeline",
    "",
    ...sortedMocks.flatMap((mock) => [
      `### ${formatAttemptDate(mock.attemptDate)} - ${mock.name}`,
      "",
      `- Total marks: ${mock.totalMarks}`,
      `- Percentile: ${mock.percentile}`,
      `- Analysed: ${mock.analysed ? "Yes" : "No"}`,
      "",
      ...CAT_SECTIONS.flatMap((section) => [
        `#### ${section}`,
        `- Marks: ${mock.sections[section].marks}`,
        `- Percentile: ${mock.sections[section].percentile}`,
        `- Gaps: ${mock.sections[section].gaps.length ? mock.sections[section].gaps.join(", ") : "None recorded"}`,
        `- Learnings: ${mock.sections[section].learnings.length ? mock.sections[section].learnings.join(" | ") : "None recorded"}`,
        "",
      ]),
    ]),
    "## Raw Structured Data",
    "",
    jsonBlock(sortedMocks),
    "",
  ].join("\n");

  downloadMarkdown(`cat-full-mocks-llm-export-${exportDateStamp()}.md`, content);
}

export function exportSmallTestsForLLM(tests: SmallTest[]) {
  const sortedTests = [...tests].sort(
    (first, second) =>
      new Date(first.attemptDate).getTime() - new Date(second.attemptDate).getTime() ||
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
  const analysedCount = sortedTests.filter((test) => test.analysed).length;

  const content = [
    "# CAT Small Test Data Export",
    "",
    "Use this file to analyse practice tests, sectional drills, daily doses, and topic-level strengths for CAT preparation.",
    "",
    "## Analysis Request",
    "",
    "Please analyse the small-test history below. Separate insights by section, identify topic-wise strengths and weaknesses, evaluate accuracy trends, and suggest a short-term practice strategy.",
    "",
    "## Summary",
    "",
    `- Total small tests: ${sortedTests.length}`,
    `- Analysed tests: ${analysedCount}`,
    `- Pending analysis: ${sortedTests.length - analysedCount}`,
    "",
    "## Section-Wise Timeline",
    "",
    ...SMALL_TEST_SECTIONS.flatMap((section) => {
      const sectionTests = sortedTests.filter((test) => test.sections.includes(section));

      return [
        `### ${section}`,
        "",
        sectionTests.length
          ? sectionTests
              .map(
                (test) =>
                  `- ${formatAttemptDate(test.attemptDate)} | ${test.source} | Score: ${test.score} | Accuracy: ${test.accuracy}% | Correct: ${test.totalCorrect} | Incorrect: ${test.totalIncorrect} | Unattempted: ${test.unattempted} | Types: ${
                    test.types[section].length ? test.types[section].join(", ") : "None tagged"
                  } | Analysed: ${test.analysed ? "Yes" : "No"}`,
              )
              .join("\n")
          : "- No tests recorded",
        "",
      ];
    }),
    "## Raw Structured Data",
    "",
    jsonBlock(sortedTests),
    "",
  ].join("\n");

  downloadMarkdown(`cat-small-tests-llm-export-${exportDateStamp()}.md`, content);
}
