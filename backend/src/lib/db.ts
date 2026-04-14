// ============================================================
// Database Client
// PostgreSQL via pg — Neon serverless compatible
// Handles job persistence + audit logging
// ============================================================

import { Pool } from "pg";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
dotenv.config();

// Connection pool — Neon works best with pool size 1-5
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_SSL === "false"
    ? false
    : process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

// ── Auto-migration ─────────────────────────────────────────────
// Runs schema.sql on startup — safe to run multiple times (IF NOT EXISTS)

export async function runMigrations(): Promise<void> {
  // Try multiple paths to support both dev (tsx) and prod (compiled dist) environments
  const candidates = [
    join(__dirname, "..", "..", "..", "schema.sql"),          // dev: src/lib -> backend/schema.sql
    join(__dirname, "..", "..", "..", "..", "schema.sql"),    // compiled: dist/backend/src/lib -> backend/schema.sql
    join(process.cwd(), "backend", "schema.sql"),            // docker: /app/backend/schema.sql
    join(process.cwd(), "schema.sql"),                       // fallback: /app/schema.sql
  ];

  let sql: string | null = null;
  for (const p of candidates) {
    try {
      sql = readFileSync(p, "utf-8");
      break;
    } catch {
      // try next path
    }
  }

  if (!sql) {
    throw new Error(`[DB] Cannot find schema.sql. Tried: ${candidates.join(", ")}`);
  }

  // Smart split: split by ";" but keep $$ dollar-quoted PL/pgSQL blocks intact
  const statements = splitSqlStatements(sql);

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err: any) {
      // 42710 = duplicate_object (trigger already exists) — safe to ignore
      // 42P07 = duplicate_table
      if (err?.code === "42710" || err?.code === "42P07") continue;
      throw err;
    }
  }
  console.log("[DB] Migrations applied ✓");
}

/**
 * Splits a SQL file into individual statements, keeping $$ dollar-quoted
 * blocks (used in PL/pgSQL functions) intact.
 */
function splitSqlStatements(sql: string): string[] {
  const stmts: string[] = [];
  let current = "";
  let inDollarQuote = false;

  // Process line by line
  for (const line of sql.split("\n")) {
    const trimmed = line.trim();
    // Toggle dollar-quote state
    const dollarMatches = (line.match(/\$\$/g) || []).length;
    if (dollarMatches % 2 !== 0) {
      inDollarQuote = !inDollarQuote;
    }

    current += line + "\n";

    // Only split on semicolons outside of dollar-quoted blocks
    if (!inDollarQuote && trimmed.endsWith(";")) {
      const stmt = current.replace(/--[^\n]*/g, "").trim().replace(/;$/, "").trim();
      if (stmt.length > 0) stmts.push(stmt);
      current = "";
    }
  }

  // Flush any remaining content
  const last = current.replace(/--[^\n]*/g, "").trim().replace(/;$/, "").trim();
  if (last.length > 0) stmts.push(last);

  return stmts;
}

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
