import { EMOTION_LABELS, type Analysis, type AnalysisMeta, type EmotionLabel } from "../../../domain/types";
import { ANSWER_KEYS, DIMENSION_QUESTION_KEYS, SCORE_CRITERIA, type DimensionQuestionKey } from "./questions";

// 原生响应校验与显式映射（docs/AI_CONTRACT.md §2.3，映射版本 bailian-emotion-v1）。
// 纯函数，不依赖 IO；只逐字段构造内部对象，严禁展开原生响应合入状态。

export const MAPPING_VERSION = "bailian-emotion-v1";
export const SCORE_LEVELS = 3;

const NATIVE_META_KEYS = ["model", "request_id", "usage", "latency_ms"];
const CHOICE_ANSWER_KEYS = ["type", "choice", "confidence", "probabilities"];
const SCORE_ANSWER_KEYS = ["type", "score", "confidence", "legend", "probabilities"];
const SUM_TOLERANCE = 0.001;

export interface NativeChoiceAnswer {
  type: "choice";
  choice: EmotionLabel;
  confidence: number;
  probabilities: Record<EmotionLabel, number>;
}

export interface NativeScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
}

export interface NativeEmotionResponse {
  model: string;
  answers: {
    label: NativeChoiceAnswer;
    valence: NativeScoreAnswer;
    arousal: NativeScoreAnswer;
    dominance: NativeScoreAnswer;
    intensity: NativeScoreAnswer;
  };
}

export type NativeValidation =
  | { ok: true; native: NativeEmotionResponse }
  | { ok: false; reason: string };

export type AnalysisValidation =
  | { ok: true; analysis: Analysis }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isUnitInterval(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function distributionError(value: unknown, keys: readonly string[], path: string): string | null {
  if (!isRecord(value)) return `${path} 必须是对象`;
  if (!hasExactKeys(value, keys)) return `${path} 键集与请求选项不一致`;
  let sum = 0;
  for (const key of keys) {
    const item = value[key];
    if (!isUnitInterval(item)) return `${path}.${key} 必须是 0–1 的有限数`;
    sum += item;
  }
  if (Math.abs(sum - 1) > SUM_TOLERANCE) return `${path} 概率和超出 1±0.001`;
  return null;
}

function validateChoiceAnswer(value: unknown): { ok: true; answer: NativeChoiceAnswer } | { ok: false; reason: string } {
  if (!isRecord(value)) return { ok: false, reason: "answers.label 必须是对象" };
  if (!hasExactKeys(value, CHOICE_ANSWER_KEYS)) return { ok: false, reason: "answers.label 含未知或缺失字段" };
  if (value.type !== "choice") return { ok: false, reason: "answers.label.type 必须为 choice" };
  if (typeof value.choice !== "string" || !EMOTION_LABELS.includes(value.choice as EmotionLabel)) {
    return { ok: false, reason: "answers.label.choice 非法" };
  }
  if (!isUnitInterval(value.confidence)) return { ok: false, reason: "answers.label.confidence 必须是 0–1 的有限数" };
  const probError = distributionError(value.probabilities, EMOTION_LABELS, "answers.label.probabilities");
  if (probError) return { ok: false, reason: probError };
  const probabilities = value.probabilities as Record<EmotionLabel, number>;
  const max = Math.max(...EMOTION_LABELS.map((label) => probabilities[label]));
  if (probabilities[value.choice as EmotionLabel] < max - 1e-9) {
    return { ok: false, reason: "answers.label.choice 不是最高概率选项" };
  }
  return {
    ok: true,
    answer: {
      type: "choice",
      choice: value.choice as EmotionLabel,
      confidence: value.confidence,
      probabilities: Object.fromEntries(EMOTION_LABELS.map((label) => [label, probabilities[label]])) as Record<EmotionLabel, number>,
    },
  };
}

function validateScoreAnswer(
  value: unknown,
  key: DimensionQuestionKey,
): { ok: true; answer: NativeScoreAnswer } | { ok: false; reason: string } {
  const path = `answers.${key}`;
  const criteria = SCORE_CRITERIA[key];
  const levelKeys = criteria.map((_, index) => String(index));
  if (!isRecord(value)) return { ok: false, reason: `${path} 必须是对象` };
  if (!hasExactKeys(value, SCORE_ANSWER_KEYS)) return { ok: false, reason: `${path} 含未知或缺失字段` };
  if (value.type !== "score") return { ok: false, reason: `${path}.type 必须为 score` };
  if (!isFiniteNumber(value.score) || value.score < 0 || value.score > criteria.length - 1) {
    return { ok: false, reason: `${path}.score 越界` };
  }
  if (!isUnitInterval(value.confidence)) return { ok: false, reason: `${path}.confidence 必须是 0–1 的有限数` };
  if (!isRecord(value.legend) || !hasExactKeys(value.legend, levelKeys)) {
    return { ok: false, reason: `${path}.legend 键集与级数不一致` };
  }
  for (const [index, description] of criteria.entries()) {
    if (value.legend[String(index)] !== description) return { ok: false, reason: `${path}.legend 与所发描述不一致` };
  }
  const probError = distributionError(value.probabilities, levelKeys, `${path}.probabilities`);
  if (probError) return { ok: false, reason: probError };
  const probabilities = value.probabilities as Record<string, number>;
  const weighted = levelKeys.reduce((total, levelKey, index) => total + index * probabilities[levelKey], 0);
  if (Math.abs(value.score - weighted) > SUM_TOLERANCE) {
    return { ok: false, reason: `${path}.score 与概率加权值不一致` };
  }
  return {
    ok: true,
    answer: {
      type: "score",
      score: value.score,
      confidence: value.confidence,
      legend: Object.fromEntries(levelKeys.map((levelKey) => [levelKey, String((value.legend as Record<string, unknown>)[levelKey])])),
      probabilities: Object.fromEntries(levelKeys.map((levelKey) => [levelKey, probabilities[levelKey]])),
    },
  };
}

export function validateNativeResponse(value: unknown, expectedModel: string): NativeValidation {
  if (!isRecord(value)) return { ok: false, reason: "原生响应必须是对象" };
  const allowedKeys = ["answers", ...NATIVE_META_KEYS];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    return { ok: false, reason: "原生响应含未知字段" };
  }
  if (value.model !== expectedModel) return { ok: false, reason: "原生响应 model 与请求不一致" };
  if (value.request_id !== undefined && typeof value.request_id !== "string") {
    return { ok: false, reason: "request_id 元信息非法" };
  }
  if (value.latency_ms !== undefined && (!isFiniteNumber(value.latency_ms) || value.latency_ms < 0)) {
    return { ok: false, reason: "latency_ms 元信息非法" };
  }
  if (value.usage !== undefined) {
    if (!isRecord(value.usage) || !Object.values(value.usage).every(isFiniteNumber)) {
      return { ok: false, reason: "usage 元信息非法" };
    }
  }
  if (!isRecord(value.answers) || !hasExactKeys(value.answers, ANSWER_KEYS)) {
    return { ok: false, reason: "answers 必须恰含五个约定问题" };
  }
  const label = validateChoiceAnswer(value.answers.label);
  if (!label.ok) return label;
  const scores = {} as Record<DimensionQuestionKey, NativeScoreAnswer>;
  for (const key of DIMENSION_QUESTION_KEYS) {
    const result = validateScoreAnswer(value.answers[key], key);
    if (!result.ok) return result;
    scores[key] = result.answer;
  }
  return {
    ok: true,
    native: {
      model: expectedModel,
      answers: { label: label.answer, valence: scores.valence, arousal: scores.arousal, dominance: scores.dominance, intensity: scores.intensity },
    },
  };
}

