import type { Analysis, AnalysisMeta } from "@/domain/types";

// 客户端与服务端共享的 /api/emotion  envelope 契约（docs/AI_CONTRACT.md 第 1–3 节）。
// 本文件不得导入任何服务端 provider 或密钥配置。

export const EMOTION_API_SCHEMA_VERSION = 1;
export const MAX_OPAQUE_ID_LENGTH = 100;

export interface EmotionApiRequest {
  schemaVersion: typeof EMOTION_API_SCHEMA_VERSION;
  requestId: string;
  entryId: string;
  inputRevision: number;
  text: string;
}

export const EMOTION_API_ERROR_CODES = [
  "INVALID_INPUT",
  "INPUT_TOO_LONG",
  "AI_UNAVAILABLE",
  "AI_UPSTREAM_ERROR",
  "AI_RATE_LIMITED",
  "AI_TIMEOUT",
  "AI_INVALID_OUTPUT",
] as const;

export type EmotionApiErrorCode = (typeof EMOTION_API_ERROR_CODES)[number];

export const EMOTION_API_ERROR_MESSAGES: Record<EmotionApiErrorCode, string> = {
  INVALID_INPUT: "请求内容不完整，请检查后重试，或直接手动选择心情。",
  INPUT_TOO_LONG: "无法分析全文，可手动选择心情并保存完整日记。",
  AI_UNAVAILABLE: "AI 识别暂时不可用，可手动选择心情并保存。",
  AI_UPSTREAM_ERROR: "识别暂时不可用，可手动选择心情或稍后再试。",
  AI_RATE_LIMITED: "识别请求过于频繁，请稍后再试，或手动选择心情。",
  AI_TIMEOUT: "识别超时，可手动选择心情或稍后再试。",
  AI_INVALID_OUTPUT: "识别结果无效，可手动选择心情并保存。",
};

export interface EmotionApiSuccess {
  ok: true;
  requestId: string;
  entryId: string;
  inputRevision: number;
  analysis: Analysis;
  needsConfirmation: true;
  analysisMeta?: AnalysisMeta;
}

export interface EmotionApiFailure {
  ok: false;
  requestId?: string;
  entryId?: string;
  inputRevision?: number;
  code: EmotionApiErrorCode;
  message: string;
}

export type EmotionApiResponse = EmotionApiSuccess | EmotionApiFailure;

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MOCK_PROVIDER_NAME = "bailian-mock";