// ============================================================
// Agent 5 — QA Self-Check
// Model critique output của Agent 4, tự sửa nếu có lỗi
// Đây là safety net cuối cùng trước khi trả về user
// ============================================================

import { qwenChat, parseJsonResponse, MODELS } from "../lib/qwen";
import type { Agent3Output, Agent4Output, Agent5Output } from "../../shared/types";

export async function runAgent5(
  agent4Output: Agent4Output,
  agent3Output: Agent3Output,
  jobId: string
): Promise<Agent5Output> {
  console.log(`[Agent5] QA checking ${agent4Output.tests.length} explanations`);

  const systemPrompt = `You are a medical QA reviewer checking AI-generated lab explanations for errors.

Check the patient explanations against the clinical analysis for these issues:
1. SEVERITY_WRONG: Explanation says "slightly" but clinical data shows severe deviation
2. EXPLANATION_UNCLEAR: Medical jargon still present, or explanation confusing
3. NEXT_STEPS_MISSING: No concrete action advised for abnormal results  
4. CRITICAL_MISSED: Critical test has routine urgency (should be emergency)
5. LANGUAGE_WRONG: Response not in requested language

Be strict. Patient safety depends on accuracy.

Return ONLY JSON:
{
  "issues_found": boolean,
  "issues": [
    {
      "test_name": string,
      "issue_type": "severity_wrong|explanation_unclear|next_steps_missing|critical_missed|language_wrong",
      "description": "what is wrong",
      "correction": "what it should say"
    }
  ],
  "validated_output": { ...corrected Agent4Output with all issues fixed },
  "qa_score": 0-100
}

If no issues found: issues=[], validated_output=same as input, qa_score=95+
Apply ALL corrections in validated_output — do not leave issues unfixed.`;

  const result = await qwenChat({
    model: MODELS.PLUS,
    systemPrompt,
    userContent: `Review these patient explanations:
    
CLINICAL ANALYSIS (ground truth):
${JSON.stringify(agent3Output, null, 2)}

PATIENT EXPLANATIONS TO REVIEW:
${JSON.stringify(agent4Output, null, 2)}`,
    traceId: jobId,
    traceName: "Agent5-QA",
    maxTokens: 5000,
    temperature: 0.1,
  });

  const output = parseJsonResponse<Agent5Output>(result.content, "Agent5");

  // Safety: ensure validated_output always exists
  if (!output.validated_output) {
    output.validated_output = agent4Output;
    output.qa_score = output.qa_score ?? 80;
  }

  // Log issues for debugging
  if (output.issues_found && output.issues.length > 0) {
    console.log(`[Agent5] Found ${output.issues.length} issues:`);
    output.issues.forEach((issue) => {
      console.log(`  - ${issue.test_name}: ${issue.issue_type} — ${issue.description}`);
    });
  } else {
    console.log(`[Agent5] No issues found. QA score: ${output.qa_score}`);
  }

  return output;
}
