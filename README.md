# Labs Analyzer — Qwen AI Hackathon

AI-powered lab report analyzer supporting EN / FR / AR / VI

## Architecture

```
Frontend (Next.js 14)
    ↓ POST /api/upload
API Gateway (Fastify)
    ↓ BullMQ job
Pipeline Orchestrator
    ├── Agent 1: Extractor    (qwen-long)
    ├── Agent 2: Normalizer   (qwen-plus + Medical KB)
    ├── Agent 3: Analyzer CoT (qwen-plus)
    ├── Agent 4: Explainer    (qwen-plus × 4 languages)
    └── Agent 5: QA Check     (qwen-plus)
    ↓
Redis (job state) + PostgreSQL (audit log)
```

## Quick Start (Local)

### Prerequisites
- Node 20
- pnpm
- Docker + Docker Compose
- Qwen API key from [DashScope](https://dashscope.aliyuncs.com)

### 1. Clone & install

```bash
git clone <your-repo>
cd labs-analyzer

# Install backend deps
cd backend && pnpm install && cd ..

# Install frontend deps
cd frontend && pnpm install && cd ..
```

### 2. Setup environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in: QWEN_API_KEY, REDIS_URL, DATABASE_URL

# Frontend
cp frontend/.env.local.example frontend/.env.local
# Set: NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start infrastructure

```bash
# Start Redis + PostgreSQL via Docker
docker-compose up redis postgres -d
```

### 4. Start backend (2 terminals)

```bash
# Terminal 1: API server
cd backend && pnpm dev

# Terminal 2: Worker
cd backend && pnpm worker
```

### 5. Start frontend

```bash
cd frontend && pnpm dev
```

Open http://localhost:3000

## Deploy

### Backend → Railway
```bash
# Set env vars in Railway dashboard
# Deploy from Dockerfile
railway up
```

### Frontend → Vercel
```bash
cd frontend
vercel --prod
# Set NEXT_PUBLIC_API_URL to your Railway URL
```

## Team Structure

| Role | Responsibilities |
|------|-----------------|
| Leader | Architecture, JSON contract, demo prep |
| Member 1 | AI agents, prompt engineering, Langfuse |
| Member 2 | Fastify API, BullMQ, PostgreSQL, Docker |
| Member 3 | Next.js UI, i18n, RTL, Vercel deploy |
| Member 4 | QA testing, PDF samples, accuracy tracking |

## Evaluation Criteria

| Criterion | Weight | Our approach |
|-----------|--------|--------------|
| Clinical correctness | 40% | Medical KB + CoT reasoning |
| Severity accuracy | 20% | Programmatic validation + Agent 5 QA |
| Completeness | 20% | Agent 1 extracts ALL tests |
| Actionability | 10% | Specific next_steps per test |
| UX clarity | 10% | Color-coded cards, severity sort |

## Key Files

```
shared/types.ts          ← JSON contract (single source of truth)
backend/src/
  lib/qwen.ts            ← Qwen API wrapper
  lib/medicalKb.ts       ← WHO/ADA reference ranges
  agents/
    agent1-extractor.ts  ← PDF → raw JSON
    agent2-normalizer.ts ← unit conversion + KB lookup
    agent3-analyzer.ts   ← CoT clinical analysis
    agent4-explainer.ts  ← patient-friendly + i18n
    agent5-qa.ts         ← self-critique + correction
  pipeline.ts            ← orchestrates 5 agents
  worker.ts              ← BullMQ consumer
  index.ts               ← Fastify API server

frontend/src/
  hooks/useLabAnalyzer.ts ← upload + polling hook
  components/
    UploadZone.tsx        ← drag & drop UI
    ProgressTracker.tsx   ← step-by-step progress
    TestCard.tsx          ← per-test result card
    ResultsPanel.tsx      ← full results display
  pages/index.tsx         ← main page
  lib/utils.ts            ← colors, formatting
  public/locales/         ← EN / FR / AR / VI strings
```
