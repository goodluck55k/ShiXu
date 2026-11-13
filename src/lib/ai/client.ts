import { EMOTION_LABELS, type Analysis, type AnalysisMeta } from "../../domain/types";
import {
  EMOTION_API_ERROR_CODES,
  EMOTION_API_ERROR_MESSAGES,
  type EmotionApiErrorCode,
} from "./contract";

// 浏览器侧识别会话与响应校验（docs/AI_CONTRACT.md §1、§3）。
// 只处理已返回的响应；不导入服务端 Provider、配置或密钥。

export interface AnalysisSession {
  requestId: string;
  entryId: string;
  inputRevision: number;
  text: string;
}

export interface EmotionSuggestion {
  analysis: Analysis;
  analysisMeta: AnalysisMeta | null;
}

export interface EmotionAnalysisError {
  code: EmotionApiErrorCode;
  message: string;
}

export type EmotionResponseOutcome =
  | { kind: "ignore" }
  | { kind: "error"; error: EmotionAnalysisError }
  | { kind: "success"; suggestion: EmotionSuggestion };

const ANALYSIS_KEYS = ["schemaVersion", "label", "valence", "arousal", "dominance", "intensity", "confidence"];
const META_KEYS = ["provider", "model", "mappingVersion", "dimensionSources"];
const DIMENSION_SOURCE_KEYS = ["label", "valence", "arousal", "dominance", "intensity", "confidence"];
const ERROR_CODES = new Set<string>(EMOTION_API_ERROR_CODES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function toAnalysis(value: unknown): Analysis | null {
  if (!isRecord(value) || !hasExactKeys(value, ANALYSIS_KEYS)) return null;
  if (value.schemaVersion !== 1) return null;
  if (typeof value.label !== "string" || !EMOTION_LABELS.includes(value.label as never)) return null;
  if (
    !isUnitInterval(value.valence) ||
    !isUnitInterval(value.arousal) ||
    !isUnitInterval(value.dominance) ||
    !isUnitInterval(value.intensity) ||
    !isUnitInterval(value.confidence)
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    label: value.label as Analysis["label"],
    valence: value.valence,
    arousal: value.arousal,
    dominance: value.dominance,
    intensity: value.intensity,
    confidence: value.confidence,
  };
}

export function toAnalysisMeta(value: unknown): AnalysisMeta | null {
  if (!isRecord(value) || !hasExactKeys(value, META_KEYS)) return null;
  if (!isNonEmptyString(value.provider) || !isNonEmptyString(value.model) || !isNonEmptyString(value.mappingVersion)) {
    return null;
  }
  const sources = value.dimensionSources;
  if (!isRecord(sources) || !hasExactKeys(sources, DIMENSION_SOURCE_KEYS)) return null;
  if (!DIMENSION_SOURCE_KEYS.every((key) => isNonEmptyString(sources[key]))) return null;
  return {
    provider: value.provider,
    model: value.model,
    mappingVersion: value.mappingVersion,
    dimensionSources: Object.fromEntries(
      DIMENSION_SOURCE_KEYS.map((key) => [key, sources[key] as string]),
    ),
  };
}

export function errorFromHttpStatus(status: number): EmotionAnalysisError {
  const code: EmotionApiErrorCode =
    status === 400
      ? "INVALID_INPUT"
      : status === 413
        ? "INPUT_TOO_LONG"
        : status === 429
          ? "AI_RATE_LIMITED"
          : status === 503
            ? "AI_UNAVAILABLE"
            : status === 504
              ? "AI_TIMEOUT"
              : "AI_UPSTREAM_ERROR";
  return { code, message: EMOTION_API_ERROR_MESSAGES[code] };
}

const CORRELATION_KEYS = ["requestId", "entryId", "inputRevision"] as const;

function matchesTriple(payload: Record<string, unknown>, session: AnalysisSession): boolean {
  return (
    payload.requestId === session.requestId &&
    payload.entryId === session.entryId &&
    payload.inputRevision === session.inputRevision
  );
}

// 请求体超限等解析前失败可能不带三元组；只要已有字段不与当前会话冲突，
// 就按当前请求处理。调用方保证 evaluate 只接收仍有效的会话，旧响应在更早处丢弃。
function conflictsWithSession(payload: Record<string, unknown>, session: AnalysisSession): boolean {
  return CORRELATION_KEYS.some((key) => key in payload && payload[key] !== session[key]);
}

export function evaluateEmotionResponse(
  payload: unknown,
  status: number,
  session: AnalysisSession,
): EmotionResponseOutcome {
  if (!isRecord(payload) || typeof payload.ok !== "boolean") {
    return { kind: "error", error: errorFromHttpStatus(status) };
  }

  if (payload.ok) {
    // 成功 envelope 必须完整回传匹配三元组，且 HTTP 状态必须为 2xx。
    if (!matchesTriple(payload, session)) return { kind: "ignore" };
    if (status < 200 || status >= 300) {
      return { kind: "error", error: errorFromHttpStatus(status) };
    }
    if (payload.needsConfirmation !== true) {
      return { kind: "error", error: { code: "AI_INVALID_OUTPUT", message: EMOTION_API_ERROR_MESSAGES.AI_INVALID_OUTPUT } };
    }
    const analysis = toAnalysis(payload.analysis);
    const rawMeta = payload.analysisMeta;
    const analysisMeta = rawMeta === undefined || rawMeta === null ? null : toAnalysisMeta(rawMeta);
    if (!analysis || (rawMeta !== undefined && rawMeta !== null && !analysisMeta)) {
      return { kind: "error", error: { code: "AI_INVALID_OUTPUT", message: EMOTION_API_ERROR_MESSAGES.AI_INVALID_OUTPUT } };
    }
    return { kind: "success", suggestion: { analysis, analysisMeta } };
  }

  // 失败响应：带出的关联字段必须与当前会话一致；完全不带三元组的解析前失败
  // （如请求体超限）仍按当前请求映射固定错误码。
  if (conflictsWithSession(payload, session)) return { kind: "ignore" };
  const code =
    typeof payload.code === "string"
      ? ERROR_CODES.has(payload.code)
        ? (payload.code as EmotionApiErrorCode)
        : "AI_UPSTREAM_ERROR"
      : (status >= 400 ? errorFromHttpStatus(status).code : "AI_UPSTREAM_ERROR");
  return { kind: "error", error: { code, message: EMOTION_API_ERROR_MESSAGES[code] } };
}

// 会话序号单调递增；新请求、正文编辑、手选、保存或取消都会使旧会话失效。
export class AnalysisSessionTracker {
  private current: AnalysisSession | null = null;
  private revision = 0;

  begin(requestId: string, entryId: string, text: string): AnalysisSession {
    this.revision += 1;
    const session: AnalysisSession = { requestId, entryId, inputRevision: this.revision, text };
    this.current = session;
    return session;
  }

  isActive(session: AnalysisSession): boolean {
    return this.current === session;
  }

  invalidate(): void {
    this.current = null;
    this.revision += 1;
  }
}
