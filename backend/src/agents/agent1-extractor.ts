// ============================================================
// Agent 1 — PDF Extractor
// Nhận plain text từ PDF, trả về structured JSON raw data
// Model: qwen-long (text) / qwen-vl-max (scanned PDF via vision)
// ============================================================

import { qwenChat, qwenVisionChat, parseJsonResponse, MODELS } from "../lib/qwen";
import type { Agent1Output } from "@shared/types";

const SYSTEM_PROMPT = `You are a medical lab report data extractor. Your ONLY job is to extract raw data from lab reports.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no preamble
2. Extract ALL tests you can find, even if reference range is missing
3. Never interpret or diagnose — only extract
4. If a value cannot be parsed as number, put null in "value" and keep raw string in "value_text"
5. Preserve original units exactly as written in the PDF
6. The report may be in ANY language: Japanese (kanji/katakana e.g. 白血球、ヘモグロビン、血小板), Vietnamese, Arabic, French, or English. Extract regardless of language.
7. In Japanese reports: rows typically contain test name, numeric value, unit, and reference range — extract ALL such rows

Return this exact JSON structure:
{
  "patient_info": {
    "name": string | null,
    "dob": string | null,
    "date": string | null,
    "lab_name": string | null,
    "doctor": string | null
  },
  "tests": [
    {
      "name": "exact test name from PDF",
      "value": number | null,
      "value_text": "raw string from PDF",
      "unit": "exact unit from PDF",
      "reference_range_text": "exact range from PDF e.g. 70-100",
      "reference_min": number | null,
      "reference_max": number | null
    }
  ],
  "raw_text_snippet": "first 300 chars of input for debugging",
  "confidence": 0.0
}

For confidence: 0.9+ if PDF is clear text, 0.6-0.9 if some values unclear, <0.6 if mostly unreadable.`;

export async function runAgent1(
  pdfText: string,
  jobId: string,
  language?: string
): Promise<Agent1Output> {
  console.log(`[Agent1] Starting extraction for job ${jobId}, text length: ${pdfText.length}`);

  // Truncate nếu quá dài (qwen-long có limit)
  const maxChars = 30000;
  const truncated = pdfText.length > maxChars
    ? pdfText.slice(0, maxChars) + "\n...[TRUNCATED]"
    : pdfText;

  // Detect Japanese to provide a stronger hint to the model
  const hasJapanese = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(pdfText);
  const langHint = hasJapanese
    ? " NOTE: This report is in Japanese. Extract ALL rows containing numeric values as lab tests."
    : language ? ` NOTE: Report language hint: ${language}.` : "";

  const result = await qwenChat({
    model: MODELS.LONG,
    systemPrompt: SYSTEM_PROMPT,
    userContent: `Extract all lab data from this report.${langHint}\n\n${truncated}`,
    traceId: jobId,
    traceName: "Agent1-Extractor",
    maxTokens: 3000,
    temperature: 0.0, // Zero temperature cho extraction — deterministic
  });

  const output = parseJsonResponse<Agent1Output>(result.content, "Agent1");

  // Validate output
  if (!output.tests || !Array.isArray(output.tests)) {
    throw new Error("[Agent1] Invalid output: tests array missing");
  }

  // Fill defaults cho missing fields
  output.tests = output.tests.map((test) => ({
    name: test.name || "Unknown",
    value: test.value ?? null,
    value_text: test.value_text || String(test.value),
    unit: test.unit || "",
    reference_range_text: test.reference_range_text || "",
    reference_min: test.reference_min ?? null,
    reference_max: test.reference_max ?? null,
  }));

  output.patient_info = output.patient_info || {
    name: null, dob: null, date: null, lab_name: null, doctor: null
  };

  output.raw_text_snippet = pdfText.slice(0, 300);
  output.confidence = output.confidence ?? 0.7;

  console.log(`[Agent1] Extracted ${output.tests.length} tests, confidence: ${output.confidence}`);
  return output;
}

/**
 * Vision-based extraction for scanned PDFs (no text layer)
 * Sends PDF page images to qwen-vl-max for OCR + structured extraction
 */
export async function runAgent1Vision(
  images: string[],
  jobId: string
): Promise<Agent1Output> {
  console.log(`[Agent1-Vision] Starting vision extraction for job ${jobId}, pages: ${images.length}`);

  const result = await qwenVisionChat({
    images,
    systemPrompt: SYSTEM_PROMPT,
    userText: "This is a scanned medical lab report. Extract ALL lab test data visible in these images. Return the JSON structure exactly as specified.",
    traceId: jobId,
    traceName: "Agent1-Vision",
    maxTokens: 4000,
    temperature: 0.0,
  });

  const output = parseJsonResponse<Agent1Output>(result.content, "Agent1-Vision");

  if (!output.tests || !Array.isArray(output.tests)) {
    throw new Error("[Agent1-Vision] Invalid output: tests array missing");
  }

  output.tests = output.tests.map((test) => ({
    name: test.name || "Unknown",
    value: test.value ?? null,
    value_text: test.value_text || String(test.value),
    unit: test.unit || "",
    reference_range_text: test.reference_range_text || "",
    reference_min: test.reference_min ?? null,
    reference_max: test.reference_max ?? null,
  }));

  output.patient_info = output.patient_info || {
    name: null, dob: null, date: null, lab_name: null, doctor: null,
  };

  output.raw_text_snippet = "(scanned PDF — extracted via vision model)";
  output.confidence = output.confidence ?? 0.6;

  console.log(`[Agent1-Vision] Extracted ${output.tests.length} tests, confidence: ${output.confidence}`);
  return output;
}
