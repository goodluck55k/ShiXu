import { handleEmotionRequest } from "@edge/shared/handler";
import { createInMemoryProtection } from "@edge/shared/protection";
import type { EmotionRuntimeConfig } from "@edge/shared/types";
import { readAiConfig, type AiConfig } from "@/lib/ai/server/config";
import { requestEmotionNative } from "@/lib/ai/server/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 本地/自托管 Node 模式的适配层：请求解析、校验、映射与响应由共享实现统一处理。
const protection = createInMemoryProtection();

function toRuntimeConfig(config: AiConfig): EmotionRuntimeConfig {
  return {
    enabled: true,
    provider: {
      mode: config.mode,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      modelName: config.modelName,
      timeoutMs: config.timeoutMs,
    },
    maxInputChars: config.maxInputChars,
    maxBodyBytes: config.maxBodyBytes,
    ratePerMinute: config.ratePerMinute,
    maxConcurrent: config.maxConcurrent,
    callBudget: config.callBudget,
  };
}

export async function POST(request: Request): Promise<Response> {
  return handleEmotionRequest(request, {
    config: toRuntimeConfig(readAiConfig()),
    protection,
    provider: requestEmotionNative,
  });
}
