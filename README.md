# CAT Mock Tracker

A local-first CAT mock analysis app built with React, TypeScript, Express, and SQLite.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The API runs at `http://127.0.0.1:4000`, and the SQLite database is stored at `data/cat-tracker.sqlite`.

## Hermes chat

The Chat tab sends your question plus local tracker context to a locally running Hermes model through the backend.

Default Ollama-compatible settings:

```bash
HERMES_API_URL=http://127.0.0.1:11434/api/chat
HERMES_MODEL=llama3.2:3b
HERMES_API_STYLE=ollama
```

For an OpenAI-compatible local server, set `HERMES_API_STYLE=openai` and point `HERMES_API_URL` to its `/v1/chat/completions` endpoint.
