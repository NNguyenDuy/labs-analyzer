// ============================================================
// ResultsPanel Component
// Hiển thị toàn bộ kết quả: summary cards, urgent actions,
// test list, disclaimer, metadata
// ============================================================

import { useTranslation } from "next-i18next";
import { Printer, RotateCcw, AlertTriangle, ShieldCheck, Clock, Activity } from "lucide-react";
import { TestCard } from "./TestCard";
import { cn, RISK_CONFIG, formatMs } from "../lib/utils";
import type { LabAnalysisResult } from "../../../shared/types";

interface Props {
  result: LabAnalysisResult;
  onReset: () => void;
  language: string;
}

export function ResultsPanel({ result, onReset, language }: Props) {
  const { t } = useTranslation("common");
  const isRTL = language === "ar";

  const abnormalCount = result.tests.filter((t) => t.status !== "normal").length;
  const criticalCount = result.tests.filter((t) => t.status === "critical").length;
  const riskConfig = RISK_CONFIG[result.overall_risk];

  // Sort: critical first, then severe, moderate, mild, normal
  const severityOrder = { critical: 0, severe: 1, moderate: 2, mild: 3, none: 4 };
  const sortedTests = [...result.tests].sort(
    (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-10" dir={isRTL ? "rtl" : "ltr"}>

      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t("results.new_report")}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <Printer className="w-4 h-4" />
          {t("results.print")}
        </button>
      </div>

      {/* Patient info (if available) */}
      {result.patient_info?.name && (
        <p className="text-xs text-gray-400 text-center">
          {result.patient_info.name}
          {result.patient_info.date && ` · ${result.patient_info.date}`}
        </p>
      )}

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-semibold text-gray-900">{result.tests.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t("results.total_tests")}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-semibold text-yellow-800">{abnormalCount}</p>
          <p className="text-xs text-yellow-700 mt-0.5">{t("results.abnormal")}</p>
        </div>
        <div className={cn("rounded-xl p-3 text-center", criticalCount > 0 ? "bg-red-50" : "bg-gray-50")}>
          <p className={cn("text-2xl font-semibold", criticalCount > 0 ? "text-red-800" : "text-gray-400")}>
            {criticalCount}
          </p>
          <p className={cn("text-xs mt-0.5", criticalCount > 0 ? "text-red-700" : "text-gray-400")}>
            {t("results.critical")}
          </p>
        </div>
        <div className={cn("rounded-xl p-3 text-center", riskConfig.bg)}>
          <p className={cn("text-2xl font-semibold", riskConfig.color)}>
            {result.overall_risk.charAt(0).toUpperCase()}
          </p>
          <p className={cn("text-xs mt-0.5", riskConfig.color)}>
            {t(`results.risk.${result.overall_risk}`).split(":")[1]?.trim() ?? result.overall_risk}
          </p>
        </div>
      </div>

      {/* Overall summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">{t("results.summary_heading")}</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{result.overall_summary}</p>
      </div>

      {/* Urgent actions — only show if any */}
      {result.urgent_actions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <h2 className="text-sm font-semibold">{t("results.urgent_heading")}</h2>
          </div>
          <ul className="space-y-1">
            {result.urgent_actions.map((action, i) => (
              <li key={i} className="text-sm text-red-700 flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Test results list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">{t("results.tests_heading")}</h2>
        {sortedTests.map((test, i) => (
          <TestCard key={`${test.name}-${i}`} test={test} isRTL={isRTL} />
        ))}
      </div>

      {/* Metadata bar */}
      <div className="flex items-center gap-4 text-xs text-gray-400 justify-center flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {t("results.processing_time")} {formatMs(result.metadata.processing_time_ms)}
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          {t("results.qa_score")}: {result.qa_score}/100
        </span>
        <span>{result.metadata.models_used.join(", ")}</span>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-600 mb-1">{t("results.disclaimer_heading")}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{result.disclaimer}</p>
      </div>

      {/* Print styles — injected inline */}
      <style jsx global>{`
        @media print {
          header, nav, button, .no-print { display: none !important; }
          body { font-size: 12px; }
          .rounded-xl, .rounded-2xl { border-radius: 4px !important; }
        }
      `}</style>
    </div>
  );
}
