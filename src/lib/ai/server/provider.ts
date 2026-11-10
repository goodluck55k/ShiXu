import "server-only";

import type { EmotionLabel } from "../../../domain/types";
import { EMOTION_API_ERROR_MESSAGES } from "../contract";
import { AI_TIMEOUT_MS, MOCK_MODEL_NAME, type AiConfig } from "./config";
import { buildDemoNativeResponse } from "./native";
import { buildEmotionQuestions } from "./questions";

// 百炼决策模型 Provider 适配器：只调用服务端接口，把原生响应交给 native.ts 校验映射。
// 不导入任何游戏写入模块；不自动重试；错误细节不回传客户端。

export type ProviderErrorKind = "timeout" | "unavailable" | "upstream" | "input-too-long" | "invalid-output";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;

  constructor(kind: ProviderErrorKind) {
    super(EMOTION_API_ERROR_MESSAGES[providerErrorCode(kind)]);
    this.kind = kind;
  }
}

export function providerErrorCode(kind: ProviderErrorKind): "AI_TIMEOUT" | "AI_UNAVAILABLE" | "AI_UPSTREAM_ERROR" | "INPUT_TOO_LONG" | "AI_INVALID_OUTPUT" {
  switch (kind) {
    case "timeout": return "AI_TIMEOUT";
    case "unavailable": return "AI_UNAVAILABLE";
    case "input-too-long": return "INPUT_TOO_LONG";
    case "invalid-output": return "AI_INVALID_OUTPUT";
    case "upstream": return "AI_UPSTREAM_ERROR";
  }
}

interface DemoPreset {
  match: RegExp;
  label: EmotionLabel;
  scores: { valence: number; arousal: number; dominance: number; intensity: number };
  confidence: number;
}

// 明确标识的演示数据（mock）：走与真实响应相同的原生校验与映射路径，不宣称真实识别
const DEMO_PRESETS: DemoPreset[] = [
  { match: /开心|高兴|快乐|喜悦|终于/, label: "joy", scores: { valence: 2, arousal: 1, dominance: 2, intensity: 2 }, confidence: 0.9 },
  { match: /难过|伤心|失落|想哭|悲伤/, label: "sadness", scores: { valence: 0, arousal: 0, dominance: 1, intensity: 2 }, confidence: 0.85 },
  { match: /焦虑|担心|紧张|不安/, label: "anxiety", scores: { valence: 0, arousal: 2, dominance: 0, intensity: 2 }, confidence: 0.8 },
  { match: /生气|愤怒|恼火|气愤/, label: "anger", scores: { valence: 0, arousal: 2, dominance: 1, intensity: 2 }, confidence: 0.85 },
  { match: /累|疲惫|乏力|困/, label: "tired", scores: { valence: 1, arousal: 0, dominance: 1, intensity: 1 }, confidence: 0.8 },
  { match: /安心|放松|平静|踏实/, label: "calm", scores: { valence: 1, arousal: 0, dominance: 1, intensity: 1 }, confidence: 0.85 },
];

function mockNativeResponse(text: string): unknown {
  const preset = DEMO_PRESETS.find((item) => item.match.test(text));
  if (preset) {
    return buildDemoNativeResponse(MOCK_MODEL_NAME, preset.label, preset.scores, preset.confidence);
  }
  return buildDemoNativeResponse(
    MOCK_MODEL_NAME,
    "mixed",
    { valence: 1, arousal: 1, dominance: 1, intensity: 1 },
    0.45,
  );
}

function classifyUpstreamError(status: number, body: unknown): ProviderErrorKind {
  let code = "";
  let message = "";
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    const error = record.error;
    if (typeof error === "object" && error !== null) {
      const errorRecord = error as Record<string, unknown>;
      if (typeof errorRecord.code === "string") code = errorRecord.code;
      if (typeof errorRecord.message === "string") message = errorRecord.message;
    }
    if (!code && typeof record.code === "string") code = record.code;
    if (!message && typeof record.message === "string") message = record.message;
  }
  if (status === 401 || status === 403 || status === 404) return "unavailable";
  if (/Arrearage|InvalidApiKey|AccessDenied|ModelNotFound|Model\.NotExist/i.test(code)) return "unavailable";
  if (status === 400 && /input|token|length|context|too\s*long/i.test(`${code} ${message}`)) return "input-too-long";
  return "upstream";
}

export async function requestEmotionNative(text: string, config: AiConfig): Promise<unknown> {
  if (config.mode === "mock") return mockNativeResponse(text);
  if (!config.apiKey || !config.baseUrl) throw new ProviderError("unavailable");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/systemone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model: config.modelName, state: text, questions: buildEmotionQuestions() }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    if (controller.signal.aborted) throw new ProviderError("timeout");
    throw new ProviderError("upstream");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ProviderError(classifyUpstreamError(response.status, body));
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ProviderError("invalid-output");
  }
}