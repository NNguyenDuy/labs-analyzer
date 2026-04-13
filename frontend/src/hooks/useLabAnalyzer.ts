// ============================================================
// API Client Hook
// useLabAnalyzer — upload PDF, poll job, return result
// ============================================================

import { useState, useCallback, useRef } from "react";
import type { JobStatusResponse, Language } from "../../../shared/types";

type AnalyzerState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "processing"; jobId: string; progress: number; step: string }
  | { phase: "done"; jobId: string; data: JobStatusResponse }
  | { phase: "error"; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const POLL_INTERVAL_MS = 2000;

export function useLabAnalyzer() {
  const [state, setState] = useState<AnalyzerState>({ phase: "idle" });
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    (jobId: string) => {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/job/${jobId}`);
          if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
          const data: JobStatusResponse = await res.json();

          if (data.status === "done") {
            stopPolling();
            setState({ phase: "done", jobId, data });
          } else if (data.status === "failed") {
            stopPolling();
            setState({ phase: "error", message: data.error ?? "Analysis failed" });
          } else {
            setState({
              phase: "processing",
              jobId,
              progress: data.progress,
              step: data.current_step,
            });
          }
        } catch (err) {
          console.error("Poll error:", err);
          // Don't stop polling on network error — retry
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling]
  );

  const analyze = useCallback(
    async (file: File, language: Language) => {
      stopPolling();
      setState({ phase: "uploading" });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language", language);

        const res = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Upload failed: ${res.status}`);
        }

        const { job_id } = await res.json();
        setState({ phase: "processing", jobId: job_id, progress: 0, step: "Queued..." });
        pollJob(job_id);
      } catch (err) {
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    [pollJob, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState({ phase: "idle" });
  }, [stopPolling]);

  return { state, analyze, reset };
}
