// ============================================================
// Utility functions
// Severity colors, formatting helpers
// ============================================================

import type { Severity, TestStatus, Urgency } from "../../../shared/types";

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Severity styling ──────────────────────────────────────────
export const SEVERITY_CONFIG = {
  none: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    badge: "bg-green-100 text-green-800",
    dot: "bg-green-500",
    bar: "bg-green-500",
  },
  mild: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-800",
    dot: "bg-yellow-500",
    bar: "bg-yellow-500",
  },
  moderate: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
  },
  severe: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
} satisfies Record<Severity, object>;

export const URGENCY_CONFIG = {
  routine: { color: "text-green-700", bg: "bg-green-50 border-green-200" },
  soon:    { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  urgent:  { color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  emergency: { color: "text-red-700", bg: "bg-red-50 border-red-200" },
} satisfies Record<Urgency, object>;

export const RISK_CONFIG = {
  low:      { color: "text-green-700",  bg: "bg-green-50",  label: "Low" },
  medium:   { color: "text-yellow-700", bg: "bg-yellow-50", label: "Medium" },
  high:     { color: "text-orange-700", bg: "bg-orange-50", label: "High" },
  critical: { color: "text-red-700",    bg: "bg-red-50",    label: "Critical" },
};

// ── Formatting ────────────────────────────────────────────────
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

export function formatDeviation(pct: number): string {
  if (pct === 0) return "Within range";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% outside range`;
}

// ── Validate file ─────────────────────────────────────────────
export function validatePdf(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    return "not_pdf";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "too_large";
  }
  if (file.size === 0) {
    return "too_large";
  }
  return null;
}
