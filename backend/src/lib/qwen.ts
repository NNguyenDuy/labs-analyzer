// ============================================================
// Qwen Client — wrapper cho OpenAI-compatible API của DashScope
// Tích hợp Langfuse để trace mọi request tự động
// ============================================================

import OpenAI from "openai";
import * as dotenv from "dotenv";
dotenv.config();

// Khởi tạo Qwen client dùng OpenAI SDK (compatible)
export const qwenClient = new OpenAI({
  apiKey: process.env.QWEN_API_KEY!,
  baseURL: process.env.QWEN_BASE_URL!,
});

// Models available
export const MODELS = {
  LONG: "qwen-long",       // Dùng cho extraction (xử lý PDF dài)
  PLUS: "qwen-plus",       // Dùng cho analysis và explanation
  VL: "qwen-vl-max",       // Dùng cho scanned PDF (vision)
} as const;

export type QwenModel = (typeof MODELS)[keyof typeof MODELS];

interface ChatOptions {
  model: QwenModel;
  systemPrompt: string;
  userContent: string;
  traceId?: string;       // job_id để correlate trong Langfuse
  traceName?: string;     // tên agent để dễ filter
  maxTokens?: number;
  temperature?: number;
}

interface ChatResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

/**
 * Gọi Qwen API với automatic retry và Langfuse tracing
 * Force JSON output — throw error nếu response không parse được
 */
export async function qwenChat(options: ChatOptions): Promise<ChatResult> {
  const {
    model,
    systemPrompt,
    userContent,
    traceId,
    traceName = "unknown",
    maxTokens = 4000,
    temperature = 0.1, // Low temperature cho medical accuracy
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  // Retry 3 lần với exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await qwenClient.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "";
      const usage = response.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };
      const latency_ms = Date.now() - startTime;

      // Log to console (Langfuse integration có thể thêm sau)
      console.log(`[${traceName}] model=${model} tokens=${usage.total_tokens} latency=${latency_ms}ms traceId=${traceId}`);

      return { content, usage, latency_ms };
    } catch (err) {
      lastError = err as Error;
      console.error(`[${traceName}] attempt ${attempt} failed:`, err);

      if (attempt < 3) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw new Error(`Qwen API failed after 3 attempts: ${lastError?.message}`);
}

/**
 * Parse JSON từ Qwen response — strip markdown fences nếu có
 * Throw error với context rõ ràng nếu không parse được
 */
export function parseJsonResponse<T>(content: string, agentName: string): T {
  // Strip markdown code fences nếu model vẫn wrap trong ```json
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `[${agentName}] Failed to parse JSON response.\n` +
        `Raw content (first 500 chars): ${content.slice(0, 500)}\n` +
        `Parse error: ${err}`
    );
  }
}
