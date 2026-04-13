// ============================================================
// Langfuse Observability
// Trace mọi agent call để monitor accuracy + cost
// Dashboard: https://cloud.langfuse.com
// ============================================================

interface TraceEvent {
  traceId: string;
  name: string;
  input?: object;
  output?: object;
  model?: string;
  usage?: { promptTokens: number; completionTokens: number };
  metadata?: object;
  level?: "DEFAULT" | "WARNING" | "ERROR";
  startTime: Date;
  endTime?: Date;
}

const LANGFUSE_HOST = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
const LANGFUSE_SECRET = process.env.LANGFUSE_SECRET_KEY;
const LANGFUSE_PUBLIC = process.env.LANGFUSE_PUBLIC_KEY;

const isConfigured = Boolean(LANGFUSE_SECRET && LANGFUSE_PUBLIC);

if (!isConfigured) {
  console.warn("[Langfuse] Not configured — observability disabled. Set LANGFUSE_SECRET_KEY + LANGFUSE_PUBLIC_KEY");
}

/**
 * Log a generation event to Langfuse
 * Non-blocking — failures are silently ignored to not affect pipeline
 */
export async function langfuseLog(event: TraceEvent): Promise<void> {
  if (!isConfigured) return;

  try {
    const body = {
      batch: [
        {
          id: `${event.traceId}-${event.name}-${Date.now()}`,
          type: "generation",
          body: {
            traceId: event.traceId,
            name: event.name,
            model: event.model,
            input: event.input,
            output: event.output,
            usage: event.usage
              ? {
                  promptTokens: event.usage.promptTokens,
                  completionTokens: event.usage.completionTokens,
                  totalTokens: event.usage.promptTokens + event.usage.completionTokens,
                }
              : undefined,
            metadata: event.metadata,
            level: event.level ?? "DEFAULT",
            startTime: event.startTime.toISOString(),
            endTime: (event.endTime ?? new Date()).toISOString(),
          },
        },
      ],
    };

    await fetch(`${LANGFUSE_HOST}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${LANGFUSE_PUBLIC}:${LANGFUSE_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000), // 3s timeout — don't block pipeline
    });
  } catch {
    // Silently ignore — observability failure must never break the pipeline
  }
}

/**
 * Create a trace wrapper for an agent
 * Usage:
 *   const trace = createAgentTrace("agent1-extractor", jobId);
 *   const result = await someQwenCall(...);
 *   await trace.finish(result);
 */
export function createAgentTrace(agentName: string, traceId: string) {
  const startTime = new Date();

  return {
    async finish(output?: object, usage?: TraceEvent["usage"], model?: string) {
      await langfuseLog({
        traceId,
        name: agentName,
        output,
        usage,
        model,
        startTime,
        endTime: new Date(),
      });
    },
    async error(err: Error) {
      await langfuseLog({
        traceId,
        name: agentName,
        output: { error: err.message },
        level: "ERROR",
        startTime,
        endTime: new Date(),
      });
    },
  };
}
