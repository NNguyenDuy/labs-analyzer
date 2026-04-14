// ============================================================
// BullMQ Worker
// Consume jobs từ queue "lab-analysis"
// Chạy pipeline và update state sau mỗi bước
// ============================================================

import * as dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { runPipeline } from "./pipeline";
import type { Language, JobStatus } from "@shared/types";

const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export interface JobData {
  jobId: string;
  pdfBuffer: number[]; // Buffer serialized as number array for BullMQ
  language: Language;
}

// ── Helper: Update job progress trong Redis ───────────────────
async function updateJobProgress(
  jobId: string,
  status: JobStatus,
  progress: number,
  step: string,
  result?: object,
  error?: string
) {
  const data = {
    job_id: jobId,
    status,
    progress,
    current_step: step,
    result: result ? JSON.stringify(result) : null,
    error: error ?? null,
    updated_at: new Date().toISOString(),
  };
  await redis.set(`job:${jobId}`, JSON.stringify(data), "EX", 3600); // TTL 1 hour
}

// ── Worker setup ──────────────────────────────────────────────
const worker = new Worker<JobData>(
  "lab-analysis",
  async (job: Job<JobData>) => {
    const { jobId, pdfBuffer, language } = job.data;

    console.log(`[Worker] Processing job ${jobId}`);

    try {
      const result = await runPipeline({
        jobId,
        pdfBuffer: Buffer.from(pdfBuffer),
        language,
        onProgress: async (status, progress, step) => {
          await updateJobProgress(jobId, status, progress, step);
          await job.updateProgress(progress);
        },
      });

      // Job done — store result
      await updateJobProgress(jobId, "done", 100, "Analysis complete", result);
      console.log(`[Worker] Job ${jobId} completed successfully`);
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Worker] Job ${jobId} failed:`, errMsg);
      await updateJobProgress(jobId, "failed", 0, "Failed", undefined, errMsg);
      throw err; // Re-throw để BullMQ biết job failed
    }
  },
  {
    connection: redis,
    concurrency: 3, // Max 3 jobs chạy đồng thời để không cạn Qwen quota
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

console.log("[Worker] Lab analysis worker started, waiting for jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  redis.disconnect();
});
