import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  CAT_SECTIONS,
  GAP_TOPICS,
  SMALL_TEST_SECTIONS,
  SMALL_TEST_SOURCES,
  SMALL_TEST_TYPES,
  type CatSection,
  type MockAttempt,
  type MockAttemptInput,
  type SectionMap,
  type SmallTest,
  type SmallTestInput,
  type SmallTestSection,
  type SmallTestTypeMap
} from "../src/shared/cat.js";

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, "data");
const dbPath = path.join(dataDir, "cat-tracker.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS mocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    attempt_date TEXT NOT NULL DEFAULT (date('now')),
    analysed INTEGER NOT NULL DEFAULT 0,
    total_marks REAL NOT NULL,
    percentile REAL NOT NULL,
    sections TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS small_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sections TEXT NOT NULL,
    source TEXT NOT NULL,
    score REAL NOT NULL,
    total_questions INTEGER NOT NULL,
    total_correct INTEGER NOT NULL,
    total_incorrect INTEGER NOT NULL,
    types TEXT NOT NULL,
    attempt_date TEXT NOT NULL DEFAULT (date('now')),
    analysed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const mockColumns = db.prepare("PRAGMA table_info(mocks)").all() as Array<{ name: string }>;
if (!mockColumns.some((column) => column.name === "attempt_date")) {
  db.exec("ALTER TABLE mocks ADD COLUMN attempt_date TEXT NOT NULL DEFAULT '2026-05-05'");
  db.exec("UPDATE mocks SET attempt_date = substr(created_at, 1, 10) WHERE created_at IS NOT NULL");
}
if (!mockColumns.some((column) => column.name === "analysed")) {
  db.exec("ALTER TABLE mocks ADD COLUMN analysed INTEGER NOT NULL DEFAULT 0");
}

type MockRow = {
  id: number;
  name: string;
  attempt_date: string;
  analysed: number;
  total_marks: number;
  percentile: number;
  sections: string;
  created_at: string;
  updated_at: string;
};

type SmallTestRow = {
  id: number;
  sections: string;
  source: string;
  score: number;
  total_questions: number;
  total_correct: number;
  total_incorrect: number;
  types: string;
  attempt_date: string;
  analysed: number;
  created_at: string;
  updated_at: string;
};

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function rowToMock(row: MockRow): MockAttempt {
  return {
    id: row.id,
    name: row.name,
    attemptDate: row.attempt_date,
    analysed: row.analysed === 1,
    totalMarks: row.total_marks,
    percentile: row.percentile,
    sections: JSON.parse(row.sections) as SectionMap,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToSmallTest(row: SmallTestRow): SmallTest {
  const totalAttempted = row.total_correct + row.total_incorrect;

  return {
    id: row.id,
    sections: JSON.parse(row.sections) as SmallTestSection[],
    source: row.source as SmallTestInput["source"],
    score: row.score,
    totalQuestions: row.total_questions,
    totalCorrect: row.total_correct,
    totalIncorrect: row.total_incorrect,
    unattempted: row.total_questions - totalAttempted,
    accuracy: totalAttempted === 0 ? 0 : Math.round((row.total_correct / totalAttempted) * 100),
    types: JSON.parse(row.types) as SmallTestTypeMap,
    attemptDate: row.attempt_date,
    analysed: row.analysed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function isValidDateInput(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateMockPayload(payload: unknown): { value?: MockAttemptInput; error?: string } {
  const body = payload as MockAttemptInput;

  if (!body || typeof body !== "object") {
    return { error: "Mock payload is required." };
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return { error: "Mock name is required." };
  }

  if (!isValidDateInput(body.attemptDate)) {
    return { error: "Attempt date must be a valid date." };
  }

  if (typeof body.analysed !== "boolean") {
    return { error: "Analysed must be true or false." };
  }

  if (!isFiniteNumber(body.totalMarks) || body.totalMarks < -100 || body.totalMarks > 300) {
    return { error: "Total marks must be a number between -100 and 300." };
  }

  if (!isFiniteNumber(body.percentile) || body.percentile < 0 || body.percentile > 100) {
    return { error: "Total percentile must be between 0 and 100." };
  }

  if (!body.sections || typeof body.sections !== "object") {
    return { error: "Section data is required." };
  }

  const sections = {} as SectionMap;

  for (const section of CAT_SECTIONS) {
    const source = body.sections[section];

    if (!source || typeof source !== "object") {
      return { error: `${section} data is required.` };
    }

    if (!isFiniteNumber(source.marks) || source.marks < -50 || source.marks > 150) {
      return { error: `${section} marks must be a number between -50 and 150.` };
    }

    if (!isFiniteNumber(source.percentile) || source.percentile < 0 || source.percentile > 100) {
      return { error: `${section} percentile must be between 0 and 100.` };
    }

    if (!Array.isArray(source.gaps)) {
      return { error: `${section} gaps must be a list.` };
    }

    const allowedTopics = new Set<string>(GAP_TOPICS[section]);
    const gaps = source.gaps.filter((gap): gap is string => typeof gap === "string");
    const invalidGap = gaps.find((gap) => !allowedTopics.has(gap));

    if (invalidGap) {
      return { error: `${invalidGap} is not a valid ${section} gap topic.` };
    }

    if (!Array.isArray(source.learnings)) {
      return { error: `${section} learnings must be a list.` };
    }

    sections[section] = {
      marks: source.marks,
      percentile: source.percentile,
      gaps,
      learnings: source.learnings.filter((learning): learning is string => typeof learning === "string").map((learning) => learning.trim()).filter(Boolean)
    };
  }

  return {
    value: {
      name: body.name.trim(),
      attemptDate: body.attemptDate,
      analysed: body.analysed,
      totalMarks: body.totalMarks,
      percentile: body.percentile,
      sections
    }
  };
}

function validateSmallTestPayload(payload: unknown): { value?: SmallTestInput; error?: string } {
  const body = payload as SmallTestInput;

  if (!body || typeof body !== "object") {
    return { error: "Small test payload is required." };
  }

  if (!Array.isArray(body.sections) || body.sections.length === 0) {
    return { error: "Select at least one section." };
  }

  const allowedSections = new Set<string>(SMALL_TEST_SECTIONS);
  const sections = [...new Set(body.sections.filter((section): section is SmallTestSection => typeof section === "string" && allowedSections.has(section)))];

  if (sections.length !== body.sections.length) {
    return { error: "One or more selected sections are invalid." };
  }

  if (typeof body.source !== "string" || !SMALL_TEST_SOURCES.includes(body.source)) {
    return { error: "Source is invalid." };
  }

  if (!isFiniteNumber(body.score)) {
    return { error: "Score must be a valid number." };
  }

  if (!isNonNegativeInteger(body.totalQuestions)) {
    return { error: "Total questions must be a whole number greater than or equal to 0." };
  }

  if (!isNonNegativeInteger(body.totalCorrect)) {
    return { error: "Total correct must be a whole number greater than or equal to 0." };
  }

  if (!isNonNegativeInteger(body.totalIncorrect)) {
    return { error: "Total incorrect must be a whole number greater than or equal to 0." };
  }

  if (body.totalCorrect + body.totalIncorrect > body.totalQuestions) {
    return { error: "Correct plus incorrect cannot exceed total questions." };
  }

  if (!isValidDateInput(body.attemptDate)) {
    return { error: "Attempt date must be a valid date." };
  }

  if (typeof body.analysed !== "boolean") {
    return { error: "Analysed must be true or false." };
  }

  if (!body.types || typeof body.types !== "object") {
    return { error: "Type data is required." };
  }

  const types = {} as SmallTestTypeMap;

  for (const section of SMALL_TEST_SECTIONS) {
    const sourceTypes = Array.isArray(body.types[section]) ? body.types[section] : [];
    const allowedTypes = new Set<string>(SMALL_TEST_TYPES[section]);

    types[section] = sourceTypes
      .filter((type): type is string => typeof type === "string")
      .filter((type) => allowedTypes.has(type) && sections.includes(section));
  }

  return {
    value: {
      sections,
      source: body.source,
      score: body.score,
      totalQuestions: body.totalQuestions,
      totalCorrect: body.totalCorrect,
      totalIncorrect: body.totalIncorrect,
      types,
      attemptDate: body.attemptDate,
      analysed: body.analysed
    }
  };
}

function getMockById(id: number): MockAttempt | null {
  const row = db.prepare("SELECT * FROM mocks WHERE id = ?").get(id) as MockRow | undefined;
  return row ? rowToMock(row) : null;
}

function getSmallTestById(id: number): SmallTest | null {
  const row = db.prepare("SELECT * FROM small_tests WHERE id = ?").get(id) as SmallTestRow | undefined;
  return row ? rowToSmallTest(row) : null;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, database: dbPath });
});

app.get("/api/mocks", (_request, response) => {
  const rows = db.prepare("SELECT * FROM mocks ORDER BY date(attempt_date) DESC, datetime(created_at) DESC, id DESC").all() as MockRow[];
  response.json(rows.map(rowToMock));
});

app.get("/api/mocks/:id", (request, response) => {
  const id = Number(request.params.id);
  const mock = Number.isInteger(id) ? getMockById(id) : null;

  if (!mock) {
    response.status(404).json({ error: "Mock not found." });
    return;
  }

  response.json(mock);
});

app.post("/api/mocks", (request, response) => {
  const result = validateMockPayload(request.body);

  if (!result.value) {
    response.status(400).json({ error: result.error });
    return;
  }

  const insert = db.prepare(`
    INSERT INTO mocks (name, attempt_date, analysed, total_marks, percentile, sections)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(result.value.name, result.value.attemptDate, result.value.analysed ? 1 : 0, result.value.totalMarks, result.value.percentile, JSON.stringify(result.value.sections));
  const mock = getMockById(Number(info.lastInsertRowid));

  response.status(201).json(mock);
});

app.put("/api/mocks/:id", (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || !getMockById(id)) {
    response.status(404).json({ error: "Mock not found." });
    return;
  }

  const result = validateMockPayload(request.body);

  if (!result.value) {
    response.status(400).json({ error: result.error });
    return;
  }

  db.prepare(`
    UPDATE mocks
    SET name = ?, attempt_date = ?, analysed = ?, total_marks = ?, percentile = ?, sections = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(result.value.name, result.value.attemptDate, result.value.analysed ? 1 : 0, result.value.totalMarks, result.value.percentile, JSON.stringify(result.value.sections), id);

  response.json(getMockById(id));
});

app.delete("/api/mocks/:id", (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id)) {
    response.status(404).json({ error: "Mock not found." });
    return;
  }

  const info = db.prepare("DELETE FROM mocks WHERE id = ?").run(id);

  if (info.changes === 0) {
    response.status(404).json({ error: "Mock not found." });
    return;
  }

  response.status(204).send();
});

app.get("/api/small-tests", (_request, response) => {
  const rows = db.prepare("SELECT * FROM small_tests ORDER BY date(attempt_date) DESC, datetime(created_at) DESC, id DESC").all() as SmallTestRow[];
  response.json(rows.map(rowToSmallTest));
});

app.get("/api/small-tests/:id", (request, response) => {
  const id = Number(request.params.id);
  const smallTest = Number.isInteger(id) ? getSmallTestById(id) : null;

  if (!smallTest) {
    response.status(404).json({ error: "Small test not found." });
    return;
  }

  response.json(smallTest);
});

app.post("/api/small-tests", (request, response) => {
  const result = validateSmallTestPayload(request.body);

  if (!result.value) {
    response.status(400).json({ error: result.error });
    return;
  }

  const insert = db.prepare(`
    INSERT INTO small_tests (sections, source, score, total_questions, total_correct, total_incorrect, types, attempt_date, analysed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = insert.run(
    JSON.stringify(result.value.sections),
    result.value.source,
    result.value.score,
    result.value.totalQuestions,
    result.value.totalCorrect,
    result.value.totalIncorrect,
    JSON.stringify(result.value.types),
    result.value.attemptDate,
    result.value.analysed ? 1 : 0
  );

  response.status(201).json(getSmallTestById(Number(info.lastInsertRowid)));
});

app.put("/api/small-tests/:id", (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || !getSmallTestById(id)) {
    response.status(404).json({ error: "Small test not found." });
    return;
  }

  const result = validateSmallTestPayload(request.body);

  if (!result.value) {
    response.status(400).json({ error: result.error });
    return;
  }

  db.prepare(`
    UPDATE small_tests
    SET sections = ?, source = ?, score = ?, total_questions = ?, total_correct = ?, total_incorrect = ?, types = ?, attempt_date = ?, analysed = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    JSON.stringify(result.value.sections),
    result.value.source,
    result.value.score,
    result.value.totalQuestions,
    result.value.totalCorrect,
    result.value.totalIncorrect,
    JSON.stringify(result.value.types),
    result.value.attemptDate,
    result.value.analysed ? 1 : 0,
    id
  );

  response.json(getSmallTestById(id));
});

app.delete("/api/small-tests/:id", (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id)) {
    response.status(404).json({ error: "Small test not found." });
    return;
  }

  const info = db.prepare("DELETE FROM small_tests WHERE id = ?").run(id);

  if (info.changes === 0) {
    response.status(404).json({ error: "Small test not found." });
    return;
  }

  response.status(204).send();
});

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`CAT Tracker API running at http://127.0.0.1:${port}`);
});
