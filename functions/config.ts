import { DEFAULT_MODEL_NAME, nonEmpty, positiveInt, resolveBaseUrl } from "./shared/config.ts";
import type { EmotionRuntimeConfig } from "./shared/types.ts";

// Qoder Sites Edge Function 配置。
// Secret 只由 Deno.env 读取，不进入响应、日志或静态产物。
// 真实百炼调用必须显式设置 AI_EDGE_ENABLED=1；默认关闭，避免公开接口无限消耗账号额度。

const DEFAULT_MAX_INPUT_CHARS = 30000;
const DEFAULT_EDGE_MAX_BODY_BYTES = 1024 * 1024;
const MAX_EDGE_MAX_BODY_BYTES = 4 * 1024 * 1024;
const DEFAULT_RATE_PER_MINUTE = 10;
const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_CALL_BUDGET = 100;
const TIMEOUT_MS = 15000;

interface DenoRuntimeLike {
  env?: { get(name: string): string | undefined };
}

function denoEnv(name: string): string | undefined {
  return (globalThis as { Deno?: DenoRuntimeLike }).Deno?.env?.get(name);
}

export function readEdgeConfig(getEnv: (name: string) => string | undefined = denoEnv): EmotionRuntimeConfig {
  const maxBodyBytes = positiveInt(getEnv("AI_EDGE_MAX_BODY_BYTES"), DEFAULT_EDGE_MAX_BODY_BYTES);
  return {
    enabled: getEnv("AI_EDGE_ENABLED") === "1",
    provider: {
      // Edge 生产入口固定真实 Provider；演示数据只允许在本地测试中显式构造。
      mode: "bailian",
      apiKey: nonEmpty(getEnv("MODEL_API_KEY")),
      baseUrl: resolveBaseUrl(getEnv("MODEL_BASE_URL"), getEnv("BAILIAN_WORKSPACE_ID")),
      modelName: nonEmpty(getEnv("MODEL_NAME")) ?? DEFAULT_MODEL_NAME,
      timeoutMs: TIMEOUT_MS,
    },
    maxInputChars: positiveInt(getEnv("AI_MAX_INPUT_CHARS"), DEFAULT_MAX_INPUT_CHARS),
    maxBodyBytes: Math.min(maxBodyBytes, MAX_EDGE_MAX_BODY_BYTES),
    ratePerMinute: positiveInt(getEnv("AI_RATE_LIMIT_PER_MINUTE"), DEFAULT_RATE_PER_MINUTE),
    maxConcurrent: positiveInt(getEnv("AI_MAX_CONCURRENT"), DEFAULT_MAX_CONCURRENT),
    callBudget: positiveInt(getEnv("AI_CALL_BUDGET"), DEFAULT_CALL_BUDGET),
  };
}
