# 🧬 Labs Analyzer

An advanced, AI-powered web application that analyzes raw lab test reports (PDFs) and translates complex medical jargon into easy-to-understand, multi-language explanations for patients. Built with a highly resilient 5-stage **Multi-Agent Architecture** to ensuring high clinical accuracy and safety.

## ✨ Key Features

- 🏥 **Clinical-level Analysis** — Chain-of-Thought (CoT) reasoning, not just simple math comparisons
- 🤗 **Patient-Friendly & Multilingual** — English, French, Arabic, Vietnamese
- 🛡️ **Safety First (QA Agent)** — LLM self-checker rewrites any diagnostic language before it reaches the user
- ⚡ **Async Background Processing** — Redis + BullMQ job queue
- 🚀 **Modern UI** — Next.js + Framer Motion animations
- 🗄️ **Auto-Migration** — Database schema applied automatically on first startup, no manual steps needed

---

## 🏗️ Project Structure

This is a `pnpm` monorepo:

```text
labs-analyzer/
├── backend/                  # Fastify API server + BullMQ Worker
│   ├── src/
│   │   ├── agents/           # 5 AI agents (extraction → QA)
│   │   ├── lib/              # db.ts (pool + auto-migrate), utils
│   │   ├── index.ts          # Fastify API server
│   │   ├── worker.ts         # BullMQ background worker
│   │   └── pipeline.ts       # 5-stage pipeline orchestrator
│   ├── docker-compose.yml    # Backend-only Docker stack
│   ├── schema.sql            # DB schema (idempotent, IF NOT EXISTS)
│   └── Dockerfile
├── frontend/                 # Next.js web app
│   ├── src/
│   │   ├── pages/            # index.tsx (main app)
│   │   └── components/       # UploadZone, ProgressTracker, TestCard, ResultsPanel
│   └── Dockerfile
├── shared/                   # Shared TypeScript types (full-stack type safety)
├── package.json              # Root scripts
└── pnpm-workspace.yaml
```

### 🧠 The 5-Agent Pipeline

```
PDF Upload → [Agent 1] Extract → [Agent 2] Normalize → [Agent 3+4] Analyze & Explain → [Agent 5] QA Check → Result
```

| # | Agent | Role |
|---|-------|------|
| 1 | **Extractor** | Parses raw text/numbers from PDF |
| 2 | **Normalizer** | Standardizes test names (WHO) + converts units to SI |
| 3+4 | **Analyzer + Explainer** | CoT clinical analysis → patient-friendly language |
| 5 | **QA Self-Check** | Reviews output, scores quality, rewrites unsafe phrases |

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/) (for the backend stack)
- [Node.js 20+](https://nodejs.org/) + `pnpm` (for local frontend dev)

```bash
npm install -g pnpm
```

> [!IMPORTANT]
> Do **NOT** run `docker-compose up` directly from the project root — it won't work.
> Always use the `pnpm` scripts below which point to the correct compose file at `backend/docker-compose.yml`.

---

### ⚙️ Environment Setup

Copy and fill in your API keys:

```bash
cp backend/.env.example backend/.env
```

Key variables in `backend/.env`:

```env
QWEN_API_KEY=your-key-here          # or OpenAI-compatible key
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/labs_analyzer
PORT=3001
```

---

### 🐳 Step 1 — Start the Backend (Docker)

Starts **Postgres + Redis + API + Worker** and **auto-migrates the DB** on first run:

```bash
pnpm docker:be
```

> ✅ No manual migration needed — `schema.sql` is applied automatically (idempotent, safe to re-run).

Other backend commands:

```bash
pnpm docker:be:down    # Stop all backend containers
pnpm docker:be:logs    # Stream logs from api + worker
```

---

### 💻 Step 2 — Start the Full Stack (Dev Mode)

With Docker backend running, start the frontend + hot-reload in watch mode:

```bash
pnpm dev
```

This runs 3 processes in parallel:
- `[0]` **Frontend** → `http://localhost:3000` (Next.js dev server)
- `[1]` **API** → `http://localhost:3001` (`tsx watch`)
- `[2]` **Worker** → Background job processor (`tsx watch`)

---

### 🏁 One-liner (after first setup)

```bash
pnpm docker:be && pnpm dev
```

---

## 📋 All Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start full stack in dev/watch mode |
| `pnpm build` | Build backend + frontend for production |
| `pnpm docker:be` | Start Docker backend (postgres + redis + api + worker) |
| `pnpm docker:be:down` | Stop Docker backend containers |
| `pnpm docker:be:logs` | Stream Docker backend logs |



## 🛠️ Built With

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React, TailwindCSS, Framer Motion |
| Backend | Node.js, Fastify, TypeScript |
| Queue | Redis, BullMQ |
| Database | PostgreSQL (pg) |
| AI Models | Qwen3 / OpenAI-compatible |
| Monorepo | pnpm workspaces |

---

## 📜 Disclaimer

*This project is for informational purposes only and does **NOT** constitute medical advice. Always consult a qualified healthcare professional for diagnosis or treatment.*
