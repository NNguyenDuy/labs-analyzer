// ============================================================
// Pipeline Orchestrator — v2 (with DB + cache)
// ============================================================

import pdfParse from "pdf-parse";
import { runAgent1 } from "./agents/agent1-extractor";
import { runAgent2 } from "./agents/agent2-normalizer";
import { runAgent3 } from "./agents/agent3-analyzer";
import { runAgent4 } from "./agents/agent4-explainer";
import { runAgent5 } from "./agents/agent5-qa";
import {
  createJob, updateJobStatus, saveResult,
  findCachedResult, logAudit
} from "./lib/db";
import { hashBuffer, isLikelyScanned, cleanPdfText, extractLabSection } from "./lib/fileUtils";
import type { Language, LabAnalysisResult, JobStatus } from "../shared/types";

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

  try {
    const parsed = await pdfParse(pdfBuffer);
    rawText = cleanPdfText(parsed.text);
    pdfPages = parsed.numpages;
    if (isLikelyScanned(rawText, pdfBuffer.length)) {
      console.warn(`[Pipeline] Job ${jobId}: PDF may be scanned`);
    }
  } catch (err) {
    await updateJobStatus(jobId, "failed", 0, "Failed", `PDF parse error: ${err}`);
    throw new Error(`PDF parsing failed: ${err}`);
  }

  const pdfText = extractLabSection(rawText);

  // Agent 1
  await onProgress("extracting", 18, "Extracting lab values...");
  await logAudit(jobId, "agent_start", "agent1");
  const t1 = Date.now();
  const agent1Result = await runAgent1(pdfText, jobId);
  modelsUsed.push("qwen-long");
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

  // Agent 3
  await onProgress("analyzing", 52, "Performing clinical analysis...");
  await logAudit(jobId, "agent_start", "agent3");
  const t3 = Date.now();
  const agent3Result = await runAgent3(agent2Result, jobId);
  await logAudit(jobId, "agent_done", "agent3", undefined, Date.now() - t3, { overall_risk: agent3Result.overall_risk });

  // Agent 4
  await onProgress("explaining", 70, `Generating ${language.toUpperCase()} explanations...`);
  await logAudit(jobId, "agent_start", "agent4");
  const t4 = Date.now();
  const agent4Result = await runAgent4(agent3Result, language, jobId);
  await logAudit(jobId, "agent_done", "agent4", undefined, Date.now() - t4);

  // Agent 5
  await onProgress("qa_check", 88, "Running quality check...");
  await logAudit(jobId, "agent_start", "agent5");
  const t5 = Date.now();
  const agent5Result = await runAgent5(agent4Result, agent3Result, jobId);
  await logAudit(jobId, "agent_done", "agent5", undefined, Date.now() - t5, { qa_score: agent5Result.qa_score });

  const processingTime = Date.now() - startTime;

  const finalResult: LabAnalysisResult = {
    job_id: jobId,
    language,
    patient_info: agent1Result.patient_info,
    tests: agent5Result.validated_output.tests,
    overall_summary: agent5Result.validated_output.overall_summary,
    urgent_actions: agent5Result.validated_output.urgent_actions,
    disclaimer: agent5Result.validated_output.disclaimer,
    overall_risk: agent3Result.overall_risk,
    critical_flags: agent3Result.critical_flags,
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
