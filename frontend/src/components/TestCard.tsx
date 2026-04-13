// ============================================================
// TestCard Component
// Hiển thị từng kết quả xét nghiệm với severity color
// Expandable để xem giải thích chi tiết
// ============================================================

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "next-i18next";
import { cn, SEVERITY_CONFIG, URGENCY_CONFIG, formatConfidence, formatDeviation } from "../lib/utils";
import type { ExplainedLabTest } from "../../../shared/types";

interface Props {
  test: ExplainedLabTest;
  isRTL: boolean;
}

export function TestCard({ test, isRTL }: Props) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(
    // Auto-expand critical and severe tests
    test.severity === "severe" || test.status === "critical"
  );

  const sc = SEVERITY_CONFIG[test.severity];
  const uc = URGENCY_CONFIG[test.urgency];

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        sc.bg,
        sc.border
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Card header — always visible */}
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* Severity dot */}
          <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0", sc.dot)} />

          <div className="min-w-0">
            {/* Test name */}
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {test.name_standardized || test.name}
            </p>

            {/* Value + reference */}
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className={cn("text-base font-semibold", sc.text)}>
                {test.value_text} {test.unit}
              </span>
              {test.reference_range_text && (
                <span className="text-xs text-gray-400">
                  ref: {test.reference_range_text}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: badges + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Severity badge */}
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sc.badge)}>
            {t(`results.severity.${test.severity}`)}
          </span>

          {/* Urgency badge — only if not routine */}
          {test.urgency !== "routine" && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium border",
              uc.color,
              uc.bg
            )}>
              {t(`results.urgency.${test.urgency}`)}
            </span>
          )}

          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          }
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-current/10 space-y-3">

          {/* Patient explanation */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">
              {t("results.expand")}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {test.patient_explanation}
            </p>
          </div>

          {/* Next steps */}
          {test.next_steps && (
            <div className={cn("rounded-lg p-3 border", uc.bg)}>
              <p className="text-xs font-medium mb-1" style={{ color: "inherit" }}>
                {t("results.next_steps")}
              </p>
              <p className={cn("text-sm", uc.color)}>
                {test.next_steps}
              </p>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            <span>{t("results.confidence")}: {formatConfidence(test.confidence)}</span>
            {test.deviation_percent > 0 && (
              <span>{formatDeviation(test.deviation_percent)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