export function mapNativeToAnalysis(native: NativeEmotionResponse): Analysis {
  const answers = native.answers;
  const divisor = SCORE_LEVELS - 1;
  return {
    schemaVersion: 1,
    label: answers.label.choice,
    valence: answers.valence.score / divisor,
    arousal: answers.arousal.score / divisor,
    dominance: answers.dominance.score / divisor,
    intensity: answers.intensity.score / divisor,
    confidence: Math.min(
      answers.label.confidence,
      answers.valence.confidence,
      answers.arousal.confidence,
      answers.dominance.confidence,
      answers.intensity.confidence,
    ),
  };
}

const ANALYSIS_KEYS = ["schemaVersion", "label", "valence", "arousal", "dominance", "intensity", "confidence"];

export function validateAnalysisStrict(value: unknown): AnalysisValidation {
  if (!isRecord(value)) return { ok: false, reason: "Analysis 必须是对象" };
  if (!hasExactKeys(value, ANALYSIS_KEYS)) return { ok: false, reason: "Analysis 含未知或缺失字段" };
  if (value.schemaVersion !== 1) return { ok: false, reason: "Analysis.schemaVersion 必须为 1" };
  if (typeof value.label !== "string" || !EMOTION_LABELS.includes(value.label as EmotionLabel)) {
    return { ok: false, reason: "Analysis.label 非法" };
  }
  for (const key of ["valence", "arousal", "dominance", "intensity", "confidence"]) {
    if (!isUnitInterval(value[key])) return { ok: false, reason: `Analysis.${key} 必须是 0–1 的有限数` };
  }
  return {
    ok: true,
    analysis: {
      schemaVersion: 1,
      label: value.label as EmotionLabel,
      valence: value.valence as number,
      arousal: value.arousal as number,
      dominance: value.dominance as number,
      intensity: value.intensity as number,
      confidence: value.confidence as number,
    },
  };
}

export function buildAnalysisMeta(provider: string, model: string): AnalysisMeta {
  return {
    provider,
    model,
    mappingVersion: MAPPING_VERSION,
    dimensionSources: {
      label: "choice",
      valence: "score",
      arousal: "score",
      dominance: "score",
      intensity: "score",
      confidence: "min-answer-confidence",
    },
  };
}

// 供 mock 与本地联调构造合法原生结构；mock 数据明确标识为演示用途
export function buildDemoNativeResponse(
  model: string,
  label: EmotionLabel,
  scores: Record<DimensionQuestionKey, number>,
  confidence: number,
): NativeEmotionResponse {
  const labelProbabilities = Object.fromEntries(
    EMOTION_LABELS.map((item) => [item, item === label ? 1 : 0]),
  ) as Record<EmotionLabel, number>;
  const buildScore = (key: DimensionQuestionKey): NativeScoreAnswer => {
    const criteria = SCORE_CRITERIA[key];
    const index = Math.round(scores[key]);
    return {
      type: "score",
      score: scores[key],
      confidence,
      legend: Object.fromEntries(criteria.map((description, i) => [String(i), description])),
      probabilities: Object.fromEntries(criteria.map((_, i) => [String(i), i === index ? 1 : 0])),
    };
  };
  return {
    model,
    answers: {
      label: { type: "choice", choice: label, confidence, probabilities: labelProbabilities },
      valence: buildScore("valence"),
      arousal: buildScore("arousal"),
      dominance: buildScore("dominance"),
      intensity: buildScore("intensity"),
    },
  };
}