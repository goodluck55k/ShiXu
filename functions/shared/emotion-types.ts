// AI 契约共享的情绪标签与数据类型。
// Next.js Route Handler 与 Qoder Sites Edge Function 共用，避免两套识别契约漂移；
// 本文件不含 IO、环境变量或服务端密钥，类型可被客户端安全引用。

export const EMOTION_LABELS = [
  "joy",
  "calm",
  "sadness",
  "anxiety",
  "anger",
  "tired",
  "mixed",
  "neutral",
  "unknown",
] as const;

export type EmotionLabel = (typeof EMOTION_LABELS)[number];

export interface EmotionDimensions {
  valence: number;
  arousal: number;
  dominance: number;
  intensity: number;
}

export interface Analysis extends EmotionDimensions {
  schemaVersion: 1;
  label: EmotionLabel;
  confidence: number;
}

export interface AnalysisMeta {
  provider: string;
  model: string;
  mappingVersion: string;
  dimensionSources: Record<string, string>;
}
