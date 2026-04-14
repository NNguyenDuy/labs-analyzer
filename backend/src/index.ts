// ============================================================
// Fastify API Server
// Routes: POST /upload, GET /job/:id, POST /auth/demo
// ============================================================

import * as dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Language } from "@shared/types";
import { runMigrations } from "./lib/db";

const app = Fastify({
  logger: { transport: { target: "pino-pretty" } },
});

const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

const analysisQueue = new Queue("lab-analysis", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

// ── Plugins ───────────────────────────────────────────────────
(async () => {
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow if no origin (server-to-server, mobile apps)
      if (!origin) return cb(null, true);
      const allowed = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://labs-analyzer.vercel.app",
        ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : []),
      ];
      cb(null, allowed.includes(origin));
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 20,
    timeWindow: "1 minute",
    redis,
    keyGenerator: (req) => req.headers["x-forwarded-for"] as string || req.ip,
  });

  await app.register(multipart, {
    limits: {
      fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB ?? "10")) * 1024 * 1024,
      files: 1,
    },
  });

  // ── Health check ──────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    queue: await analysisQueue.getJobCounts(),
  }));

  // ── POST /api/upload — Upload PDF và queue job ────────────────
  const uploadSchema = z.object({
    language: z.enum(["en", "fr", "ar", "vi"]).default("en"),
  });

  app.post("/api/upload", async (req, reply) => {
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    // Validate file type via magic bytes (không chỉ dựa vào extension)
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // PDF magic bytes: %PDF
    if (pdfBuffer.slice(0, 4).toString() !== "%PDF") {
      return reply.status(400).send({ error: "File must be a valid PDF" });
    }

    if (pdfBuffer.length === 0) {
      return reply.status(400).send({ error: "File is empty" });
    }

    // Parse language từ form fields
    let language: Language = "en";
    try {
      const fields = uploadSchema.parse({ language: data.fields?.language });
      language = fields.language;
    } catch {
      language = "en";
    }

    const jobId = uuidv4();

    // Store initial job state
    await redis.set(
      `job:${jobId}`,
      JSON.stringify({
        job_id: jobId,
        status: "queued",
        progress: 0,
        current_step: "Queued for processing...",
        result: null,
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      "EX",
      3600
    );

    // Queue job — serialize Buffer as number array
    await analysisQueue.add(
      "analyze",
      {
        jobId,
        pdfBuffer: Array.from(pdfBuffer),
        language,
      },
      { jobId }
    );

    app.log.info(`Job ${jobId} queued, language: ${language}, size: ${pdfBuffer.length} bytes`);

    return reply.status(202).send({
      job_id: jobId,
      status: "queued",
      message: "PDF uploaded and queued for analysis",
    });
  });

  // ── GET /api/job/:id — Poll job status ────────────────────────
  app.get<{ Params: { id: string } }>("/api/job/:id", async (req, reply) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return reply.status(400).send({ error: "Invalid job ID format" });
    }

    const raw = await redis.get(`job:${id}`);
    if (!raw) {
      return reply.status(404).send({ error: "Job not found" });
    }

    const job = JSON.parse(raw);

    // Parse result if exists
    if (job.result && typeof job.result === "string") {
      job.result = JSON.parse(job.result);
    }

    return reply.send(job);
  });

  // ── POST /api/auth/demo — Demo login cho judge ───────────────
  app.post("/api/auth/demo", async (req, reply) => {
    // Simple demo token — không cần real auth cho hackathon
    return reply.send({
      token: "demo-token-labs-analyzer-2024",
      message: "Demo access granted",
    });
  });

  // ── Start server ──────────────────────────────────────────────
  const port = parseInt(process.env.PORT ?? "3001");

  try {
    // Auto-migrate: create tables if they don't exist yet
    await runMigrations();
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`[Server] Labs Analyzer API running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    await app.close();
    await analysisQueue.close();
    redis.disconnect();
  });
})();
