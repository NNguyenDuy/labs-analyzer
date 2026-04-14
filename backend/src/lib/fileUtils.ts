// ============================================================
// File utilities
// SHA256 hashing for cache dedup
// Scanned PDF detection
// PDF → image conversion for OCR via vision model
// ============================================================

import { createHash } from "crypto";
import { createCanvas } from "@napi-rs/canvas";

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
      lower.includes("xét nghiệm") ||
      // Japanese lab keywords
      line.includes("検査") ||
      line.includes("結果") ||
      line.includes("基準値") ||
      line.includes("正常値") ||
      line.includes("単位")
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

/**
 * Convert PDF pages to base64-encoded PNG images
 * Used for scanned PDFs that have no text layer → send to Qwen VL for OCR
 */
export async function pdfToImages(
  buffer: Buffer,
  maxPages = 5,
  scale = 2.0
): Promise<string[]> {
  // Dynamic import to avoid loading pdfjs at startup (heavy module)
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Point to the bundled worker file — required by pdfjs-dist 5.x even in Node.js
  // Must be a file:// URL on Windows (bare absolute paths are rejected by ESM loader)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const workerAbsPath: string = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const workerUrl = new URL(`file:///${workerAbsPath.replace(/\\/g, "/")}`).href;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");

    // NodeCanvasFactory pattern required by pdfjs
    await page.render({
      canvasContext: ctx as unknown as object,
      canvas: canvas as unknown as object,
      viewport,
    } as Parameters<typeof page.render>[0]).promise;

    // Export as base64 PNG (strip "data:image/png;base64," prefix)
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    images.push(base64);
    page.cleanup();
  }

  return images;
}
