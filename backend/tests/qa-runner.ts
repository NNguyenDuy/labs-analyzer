#!/usr/bin/env tsx
// ============================================================
// QA Test Script — Member 4 dùng để test pipeline
// Usage: tsx tests/qa-runner.ts [pdf-path] [language]
// Example: tsx tests/qa-runner.ts ./samples/en-report.pdf en
// ============================================================

import * as fs from "fs";
import * as path from "path";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

async function runQA(pdfPath: string, language: string = "en") {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`QA Test: ${path.basename(pdfPath)} | Language: ${language}`);
  console.log("=".repeat(60));

  if (!fs.existsSync(pdfPath)) {
    console.error(`ERROR: File not found: ${pdfPath}`);
    process.exit(1);
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), path.basename(pdfPath));
  formData.append("language", language);

  // Upload
  console.log("\n[1/3] Uploading PDF...");
  const uploadStart = Date.now();
  const uploadRes = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error(`Upload FAILED (${uploadRes.status}): ${err}`);
    process.exit(1);
  }

  const { job_id } = await uploadRes.json();
  console.log(`   Job ID: ${job_id}`);

  // Poll
  console.log("\n[2/3] Polling for results...");
  let attempts = 0;
  const maxAttempts = 60; // 2 min timeout

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 2000));
    attempts++;

    const pollRes = await fetch(`${API_URL}/api/job/${job_id}`);
    const data = await pollRes.json();

    process.stdout.write(`\r   ${data.current_step} (${data.progress}%)    `);

    if (data.status === "done") {
      const totalTime = Date.now() - uploadStart;
      console.log(`\n\n[3/3] RESULTS (${(totalTime / 1000).toFixed(1)}s)`);
      console.log("=".repeat(60));

      const result = data.result;
      console.log(`Tests found:     ${result.tests.length}`);
      console.log(`Overall risk:    ${result.overall_risk.toUpperCase()}`);
      console.log(`QA score:        ${result.qa_score}/100`);
      console.log(`Critical flags:  ${result.critical_flags.join(", ") || "none"}`);
      console.log(`Processing time: ${result.metadata.processing_time_ms}ms`);
      console.log(`Models used:     ${result.metadata.models_used.join(", ")}`);

      console.log("\n── Tests ──────────────────────────────────────────");
      for (const test of result.tests) {
        const icon =
          test.severity === "severe" ? "🔴" :
          test.severity === "moderate" ? "🟠" :
          test.severity === "mild" ? "🟡" : "🟢";
        console.log(`${icon} ${test.name_standardized.padEnd(30)} ${test.value_text} ${test.unit} | ${test.severity} | ${test.urgency}`);
      }

      if (result.urgent_actions.length > 0) {
        console.log("\n── Urgent Actions ──────────────────────────────────");
        result.urgent_actions.forEach((a: string, i: number) => console.log(`${i + 1}. ${a}`));
      }

      console.log("\n── Summary ─────────────────────────────────────────");
      console.log(result.overall_summary);

      // Score assessment
      console.log("\n── QA Assessment ───────────────────────────────────");
      const abnormal = result.tests.filter((t: any) => t.status !== "normal").length;
      const withNextSteps = result.tests.filter((t: any) => t.next_steps?.length > 10).length;
      const withExplanation = result.tests.filter((t: any) => t.patient_explanation?.length > 20).length;

      console.log(`Abnormal tests:           ${abnormal}/${result.tests.length}`);
      console.log(`Tests with next steps:    ${withNextSteps}/${result.tests.length}`);
      console.log(`Tests with explanation:   ${withExplanation}/${result.tests.length}`);
      console.log(`QA Score:                 ${result.qa_score >= 85 ? "PASS ✓" : result.qa_score >= 70 ? "MARGINAL ⚠" : "FAIL ✗"} (${result.qa_score}/100)`);

      return;
    }

    if (data.status === "failed") {
      console.error(`\nFAILED: ${data.error}`);
      process.exit(1);
    }
  }

  console.error("\nTIMEOUT: Job did not complete within 2 minutes");
  process.exit(1);
}

// Run
const [, , pdfArg, langArg] = process.argv;

if (!pdfArg) {
  console.log("Usage: tsx tests/qa-runner.ts <pdf-path> [language]");
  console.log("       language: en | fr | ar | vi (default: en)");
  process.exit(0);
}

runQA(pdfArg, langArg ?? "en").catch(console.error);
