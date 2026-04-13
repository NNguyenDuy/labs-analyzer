// ============================================================
// ProgressTracker Component
// Visual step-by-step progress khi pipeline đang chạy
// ============================================================

import { useTranslation } from "next-i18next";
import { Loader2, Check } from "lucide-react";
import type { JobStatus } from "../../../shared/types";

interface Props {
  status: JobStatus;
  progress: number;
  step: string;
}

const STEPS: { key: JobStatus; label_key: string }[] = [
  { key: "extracting",  label_key: "progress.extracting" },
  { key: "normalizing", label_key: "progress.normalizing" },
  { key: "analyzing",   label_key: "progress.analyzing" },
  { key: "explaining",  label_key: "progress.explaining" },
  { key: "qa_check",    label_key: "progress.qa_check" },
];

const STATUS_ORDER: JobStatus[] = [
  "queued", "extracting", "normalizing", "analyzing", "explaining", "qa_check", "done"
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
    <div className="w-full max-w-xl mx-auto space-y-6">

      {/* Current step label */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-gray-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">{step}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="space-y-2">
        {STEPS.map(({ key, label_key }) => {
          const state = getStepState(key, status);
          return (
            <div key={key} className="flex items-center gap-3">
              <div className={`
                w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                ${state === "done"    ? "bg-green-500" : ""}
                ${state === "active"  ? "bg-gray-900 animate-pulse" : ""}
                ${state === "pending" ? "bg-gray-100 border border-gray-200" : ""}
              `}>
                {state === "done" && <Check className="w-3 h-3 text-white" />}
                {state === "active" && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className={`text-sm ${
                state === "active"  ? "text-gray-900 font-medium" :
                state === "done"    ? "text-green-700" :
                "text-gray-400"
              }`}>
                {t(label_key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
