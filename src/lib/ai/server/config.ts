import "server-only";

// 服务端 AI 配置（docs/AI_CONTRACT.md §2.1、§2.4、§2.5）。
// Key 与 Workspace 只在本模块读取，不进入响应、日志、客户端或存档。

export type AiProviderMode = "bailian" | "mock";

export interface AiConfig {
  mode: AiProviderMode;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  maxInputChars: number;
  maxBodyBytes: number;
  ratePerMinute: number;
  maxConcurrent: number;
  callBudget: number;
}

export const AI_TIMEOUT_MS = 15000;
export const DEFAULT_MODEL_NAME = "decision-model-preview";
export const MOCK_MODEL_NAME = "mock-demo";

const DEFAULT_MAX_INPUT_CHARS = 30000;
const DEFAULT_MAX_BODY_BYTES = 32 * 1024 * 1024;
const DEFAULT_RATE_PER_MINUTE = 10;
const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_CALL_BUDGET = 200;

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonEmpty(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function resolveBaseUrl(env: NodeJS.ProcessEnv): string | null {
  const explicit = nonEmpty(env.MODEL_BASE_URL);
  if (explicit) {
    const url = explicit.replace(/\/+$/, "");
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url);
    if (url.startsWith("https://") || isLocal) return url;
    return null;
  }
  const workspace = nonEmpty(env.BAILIAN_WORKSPACE_ID);
  // 决策模型必须使用业务空间专属域名（北京地域；其他地域用 MODEL_BASE_URL 覆盖）
  if (workspace && /^[A-Za-z0-9-]+$/.test(workspace)) {
    return `https://${workspace}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`;
  }
  return null;
}

export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  return {
    mode: env.AI_PROVIDER_MODE === "mock" ? "mock" : "bailian",
    apiKey: nonEmpty(env.MODEL_API_KEY),
    baseUrl: resolveBaseUrl(env),
    modelName: nonEmpty(env.MODEL_NAME) ?? DEFAULT_MODEL_NAME,
    maxInputChars: positiveInt(env.AI_MAX_INPUT_CHARS, DEFAULT_MAX_INPUT_CHARS),
    maxBodyBytes: positiveInt(env.AI_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES),
    ratePerMinute: positiveInt(env.AI_RATE_LIMIT_PER_MINUTE, DEFAULT_RATE_PER_MINUTE),
    maxConcurrent: positiveInt(env.AI_MAX_CONCURRENT, DEFAULT_MAX_CONCURRENT),
    callBudget: positiveInt(env.AI_CALL_BUDGET, DEFAULT_CALL_BUDGET),
  };
}