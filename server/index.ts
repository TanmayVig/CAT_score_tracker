import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { CAT_SECTIONS, GAP_TOPICS, type CatSection, type MockAttempt, type MockAttemptInput, type SectionMap } from "../src/shared/cat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "data");
const dbPath = path.join(dataDir, "cat-tracker.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS mocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total_marks REAL NOT NULL,
    percentile REAL NOT NULL,
    sections TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

type MockRow = {
  id: number;
  name: string;
  total_marks: number;
  percentile: number;
  sections: string;
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
    totalMarks: row.total_marks,
    percentile: row.percentile,
    sections: JSON.parse(row.sections) as SectionMap,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateMockPayload(payload: unknown): { value?: MockAttemptInput; error?: string } {
  const body = payload as MockAttemptInput;

  if (!body || typeof body !== "object") {
    return { error: "Mock payload is required." };
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return { error: "Mock name is required." };
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
      totalMarks: body.totalMarks,
      percentile: body.percentile,
      sections
    }
  };
}

function getMockById(id: number): MockAttempt | null {
  const row = db.prepare("SELECT * FROM mocks WHERE id = ?").get(id) as MockRow | undefined;
  return row ? rowToMock(row) : null;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, database: dbPath });
});

app.get("/api/mocks", (_request, response) => {
  const rows = db.prepare("SELECT * FROM mocks ORDER BY datetime(created_at) DESC, id DESC").all() as MockRow[];
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
    INSERT INTO mocks (name, total_marks, percentile, sections)
    VALUES (?, ?, ?, ?)
  `);
  const info = insert.run(result.value.name, result.value.totalMarks, result.value.percentile, JSON.stringify(result.value.sections));
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
    SET name = ?, total_marks = ?, percentile = ?, sections = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(result.value.name, result.value.totalMarks, result.value.percentile, JSON.stringify(result.value.sections), id);

  response.json(getMockById(id));
});

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`CAT Tracker API running at http://127.0.0.1:${port}`);
});
