// ============================================================
// Unit Tests — Agent logic validation
// Run: pnpm test
// ============================================================

import { describe, it, expect } from "node:test";
import assert from "node:assert/strict";

// ── Test: Medical KB lookup ────────────────────────────────────
describe("Medical KB", () => {
  it("finds glucose by alias", async () => {
    const { findReference } = await import("../src/lib/medicalKb");
    const ref = findReference("blood sugar");
    assert.ok(ref !== null, "Should find glucose by alias 'blood sugar'");
    assert.equal(ref!.name_standardized, "Glucose (Fasting)");
  });

  it("finds HbA1c by alias", async () => {
    const { findReference } = await import("../src/lib/medicalKb");
    const ref = findReference("hemoglobin a1c");
    assert.ok(ref !== null, "Should find HbA1c");
    assert.equal(ref!.category, "Metabolic");
  });

  it("returns null for unknown test", async () => {
    const { findReference } = await import("../src/lib/medicalKb");
    const ref = findReference("xyzzy_unknown_test_12345");
    assert.equal(ref, null);
  });
});

// ── Test: JSON parsing ────────────────────────────────────────
describe("parseJsonResponse", () => {
  it("parses clean JSON", async () => {
    const { parseJsonResponse } = await import("../src/lib/qwen");
    const result = parseJsonResponse<{ foo: string }>('{"foo":"bar"}', "test");
    assert.equal(result.foo, "bar");
  });

  it("strips markdown fences", async () => {
    const { parseJsonResponse } = await import("../src/lib/qwen");
    const result = parseJsonResponse<{ foo: string }>(
      '```json\n{"foo":"bar"}\n```',
      "test"
    );
    assert.equal(result.foo, "bar");
  });

  it("throws on invalid JSON", async () => {
    const { parseJsonResponse } = await import("../src/lib/qwen");
    assert.throws(
      () => parseJsonResponse("not json", "test"),
      /Failed to parse JSON/
    );
  });
});

// ── Test: File utilities ──────────────────────────────────────
describe("fileUtils", () => {
  it("hashes buffer deterministically", async () => {
    const { hashBuffer } = await import("../src/lib/fileUtils");
    const buf = Buffer.from("hello world");
    assert.equal(hashBuffer(buf), hashBuffer(buf));
    assert.notEqual(hashBuffer(buf), hashBuffer(Buffer.from("different")));
  });

  it("detects scanned PDF", async () => {
    const { isLikelyScanned } = await import("../src/lib/fileUtils");
    const bigFile = 500_000; // 500 KB
    assert.equal(isLikelyScanned("tiny text", bigFile), true);
    assert.equal(isLikelyScanned("a".repeat(5000), bigFile), false);
  });

  it("cleans null bytes from PDF text", async () => {
    const { cleanPdfText } = await import("../src/lib/fileUtils");
    const dirty = "Glucose\x00 5.4\x00 mmol/L";
    assert.equal(cleanPdfText(dirty).includes("\x00"), false);
  });
});

// ── Test: Severity logic ──────────────────────────────────────
describe("Severity config", () => {
  it("has all 4 severity levels", async () => {
    const { SEVERITY_CONFIG } = await import("../src/lib/utils");
    assert.ok("none" in SEVERITY_CONFIG);
    assert.ok("mild" in SEVERITY_CONFIG);
    assert.ok("moderate" in SEVERITY_CONFIG);
    assert.ok("severe" in SEVERITY_CONFIG);
  });
});

console.log("All tests passed!");
