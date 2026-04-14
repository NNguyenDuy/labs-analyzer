// ============================================================
// ResultsPanel Component
// Hiển thị toàn bộ kết quả: summary cards, urgent actions,
// test list, disclaimer, metadata
// ============================================================

import { useState } from "react";
import { useTranslation } from "next-i18next";
import { Download, RotateCcw, AlertTriangle, ShieldCheck, Clock, Activity } from "lucide-react";
import { motion } from "framer-motion";
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
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/job/${result.job_id}/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `labs-report-${result.job_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download failed", e);
    } finally {
      setDownloading(false);
    }
  };

  const abnormalCount = result.tests.filter((t) => t.status !== "normal").length;
  const criticalCount = result.tests.filter((t) => t.status === "critical").length;

  const getDarkRiskVars = (risk: string) => {
    switch(risk) {
      case "none":
      case "low": return { border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-400" };
      case "moderate": return { border: "border-amber-500/20", bg: "bg-amber-500/8", text: "text-amber-400" };
      case "high": return { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400" };
      case "critical": return { border: "border-red-500/30", bg: "bg-red-500/15", text: "text-red-400" };
      default: return { border: "border-indigo-500/20", bg: "bg-indigo-500/10", text: "text-indigo-400" };
    }
  };
  const darkRisk = getDarkRiskVars(result.overall_risk);

  const severityOrder: Record<string, number> = { critical: 0, severe: 1, moderate: 2, mild: 3, none: 4 };
  const sortedTests = [...result.tests].sort(
    (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-10" dir={isRTL ? "rtl" : "ltr"}>

      {/* Top action bar */}
      <motion.div 
        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-2"
      >
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t("results.new_report")}
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? t("results.downloading") : t("results.download_pdf")}
        </button>
      </motion.div>

      {/* Critical values banner */}
      {criticalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0.8 }}
          animate={{ opacity: 1, scaleY: 1 }}
          className="flex items-center gap-3 bg-red-500/20 border border-red-500/40 rounded-2xl px-5 py-3.5 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm font-bold text-red-300">
            {criticalCount} {t("results.critical_values_warning")}
          </p>
        </motion.div>
      )}

      {/* Patient info (if available) */}
      {result.patient_info?.name && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-white/30 text-center uppercase tracking-widest">
          {result.patient_info.name}
          {result.patient_info.date && ` · ${result.patient_info.date}`}
        </motion.p>
      )}

      {/* Summary metric cards */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <div className="glass-card p-4 text-center border-white/5">
          <p className="text-2xl font-bold text-white/90">{result.tests.length}</p>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mt-1.5">{t("results.total_tests")}</p>
        </div>
        <div className={cn("rounded-2xl border p-4 text-center transition-colors", abnormalCount > 0 ? "border-amber-500/20 bg-amber-500/5 shadow-inner" : "glass-card border-white/5")}>
          <p className={cn("text-2xl font-bold", abnormalCount > 0 ? "text-amber-400" : "text-white/90")}>{abnormalCount}</p>
          <p className={cn("text-[10px] uppercase tracking-wider font-semibold mt-1.5", abnormalCount > 0 ? "text-amber-400/60" : "text-white/40")}>{t("results.abnormal")}</p>
        </div>
        <div className={cn("rounded-2xl border p-4 text-center transition-colors", criticalCount > 0 ? "border-red-500/30 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "glass-card border-white/5")}>
          <p className={cn("text-2xl font-bold", criticalCount > 0 ? "text-red-400 drop-shadow-sm" : "text-white/30")}>
            {criticalCount}
          </p>
          <p className={cn("text-[10px] uppercase tracking-wider font-semibold mt-1.5", criticalCount > 0 ? "text-red-400/80" : "text-white/30")}>
            {t("results.critical")}
          </p>
        </div>
        <div className={cn("rounded-2xl border p-4 text-center", darkRisk.border, darkRisk.bg)}>
          <p className={cn("text-2xl font-bold", darkRisk.text)}>
            {result.overall_risk.charAt(0).toUpperCase()}
          </p>
          <p className={cn("text-[10px] uppercase tracking-wider font-semibold mt-1.5", darkRisk.text, "opacity-80")}>
            {t(`results.risk.${result.overall_risk}`).split(":")[1]?.trim() ?? result.overall_risk} Risk
          </p>
        </div>
      </motion.div>

      {/* Overall summary */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
        className="glass-card p-6 space-y-3 border-indigo-500/10 shadow-inner"
      >
        <div className="flex items-center gap-2 text-indigo-300/80">
          <Activity className="w-4 h-4" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]">{t("results.summary_heading")}</h2>
        </div>
        <p className="text-sm font-medium text-white/80 leading-relaxed">{result.overall_summary}</p>
      </motion.div>

      {/* Urgent actions — only show if any */}
      {result.urgent_actions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="border border-red-500/30 bg-red-500/10 rounded-2xl p-6 space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]">{t("results.urgent_heading")}</h2>
          </div>
          <ul className="space-y-2.5">
            {result.urgent_actions.map((action, i) => (
              <li key={i} className="text-sm font-medium text-red-300 leading-relaxed flex items-start gap-3">
                <span className="text-red-500/60 flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Test results list */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 pt-4">
        <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 text-center pb-2">
          {t("results.tests_heading")}
        </h2>
        {sortedTests.map((test, i) => (
          <motion.div key={`${test.name}-${i}`} variants={itemVariants}>
            <TestCard test={test} isRTL={isRTL} />
          </motion.div>
        ))}
      </motion.div>

      {/* Metadata bar */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="flex items-center gap-4 text-[11px] font-medium text-white/20 justify-center flex-wrap pt-6"
      >
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
          <Clock className="w-3 h-3" />
          {t("results.processing_time")} {formatMs(result.metadata.processing_time_ms)}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
          <ShieldCheck className="w-3 h-3" />
          {t("results.qa_score")}: {result.qa_score}/100
        </span>
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">
          {result.metadata.models_used.join(", ")}
        </span>
      </motion.div>

      {/* Disclaimer */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="glass-card p-5 border-white/5"
      >
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">{t("results.disclaimer_heading")}</p>
        <p className="text-[11px] font-medium text-white/30 leading-relaxed">{result.disclaimer}</p>
      </motion.div>

      {/* Print styles — injected inline */}
      <style jsx global>{`
        @media print {
          header, nav, button, .no-print { display: none !important; }
          body { font-size: 12px; background: white !important; color: black !important; }
          .rounded-xl, .rounded-2xl { border-radius: 4px !important; }
          .glass-card { background: none; border: 1px solid #ccc; color: black; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
