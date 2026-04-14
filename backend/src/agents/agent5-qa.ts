// ============================================================
// Agent 5 — QA Self-Check (rule-based, no LLM)
// Replaces slow LLM QA with deterministic rule validation
// Saves ~40-60s by eliminating one full LLM round-trip
// ============================================================

import type { Agent34Output, Agent5Output } from "@shared/types";

export function runAgent5RuleBased(agent34Output: Agent34Output, jobId: string): Agent5Output {
  console.log(`[Agent5] Rule-based QA for ${agent34Output.tests.length} tests`);
  const issues: Agent5Output["issues"] = [];

  for (const test of agent34Output.tests) {
    // Rule 1: Critical tests must have emergency urgency
    if (test.status === "critical" && test.urgency !== "emergency") {
      issues.push({
        test_name: test.name_standardized || test.name,
        issue_type: "critical_missed",
        description: `Critical test has urgency="${test.urgency}" instead of "emergency"`,
        correction: "Set urgency to emergency",
      });
      test.urgency = "emergency";
    }

    // Rule 2: Severe tests must have urgent or emergency urgency
    if (test.severity === "severe" && test.urgency === "routine") {
      issues.push({
        test_name: test.name_standardized || test.name,
        issue_type: "severity_wrong",
        description: `Severe test has urgency="routine"`,
        correction: "Set urgency to urgent",
      });
      test.urgency = "urgent";
    }

    // Rule 3: Abnormal tests must have next_steps
    if (test.status !== "normal" && (!test.next_steps || test.next_steps.trim().length < 10)) {
      issues.push({
        test_name: test.name_standardized || test.name,
        issue_type: "next_steps_missing",
        description: "Abnormal test has no actionable next steps",
        correction: "Add specific next steps",
      });
    }
  }

  // Re-sync urgent_actions after fixes
  agent34Output.urgent_actions = agent34Output.tests
    .filter((t) => t.urgency === "urgent" || t.urgency === "emergency")
    .map((t) => t.next_steps);

  const qa_score = issues.length === 0 ? 97 : Math.max(60, 97 - issues.length * 5);

  if (issues.length > 0) {
    console.log(`[Agent5] Fixed ${issues.length} issue(s). QA score: ${qa_score}`);
  } else {
    console.log(`[Agent5] No issues. QA score: ${qa_score}`);
  }

  // Map Agent34Output → Agent4Output shape for validated_output
  const validated_output = {
    language: agent34Output.language,
    tests: agent34Output.tests,
    overall_summary: agent34Output.overall_summary,
    urgent_actions: agent34Output.urgent_actions,
    disclaimer: agent34Output.disclaimer,
  };

  return {
    issues_found: issues.length > 0,
    issues,
    validated_output,
    qa_score,
  };
}
