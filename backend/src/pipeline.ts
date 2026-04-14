// ============================================================
// Pipeline Orchestrator — v3 (optimized: 5 LLM calls → 2-3)
// Agent3 + Agent4 merged, Agent5 rule-based (no LLM)
// ============================================================

import pdfParse from "pdf-parse";
import { runAgent1, runAgent1Vision } from "./agents/agent1-extractor";
import { runAgent2 } from "./agents/agent2-normalizer";
import { runAgent34 } from "./agents/agent3-4-combined";
import { runAgent5RuleBased } from "./agents/agent5-qa";
import {
  createJob, updateJobStatus, saveResult,
  findCachedResult, logAudit
} from "./lib/db";
import { hashBuffer, isLikelyScanned, cleanPdfText, extractLabSection, pdfToImages } from "./lib/fileUtils";
import type { Language, LabAnalysisResult, JobStatus } from "@shared/types";

export interface PipelineOptions {
  jobId: string;
  pdfBuffer: Buffer;
  language: Language;
  onProgress: (status: JobStatus, progress: number, step: string) => Promise<void>;
}

export async function runPipeline(options: PipelineOptions): Promise<LabAnalysisResult> {
  const { jobId, pdfBuffer, language, onProgress } = options;
  const startTime = Date.now();
  const modelsUsed: string[] = [];

  console.log(`[Pipeline] Starting job ${jobId}, language=${language}, size=${pdfBuffer.length}`);

  const fileHash = hashBuffer(pdfBuffer);
  await createJob(jobId, language, fileHash);

  // Cache check
  await onProgress("extracting", 3, "Checking cache...");
  const cached = await findCachedResult(fileHash, language);
  if (cached) {
    console.log(`[Pipeline] Cache hit for hash ${fileHash.slice(0, 8)}...`);
    await updateJobStatus(jobId, "done", 100, "Returned from cache");
    return cached as LabAnalysisResult;
  }

  // Parse PDF
  await onProgress("extracting", 8, "Reading PDF...");
  let rawText: string;
  let pdfPages = 1;

  let isScanned = false;
  try {
    const parsed = await pdfParse(pdfBuffer);
    rawText = cleanPdfText(parsed.text);
    pdfPages = parsed.numpages;
    isScanned = isLikelyScanned(rawText, pdfBuffer.length);
    if (isScanned) {
      console.warn(`[Pipeline] Job ${jobId}: PDF may be scanned — will use vision model`);
    }
  } catch (err) {
    await updateJobStatus(jobId, "failed", 0, "Failed", `PDF parse error: ${err}`);
    throw new Error(`PDF parsing failed: ${err}`);
  }

  const pdfText = extractLabSection(rawText);

  // Agent 1: text path or vision path for scanned PDFs
  await onProgress("extracting", 18, "Extracting lab values...");
  await logAudit(jobId, "agent_start", "agent1");
  const t1 = Date.now();

  let agent1Result;
  if (isScanned || pdfText.trim().length < 50) {
    // Scanned PDF — convert pages to images and use Qwen VL
    await onProgress("extracting", 20, "Rendering PDF pages for OCR...");
    console.log(`[Pipeline] Job ${jobId}: using vision OCR (text=${pdfText.trim().length} chars)`);
    const images = await pdfToImages(pdfBuffer, 8);
    if (images.length === 0) {
      const msg = "Could not render PDF pages for OCR.";
      await updateJobStatus(jobId, "failed", 0, "Failed", msg);
      throw new Error(msg);
    }
    agent1Result = await runAgent1Vision(images, jobId);
    modelsUsed.push("qwen-vl-max");
  } else {
    agent1Result = await runAgent1(pdfText, jobId, language);
    modelsUsed.push("qwen-plus");
  }

  await logAudit(jobId, "agent_done", "agent1", undefined, Date.now() - t1, { tests_found: agent1Result.tests.length });

  if (agent1Result.tests.length === 0) {
    const msg = "No lab tests found in the PDF.";
    await updateJobStatus(jobId, "failed", 0, "Failed", msg);
    throw new Error(msg);
  }

  // Agent 2
  await onProgress("normalizing", 32, "Standardizing units and references...");
  await logAudit(jobId, "agent_start", "agent2");
  const t2 = Date.now();
  const agent2Result = await runAgent2(agent1Result, jobId);
  modelsUsed.push("qwen-plus");
  await logAudit(jobId, "agent_done", "agent2", undefined, Date.now() - t2);

  // Agent 3+4 (merged): clinical analysis + patient explanations in one LLM call
  await onProgress("analyzing", 52, `Analyzing and generating ${language.toUpperCase()} explanations...`);
  await logAudit(jobId, "agent_start", "agent34");
  const t34 = Date.now();
  const agent34Result = await runAgent34(agent2Result, language, jobId);
  modelsUsed.push("qwen-plus");
  await logAudit(jobId, "agent_done", "agent34", undefined, Date.now() - t34, { overall_risk: agent34Result.overall_risk });

  // Agent 5: rule-based QA (no LLM — instant)
  await onProgress("qa_check", 90, "Running quality check...");
  const agent5Result = runAgent5RuleBased(agent34Result, jobId);

  const processingTime = Date.now() - startTime;

  const finalResult: LabAnalysisResult = {
    job_id: jobId,
    language,
    patient_info: agent1Result.patient_info,
    tests: agent5Result.validated_output.tests,
    overall_summary: agent5Result.validated_output.overall_summary,
    urgent_actions: agent5Result.validated_output.urgent_actions,
    disclaimer: agent5Result.validated_output.disclaimer,
    overall_risk: agent34Result.overall_risk,
    critical_flags: agent34Result.critical_flags,
    qa_score: agent5Result.qa_score,
    metadata: {
      processing_time_ms: processingTime,
      total_tokens: 0,
      models_used: [...new Set(modelsUsed)],
      pdf_pages: pdfPages,
      extraction_confidence: agent1Result.confidence,
    },
  };

  await saveResult(jobId, language, finalResult, {
    overall_risk: finalResult.overall_risk,
    overall_summary: finalResult.overall_summary,
    qa_score: finalResult.qa_score,
    test_count: finalResult.tests.length,
    critical_count: finalResult.critical_flags.length,
    processing_time_ms: processingTime,
    total_tokens: 0,
  });

  await updateJobStatus(jobId, "done", 100, "Analysis complete");

  console.log(`[Pipeline] Job ${jobId} done in ${processingTime}ms | tests=${finalResult.tests.length} risk=${finalResult.overall_risk} qa=${finalResult.qa_score}`);

  return finalResult;
}
