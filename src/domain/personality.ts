import { getPersonalityRule, PERSONALITY_V2 } from "@/config/personality";
import type { EmotionLabel } from "./types";

export const DIMENSIONS = ["gentleness", "curiosity", "cheerfulness", "fearfulness", "low_mood"] as const;
export type DimensionId = (typeof DIMENSIONS)[number];
export type DominantId = DimensionId;
export type DimensionScores = Record<DimensionId, number>;
export interface PersonalityContribution { dayKey: string; label: EmotionLabel; entryRevision: number; deltas: DimensionScores; rulesVersion: string }
export interface PersonalityState { contributions: Record<string, PersonalityContribution>; dominantId: DimensionId | null; rulesVersion: string }
export interface PersonalitySnapshot { scores: DimensionScores; dominantId: DimensionId; dominantDescription: string; descriptions: Record<DimensionId, string>; rulesVersion: string }
export interface PersonalityRuleConfig {
  rulesVersion: string; dimensions: Array<{ id: DimensionId; label: string; description: string }>;
  dominantPriority: DimensionId[]; initialScore: number; minScore: number; maxScore: number; perSaveCap: number; dailyNetCap: number;
  intensityBands: { lowExclusive: number; highInclusive: number; factors: [number, number, number] };
  roomFactor: number; emotionDeltas: Record<EmotionLabel, DimensionScores>;
  descriptions: Record<DimensionId, { low: string; balanced: string; high: string }>;
  bands: { lowMax: number; highMin: number }; rounding: "half-away-from-zero";
}
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function createEmptyPersonality(): PersonalityState { return { contributions: {}, dominantId: null, rulesVersion: PERSONALITY_V2.rulesVersion }; }
export function resolveDominant(scores: DimensionScores, previous: DimensionId | null, priority: DimensionId[]): DimensionId {
  const max = Math.max(...DIMENSIONS.map(d => scores[d]));
  if (previous && scores[previous] === max) return previous;
  return priority.find(d => scores[d] === max)!;
}
export function derivePersonality(state: PersonalityState, config: PersonalityRuleConfig = PERSONALITY_V2): PersonalitySnapshot {
  // v3 保存级初始分和上下限固定为 v2，不能随着后续结算版本变化。
  const scores = {} as DimensionScores;
  const descriptions = {} as Record<DimensionId, string>;
  for (const d of DIMENSIONS) {
    scores[d] = clamp(PERSONALITY_V2.initialScore + Object.values(state.contributions).reduce((sum, c) => sum + c.deltas[d], 0), PERSONALITY_V2.minScore, PERSONALITY_V2.maxScore);
    const band = scores[d] <= config.bands.lowMax ? "low" : scores[d] >= config.bands.highMin ? "high" : "balanced";
    descriptions[d] = config.descriptions[d][band];
  }
  const dominantId = resolveDominant(scores, state.dominantId, config.dominantPriority);
  return { scores, dominantId, dominantDescription: descriptions[dominantId], descriptions, rulesVersion: state.rulesVersion };
}
export const getDimensionScore = (snapshot: PersonalitySnapshot, dimension: DimensionId): number => snapshot.scores[dimension];
export const describeDominantPersonality = (snapshot: PersonalitySnapshot): string => snapshot.dominantDescription;
export function buildContribution(dayKey: string, label: EmotionLabel, intensity: number, entryRevision: number, contributions: Record<string, PersonalityContribution>, config: PersonalityRuleConfig): PersonalityContribution {
  const deltas = {} as DimensionScores;
  const factor = intensity < config.intensityBands.lowExclusive ? config.intensityBands.factors[0] : intensity <= config.intensityBands.highInclusive ? config.intensityBands.factors[1] : config.intensityBands.factors[2];
  for (const d of DIMENSIONS) {
    const day = Object.values(contributions).reduce((sum, c) => sum + (c.dayKey === dayKey ? c.deltas[d] : 0), 0);
    const value = config.emotionDeltas[label][d] * factor * config.roomFactor;
    const rounded = Math.sign(value) * Math.round(Math.abs(value));
    const lower = Math.min(0, Math.max(-config.perSaveCap, -config.dailyNetCap - day));
    const upper = Math.max(0, Math.min(config.perSaveCap, config.dailyNetCap - day));
    deltas[d] = clamp(clamp(rounded, -config.perSaveCap, config.perSaveCap), lower, upper) || 0;
  }
  return { dayKey, label, entryRevision, deltas, rulesVersion: config.rulesVersion };
}
export function addContribution(state: PersonalityState, entryId: string, dayKey: string, label: EmotionLabel, intensity: number, revision: number): PersonalityState | null {
  const config = getPersonalityRule(state.rulesVersion);
  if (!config || state.contributions[entryId]) return null;
  const next = { ...state, contributions: { ...state.contributions, [entryId]: buildContribution(dayKey, label, intensity, revision, state.contributions, config) } };
  return { ...next, dominantId: derivePersonality(next, config).dominantId };
}
export function canCorrectContribution(state: PersonalityState, entryId: string): boolean {
  const contribution = state.contributions[entryId];
  return !contribution || !!getPersonalityRule(contribution.rulesVersion);
}
export function reviseContribution(state: PersonalityState, entryId: string, label: EmotionLabel, intensity: number, revision: number): PersonalityState | null {
  const old = state.contributions[entryId];
  if (!old) return state;
  const config = getPersonalityRule(old.rulesVersion);
  if (!config) return null;
  const remaining = { ...state.contributions }; delete remaining[entryId];
  const next = { ...state, contributions: { ...state.contributions, [entryId]: buildContribution(old.dayKey, label, intensity, revision, remaining, config) } };
  return { ...next, dominantId: derivePersonality(next, getPersonalityRule(state.rulesVersion) ?? PERSONALITY_V2).dominantId };
}
