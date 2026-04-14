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
│   └── src/
│       ├── pages/            # index.tsx (main app)
│       └── components/       # UploadZone, ProgressTracker, TestCard, ResultsPanel
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

- [Docker Desktop](https://www.docker.com/)
- [Node.js 20+](https://nodejs.org/) + `pnpm`

```bash
npm install -g pnpm
pnpm install
```

### ⚙️ Environment Setup

```bash
cp backend/.env.example backend/.env
# Điền QWEN_API_KEY vào backend/.env
```

---

## 🐳 Recommended Workflow (Docker BE + Local FE)

> [!IMPORTANT]
> `pnpm docker:be` chạy toàn bộ Backend trong Docker **(postgres + redis + api + worker)**.
> `pnpm dev` chỉ chạy Frontend. **Không chạy cả hai cùng lúc** để tránh xung đột port.

### Bước 1 — Start Backend (Docker)

```bash
pnpm docker:be
```

✅ Tự động: build image, migrate DB, khởi động api (`:3001`) + worker.

```bash
pnpm docker:be:down    # Dừng
pnpm docker:be:logs    # Xem logs
```

### Bước 2 — Start Frontend

```bash
pnpm dev
# → http://localhost:3000
```

### One-liner

```bash
pnpm docker:be && pnpm dev
```

---

## 💻 Alternative: Run Everything Locally (No Docker)

Nếu đã có PostgreSQL và Redis trên máy:

```bash
pnpm dev:local
```

Chạy song song:
- `[0]` Frontend → `http://localhost:3000`
- `[1]` API → `http://localhost:3001`
- `[2]` Worker → Background processor

---

## 📋 All Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start **FE only** (dùng khi BE chạy qua Docker) |
| `pnpm dev:local` | Start FE + BE + Worker locally (không cần Docker) |
| `pnpm build` | Build backend + frontend for production |
| `pnpm docker:be` | Start Docker backend (postgres + redis + api + worker) |
| `pnpm docker:be:down` | Stop Docker backend |
| `pnpm docker:be:logs` | Stream Docker backend logs |

---

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
