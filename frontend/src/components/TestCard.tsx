import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "next-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { cn, SEVERITY_CONFIG, URGENCY_CONFIG, formatConfidence, formatDeviation } from "../lib/utils";
import type { ExplainedLabTest } from "../../../shared/types";

interface Props {
  test: ExplainedLabTest;
  isRTL: boolean;
}

// Dark-mode severity tokens
const DARK_SEVERITY: Record<string, { border: string; bg: string; dot: string; value: string; badge: string }> = {
  none:     { border: "border-emerald-500/20", bg: "bg-emerald-500/5",  dot: "bg-emerald-400",  value: "text-emerald-400",  badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" },
  mild:     { border: "border-amber-500/20",   bg: "bg-amber-500/5",    dot: "bg-amber-400",    value: "text-amber-400",    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/25" },
  moderate: { border: "border-orange-500/20",  bg: "bg-orange-500/5",   dot: "bg-orange-400",   value: "text-orange-400",   badge: "bg-orange-500/15 text-orange-400 border border-orange-500/25" },
  severe:   { border: "border-red-500/30",     bg: "bg-red-500/10",     dot: "bg-red-400",      value: "text-red-400",      badge: "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" },
};

const DARK_URGENCY: Record<string, { bg: string; text: string; badge: string }> = {
  routine:   { bg: "bg-white/4",            text: "text-white/50",    badge: "bg-white/6 text-white/40 border border-white/8" },
  soon:      { bg: "bg-amber-500/8",        text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-400 border border-amber-500/25" },
  urgent:    { bg: "bg-orange-500/8",       text: "text-orange-400",  badge: "bg-orange-500/15 text-orange-400 border border-orange-500/25" },
  immediate: { bg: "bg-red-500/10",         text: "text-red-400",     badge: "bg-red-500/15 text-red-400 border border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.2)]" },
};

export function TestCard({ test, isRTL }: Props) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(
    test.severity === "severe" || test.status === "critical"
  );

  const ds = DARK_SEVERITY[test.severity] ?? DARK_SEVERITY.none;
  const du = DARK_URGENCY[test.urgency] ?? DARK_URGENCY.routine;

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn("rounded-2xl border transition-colors duration-300 overflow-hidden", ds.border, ds.bg)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3 group focus:outline-none"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-4 min-w-0">
          {/* Severity dot */}
          <div className={cn("w-2 h-2 rounded-full mt-2.5 flex-shrink-0 shadow-[0_0_8px_currentColor]", ds.dot)} />

          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90 leading-snug tracking-wide">
              {test.name_standardized || test.name}
            </p>
            {test.loinc_code && (
              <span className="text-[9px] font-mono font-medium text-white/20 tracking-wider mt-0.5">
                LOINC {test.loinc_code}
              </span>
            )}
            <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
              <span className={cn("text-base font-bold tabular-nums drop-shadow-sm", ds.value)}>
                {test.value_text} <span className="text-sm font-medium opacity-80">{test.unit}</span>
              </span>
              {test.reference_range_text && (
                <span className="text-xs text-white/30 font-medium">
                  {t("results.ref")}: {test.reference_range_text}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badges + chevron */}
        <div className="flex items-center gap-2.5 flex-shrink-0 mt-1">
          <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase", ds.badge)}>
            {t(`results.severity.${test.severity}`)}
          </span>
          {test.urgency !== "routine" && (
            <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase", du.badge)}>
              {t(`results.urgency.${test.urgency}`)}
            </span>
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center ml-1 group-hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80" strokeWidth={2.5} />
          </motion.div>
        </div>
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="px-5 pb-5 pt-0 border-t border-white/10 space-y-4 mt-0"
          >
            <div className="pt-4">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2.5">
                {t("results.expand")}
              </p>
              <p className="text-sm text-white/70 leading-relaxed font-medium">
                {test.patient_explanation}
              </p>
            </div>

            {test.clinical_significance && (
              <div className="rounded-xl p-4 bg-white/5 border border-white/8">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">
                  {t("results.clinical_significance")}
                </p>
                <p className="text-sm font-medium text-white/60 leading-relaxed">
                  {test.clinical_significance}
                </p>
              </div>
            )}

            {test.next_steps && (
              <div className={cn("rounded-xl p-4 border border-white/10 shadow-inner", du.bg)}>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">
                  {t("results.next_steps")}
                </p>
                <p className={cn("text-sm font-medium leading-relaxed", du.text)}>
                  {test.next_steps}
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-white/30 flex-wrap pt-2 border-t border-white/5">
              <span className="font-medium">{t("results.confidence")}: {formatConfidence(test.confidence)}</span>
              {test.deviation_percent > 0 && (
                <span className="font-medium">{formatDeviation(test.deviation_percent)}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
