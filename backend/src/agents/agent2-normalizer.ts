// ============================================================
// Agent 2 — Normalizer
// Chuẩn hóa unit, map về WHO reference ranges
// Kết hợp LLM + hardcoded Medical KB để tăng accuracy
// ============================================================

import { qwenChat, parseJsonResponse, MODELS } from "../lib/qwen";
import { findReference, getRelevantReferences } from "../lib/medicalKb";
import type { Agent1Output, Agent2Output, NormalizedLabTest } from "../../shared/types";

export async function runAgent2(
  agent1Output: Agent1Output,
  jobId: string
): Promise<Agent2Output> {
  console.log(`[Agent2] Normalizing ${agent1Output.tests.length} tests`);

  // Bước 1: Dùng Medical KB trước (fast, accurate cho tests phổ biến)
  const kbNormalized: NormalizedLabTest[] = [];
  const needsLLM: typeof agent1Output.tests = [];

  for (const test of agent1Output.tests) {
    const ref = findReference(test.name);
    if (ref && test.value !== null) {
      // Có trong KB — chuẩn hóa trực tiếp
      const valueInSI = test.unit.toLowerCase().includes("mg")
        ? test.value * ref.conversion_factor
        : test.value;

      kbNormalized.push({
        ...test,
        name_standardized: ref.name_standardized,
        value_si: parseFloat(valueInSI.toFixed(3)),
        unit_si: ref.unit_si,
        ref_min_si: ref.ref_min_si,
        ref_max_si: ref.ref_max_si,
        who_category: ref.category,
      });
    } else {
      // Không có trong KB — để LLM xử lý
      needsLLM.push(test);
    }
  }

  console.log(`[Agent2] KB resolved: ${kbNormalized.length}, needs LLM: ${needsLLM.length}`);

  // Bước 2: Dùng LLM cho các tests không có trong KB
  let llmNormalized: NormalizedLabTest[] = [];
  if (needsLLM.length > 0) {
    const relevantRefs = getRelevantReferences(needsLLM.map((t) => t.name));

    const systemPrompt = `You are a medical unit normalization expert.
Convert lab test values to SI units and standardize test names.

Available medical references:
${relevantRefs}

Return ONLY JSON array:
[
  {
    "name": "original name",
    "name_standardized": "WHO standard name",
    "value": number,
    "value_text": "original string",
    "unit": "original unit",
    "unit_si": "SI unit",
    "value_si": number,
    "reference_range_text": "original range",
    "reference_min": number | null,
    "reference_max": number | null,
    "ref_min_si": number | null,
    "ref_max_si": number | null,
    "who_category": "CBC|Metabolic|Lipid|Thyroid|Liver|Renal|Other"
  }
]

Rules:
- Keep all original fields
- If unit unknown, keep original value and unit, set value_si = value
- If reference range missing, use standard WHO ranges
- Never make up values`;

    const result = await qwenChat({
      model: MODELS.PLUS,
      systemPrompt,
      userContent: JSON.stringify(needsLLM),
      traceId: jobId,
      traceName: "Agent2-Normalizer",
      maxTokens: 2000,
    });

    llmNormalized = parseJsonResponse<NormalizedLabTest[]>(result.content, "Agent2");
  }

  const allTests = [...kbNormalized, ...llmNormalized];

  return {
    tests: allTests,
    normalization_notes: [
      `${kbNormalized.length} tests resolved from Medical Knowledge Base`,
      `${llmNormalized.length} tests normalized by LLM`,
      `Total: ${allTests.length} tests normalized`,
    ],
  };
}
