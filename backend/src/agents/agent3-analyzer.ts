// ============================================================
// Agent 3 — Clinical Analyzer
// Chain-of-Thought reasoning để đảm bảo accuracy
// Inject Medical KB references vào context
// ============================================================

import { qwenChat, parseJsonResponse, MODELS } from "../lib/qwen";
import { getRelevantReferences } from "../lib/medicalKb";
import type { Agent2Output, Agent3Output, AnalyzedLabTest } from "../../shared/types";

export async function runAgent3(
  agent2Output: Agent2Output,
  jobId: string
): Promise<Agent3Output> {
  console.log(`[Agent3] Analyzing ${agent2Output.tests.length} tests with CoT`);

  // Inject relevant medical references để tăng clinical accuracy
  const testNames = agent2Output.tests.map((t) => t.name_standardized || t.name);
  const medicalRefs = getRelevantReferences(testNames);

  const systemPrompt = `You are a senior clinical pathologist analyzing lab results.

MEDICAL REFERENCE STANDARDS (use these for accuracy):
${medicalRefs}

For EACH test, reason through these 5 steps before concluding:
Step 1: What is the normal range for this test? (cite the standard)
Step 2: What is the patient's value and how does it compare?
Step 3: Calculate deviation percentage = |value - nearest_boundary| / range × 100
Step 4: Determine status (normal/low/high/critical) based on deviation
Step 5: Determine severity (none/mild/moderate/severe) based on clinical significance

SEVERITY RULES (mandatory):
- none: within normal range
- mild: 0-25% outside range, no immediate risk
- moderate: 25-75% outside range, clinical attention needed
- severe: >75% outside range OR critical value (risk to life)
- critical status: value crosses panic/critical threshold (automatic severe)

Return ONLY JSON:
{
  "tests": [
    {
      "name": string,
      "name_standardized": string,
      "value": number,
      "value_text": string,
      "unit": string,
      "unit_si": string,
      "value_si": number,
      "reference_range_text": string,
      "reference_min": number | null,
      "reference_max": number | null,
      "ref_min_si": number | null,
      "ref_max_si": number | null,
      "who_category": string,
      "status": "normal" | "low" | "high" | "critical",
      "severity": "none" | "mild" | "moderate" | "severe",
      "deviation_percent": number,
      "reasoning_steps": ["step1...", "step2...", "step3...", "step4...", "step5..."],
      "clinical_significance": "brief clinical note",
      "confidence": 0.0
    }
  ],
  "critical_flags": ["list of test names with critical status"],
  "overall_risk": "low" | "medium" | "high" | "critical"
}`;

  const result = await qwenChat({
    model: MODELS.PLUS,
    systemPrompt,
    userContent: `Analyze these normalized lab results:\n${JSON.stringify(agent2Output.tests, null, 2)}`,
    traceId: jobId,
    traceName: "Agent3-Analyzer-CoT",
    maxTokens: 5000,
    temperature: 0.1,
  });

  const output = parseJsonResponse<Agent3Output>(result.content, "Agent3");

  // Post-processing: validate và enforce severity rules programmatically
  output.tests = output.tests.map((test) => {
    // Tính deviation nếu model không tính đúng
    if (test.value_si !== null && test.ref_min_si !== null && test.ref_max_si !== null) {
      const range = test.ref_max_si - test.ref_min_si;
      if (range > 0) {
        let deviation = 0;
        if (test.value_si < test.ref_min_si) {
          deviation = ((test.ref_min_si - test.value_si) / range) * 100;
        } else if (test.value_si > test.ref_max_si) {
          deviation = ((test.value_si - test.ref_max_si) / range) * 100;
        }
        // Override nếu model tính sai quá 10%
        if (Math.abs(test.deviation_percent - deviation) > 10) {
          test.deviation_percent = parseFloat(deviation.toFixed(1));
        }
      }
    }

    // Enforce severity dựa trên deviation (safety net)
    if (test.status === "normal") {
      test.severity = "none";
    } else if (test.deviation_percent < 25 && test.severity === "severe") {
      // Model overcall severe — giảm xuống moderate
      test.severity = "moderate";
    }

    return test;
  });

  // Ensure critical_flags đúng
  output.critical_flags = output.tests
    .filter((t) => t.status === "critical")
    .map((t) => t.name_standardized || t.name);

  // Recalculate overall_risk
  const hasCritical = output.critical_flags.length > 0;
  const hasSevere = output.tests.some((t) => t.severity === "severe");
  const hasModerate = output.tests.some((t) => t.severity === "moderate");

  output.overall_risk = hasCritical ? "critical" : hasSevere ? "high" : hasModerate ? "medium" : "low";

  console.log(`[Agent3] Risk: ${output.overall_risk}, Critical flags: ${output.critical_flags.join(", ") || "none"}`);
  return output;
}
