import type { EmotionDimensions, EmotionLabel, EmotionReading } from "./types";

export const MANUAL_EMOTION_DEFAULTS: Record<EmotionLabel, EmotionDimensions> = {
  joy: { valence: 0.85, arousal: 0.7, dominance: 0.7, intensity: 0.7 },
  calm: { valence: 0.7, arousal: 0.25, dominance: 0.65, intensity: 0.4 },
  sadness: { valence: 0.2, arousal: 0.25, dominance: 0.35, intensity: 0.7 },
  anxiety: { valence: 0.25, arousal: 0.8, dominance: 0.25, intensity: 0.7 },
  anger: { valence: 0.2, arousal: 0.85, dominance: 0.65, intensity: 0.8 },
  tired: { valence: 0.4, arousal: 0.15, dominance: 0.35, intensity: 0.5 },
  mixed: { valence: 0.5, arousal: 0.5, dominance: 0.5, intensity: 0.6 },
  neutral: { valence: 0.5, arousal: 0.5, dominance: 0.5, intensity: 0.3 },
  unknown: { valence: 0.5, arousal: 0.5, dominance: 0.5, intensity: 0.3 },
};

export function createManualEmotion(
  label: EmotionLabel,
  dimensions: EmotionDimensions = MANUAL_EMOTION_DEFAULTS[label],
): EmotionReading {
  return { label, ...dimensions, confidence: null, source: "manual" };
}