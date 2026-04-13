// ============================================================
// Database Client
// PostgreSQL via pg — Neon serverless compatible
// Handles job persistence + audit logging
// ============================================================

import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

// Connection pool — Neon works best with pool size 1-5
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

// ── Job operations ────────────────────────────────────────────

export async function createJob(
  jobId: string,
  language: string,
  fileHash: string
): Promise<void> {
  await pool.query(
    `INSERT INTO jobs (id, status, language, file_hash, progress, current_step)
     VALUES ($1, 'queued', $2, $3, 0, 'Queued...')
     ON CONFLICT (id) DO NOTHING`,
    [jobId, language, fileHash]
  );
}

export async function updateJobStatus(
  jobId: string,
  status: string,
  progress: number,
  step: string,
  error?: string
): Promise<void> {
  await pool.query(
    `UPDATE jobs
     SET status=$2, progress=$3, current_step=$4, error=$5,
         completed_at = CASE WHEN $2 IN ('done','failed') THEN NOW() ELSE NULL END
     WHERE id=$1`,
    [jobId, status, progress, step, error ?? null]
  );
}

export async function saveResult(
  jobId: string,
  language: string,
  payload: object,
  meta: {
    overall_risk: string;
    overall_summary: string;
    qa_score: number;
    test_count: number;
    critical_count: number;
    processing_time_ms: number;
    total_tokens: number;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO results
       (job_id, language, overall_risk, overall_summary, qa_score,
        test_count, critical_count, processing_time_ms, total_tokens, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      jobId,
      language,
      meta.overall_risk,
      meta.overall_summary,
      meta.qa_score,
      meta.test_count,
      meta.critical_count,
      meta.processing_time_ms,
      meta.total_tokens,
      JSON.stringify(payload),
    ]
  );
}

export async function getResultByJobId(jobId: string): Promise<object | null> {
  const res = await pool.query(
    `SELECT payload FROM results WHERE job_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [jobId]
  );
  return res.rows[0]?.payload ?? null;
}

// ── Audit log ─────────────────────────────────────────────────

export async function logAudit(
  jobId: string,
  event: string,
  agent?: string,
  tokens?: number,
  latency_ms?: number,
  metadata?: object
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (job_id, event, agent, tokens, latency_ms, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [jobId, event, agent ?? null, tokens ?? null, latency_ms ?? null,
       metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    // Audit log failure should never block main flow
    console.error("[DB] Audit log error:", err);
  }
}

// ── Cache lookup by file hash ─────────────────────────────────
// Nếu cùng PDF đã được phân tích với cùng ngôn ngữ → trả cache

export async function findCachedResult(
  fileHash: string,
  language: string
): Promise<object | null> {
  const res = await pool.query(
    `SELECT r.payload
     FROM results r
     JOIN jobs j ON r.job_id = j.id
     WHERE j.file_hash = $1 AND r.language = $2 AND j.status = 'done'
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [fileHash, language]
  );
  return res.rows[0]?.payload ?? null;
}

export { pool };
