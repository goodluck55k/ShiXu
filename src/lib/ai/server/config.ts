import "server-only";

import {
  AI_TIMEOUT_MS,
  DEFAULT_MODEL_NAME,
  nonEmpty,
  positiveInt,
  resolveBaseUrl,
} from "@edge/shared/config";

// 服务端 AI 配置（docs/AI_CONTRACT.md §2.1、§2.4、§2.5）。
// Key 与 Workspace 只在本模块读取，不进入响应、日志、客户端或存档。

export type AiProviderMode = "bailian" | "mock";

export interface AiConfig {
  mode: AiProviderMode;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  timeoutMs: number;
  maxInputChars: number;
  maxBodyBytes: number;
  ratePerMinute: number;
  maxConcurrent: number;
  callBudget: number;
}

const DEFAULT_MAX_INPUT_CHARS = 30000;
const DEFAULT_MAX_BODY_BYTES = 32 * 1024 * 1024;
const DEFAULT_RATE_PER_MINUTE = 10;
const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_CALL_BUDGET = 200;

export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  return {
    mode: env.AI_PROVIDER_MODE === "mock" ? "mock" : "bailian",
    apiKey: nonEmpty(env.MODEL_API_KEY),
    baseUrl: resolveBaseUrl(env.MODEL_BASE_URL, env.BAILIAN_WORKSPACE_ID),
    modelName: nonEmpty(env.MODEL_NAME) ?? DEFAULT_MODEL_NAME,
    timeoutMs: AI_TIMEOUT_MS,
    maxInputChars: positiveInt(env.AI_MAX_INPUT_CHARS, DEFAULT_MAX_INPUT_CHARS),
    maxBodyBytes: positiveInt(env.AI_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES),
    ratePerMinute: positiveInt(env.AI_RATE_LIMIT_PER_MINUTE, DEFAULT_RATE_PER_MINUTE),
    maxConcurrent: positiveInt(env.AI_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
    callBudget: positiveInt(env.AI_CALL_BUDGET, DEFAULT_CALL_BUDGET),
  };
}
