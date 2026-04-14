import { useTranslation } from "next-i18next";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { JobStatus } from "../../../shared/types";

interface Props {
  status: JobStatus;
  progress: number;
  step: string;
}

const STEPS: { key: JobStatus; label_key: string; icon: string }[] = [
  { key: "extracting",  label_key: "progress.extracting",  icon: "📄" },
  { key: "normalizing", label_key: "progress.normalizing", icon: "🔧" },
  { key: "analyzing",   label_key: "progress.analyzing",   icon: "🧠" },
  { key: "qa_check",    label_key: "progress.qa_check",    icon: "✅" },
];

const STATUS_ORDER: JobStatus[] = [
  "queued", "extracting", "normalizing", "analyzing", "qa_check", "done",
];

function getStepState(stepKey: JobStatus, currentStatus: JobStatus): "done" | "active" | "pending" {
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (currentIdx > stepIdx) return "done";
  if (currentIdx === stepIdx) return "active";
  return "pending";
}

export function ProgressTracker({ status, progress, step }: Props) {
  const { t } = useTranslation("common");

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">

      {/* Current step */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 text-center space-y-5 shadow-[0_0_40px_rgba(99,102,241,0.05)] border-indigo-500/10"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/30 blur-md rounded-full animate-pulse" />
            <div className="spinner relative z-10" style={{ width: 22, height: 22, borderWidth: 2.5, borderColor: "rgba(165,180,252,0.3)", borderTopColor: "#818cf8" }} />
          </div>
          <span className="text-sm font-semibold text-indigo-100 tracking-wide">{step}</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "circOut", duration: 0.5 }}
            />
            {/* Glossy overlay */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          </div>
          <p className="text-xs font-medium text-indigo-300/60 text-right tabular-nums">{progress}%</p>
        </div>
      </motion.div>

      {/* Steps list */}
      <div className="space-y-2.5">
        {STEPS.map(({ key, label_key, icon }, index) => {
          const state = getStepState(key, status);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border transition-all duration-500 ${
                state === "active"
                  ? "border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.02]"
                  : state === "done"
                  ? "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                  : "border-white/5 bg-white/2"
              }`}
            >
              {/* Icon/status dot */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base transition-all duration-300 ${
                  state === "done"
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                    : state === "active"
                    ? "bg-indigo-500/20 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                {state === "done" ? (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                ) : (
                  <span className={state === "pending" ? "opacity-20 grayscale" : "drop-shadow-sm"}>{icon}</span>
                )}
              </div>

              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  state === "active"
                    ? "text-white"
                    : state === "done"
                    ? "text-emerald-400/90"
                    : "text-white/25"
                }`}
              >
                {t(label_key)}
              </span>

              {state === "active" && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -3, 0], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
