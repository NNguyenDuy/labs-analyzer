// ============================================================
// File utilities
// SHA256 hashing for cache dedup
// Scanned PDF detection
// ============================================================

import { createHash } from "crypto";

/**
 * Tính SHA256 hash của PDF buffer
 * Dùng để dedup: cùng file → không gọi Qwen lại
 */
export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Detect scanned PDF (image-based, không có text layer)
 * Nếu text quá ngắn so với file size → likely scanned
 */
export function isLikelyScanned(pdfText: string, fileSize: number): boolean {
  const charsPerByte = pdfText.length / fileSize;
  // Text PDFs thường có ratio > 0.01 chars/byte
  // Scanned PDFs có ratio gần 0
  return charsPerByte < 0.005 && pdfText.trim().length < 200;
}

/**
 * Sanitize PDF text — remove garbage chars từ bad OCR
 */
export function cleanPdfText(raw: string): string {
  return raw
    .replace(/\x00/g, "")          // null bytes
    .replace(/[\uFFFD]/g, "")      // replacement chars
    .replace(/\r\n/g, "\n")        // normalize line endings
    .replace(/\n{3,}/g, "\n\n")    // collapse multiple blank lines
    .trim();
}

/**
 * Extract meaningful sections từ PDF text
 * Focus vào phần có numbers + units (lab values)
 */
export function extractLabSection(text: string): string {
  const lines = text.split("\n");
  const labLines: string[] = [];
  let inLabSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect lab section headers
    if (
      lower.includes("result") ||
      lower.includes("test") ||
      lower.includes("value") ||
      lower.includes("reference") ||
      lower.includes("normal") ||
      lower.includes("résultat") ||
      lower.includes("valeur") ||
      lower.includes("نتيجة") ||
      lower.includes("xét nghiệm")
    ) {
      inLabSection = true;
    }

    // Keep lines with numbers (likely lab values)
    const hasNumber = /\d+\.?\d*/.test(line);
    if (inLabSection || hasNumber) {
      labLines.push(line);
    }
  }

  // If extraction got too little, return full text
  const extracted = labLines.join("\n");
  return extracted.length > 200 ? extracted : text;
}
