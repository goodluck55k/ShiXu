// Edge Function 与 Next Route 共用的运行时配置接口。
// 具体环境读取分别由 functions/config.ts（Deno）和 src/lib/ai/server/config.ts（Node）实现。

export type AiProviderMode = "bailian" | "mock";

export interface EmotionProviderConfig {
  mode: AiProviderMode;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  timeoutMs: number;
}

export interface ProtectionLimits {
  ratePerMinute: number;
  maxConcurrent: number;
  callBudget: number;
}

export interface EmotionRuntimeConfig extends ProtectionLimits {
  // 总开关。Next 本地模式恒为 true；Edge 必须显式设置 AI_EDGE_ENABLED=1。
  enabled: boolean;
  provider: EmotionProviderConfig;
  maxInputChars: number;
  maxBodyBytes: number;
}

export type ProtectionRejection = "rate" | "concurrency" | "budget";

export interface EmotionProtection {
  tryAcquire(limits: ProtectionLimits, now: number): { ok: true } | { ok: false; rejection: ProtectionRejection };
  release(): void;
}
