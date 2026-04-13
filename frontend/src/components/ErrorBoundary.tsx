// ============================================================
// ErrorBoundary + Skeleton components
// ============================================================

import React from "react";
import { useTranslation } from "next-i18next";

// ── Error Boundary ────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  state: EBState = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto py-20 text-center space-y-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-red-600 font-bold">!</span>
          </div>
          <p className="text-sm text-gray-600">Something went wrong.</p>
          <p className="text-xs text-gray-400">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="text-sm underline text-gray-500 hover:text-gray-900"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Skeleton loaders ──────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-100 rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

export function ResultsSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-10" aria-label="Loading results...">
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>

      {/* Summary skeleton */}
      <div className="space-y-2 p-5 border border-gray-100 rounded-2xl">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      {/* Test cards skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="text-center py-16 space-y-3">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
        <span className="text-gray-400 text-xl">?</span>
      </div>
      <p className="text-sm text-gray-500">{t("errors.no_tests")}</p>
      <button
        onClick={onReset}
        className="text-sm underline text-gray-500 hover:text-gray-900"
      >
        {t("results.new_report")}
      </button>
    </div>
  );
}
