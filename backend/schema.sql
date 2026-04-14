-- ============================================================
-- Database Schema — Labs Analyzer
-- PostgreSQL (Neon serverless compatible)
-- Run: psql $DATABASE_URL -f schema.sql
-- ============================================================

-- ── Jobs table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status        TEXT NOT NULL DEFAULT 'queued',
  language      TEXT NOT NULL DEFAULT 'en',
  file_url      TEXT,
  file_hash     TEXT,           -- SHA256 of PDF for cache dedup
  progress      INT DEFAULT 0,
  current_step  TEXT,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_file_hash ON jobs(file_hash);

-- ── Results table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  language              TEXT NOT NULL,
  overall_risk          TEXT,
  overall_summary       TEXT,
  qa_score              INT,
  test_count            INT,
  critical_count        INT,
  processing_time_ms    INT,
  total_tokens          INT,
  payload               JSONB NOT NULL,   -- full LabAnalysisResult
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_job_id ON results(job_id);

-- ── Audit log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  job_id      UUID REFERENCES jobs(id),
  event       TEXT NOT NULL,   -- 'agent_start', 'agent_done', 'agent_error'
  agent       TEXT,            -- 'agent1', 'agent2', ...
  tokens      INT,
  latency_ms  INT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_job_id ON audit_log(job_id);

-- ── Auto-update updated_at trigger ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
