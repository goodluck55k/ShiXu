import { BEHAVIOR_V2 } from "@/config/behavior";
import type { DimensionId, PersonalitySnapshot } from "./personality";
import type { EmotionLabel, EmotionReading } from "./types";

export const BEHAVIOR_IDS = [
  "idle_breathe",
  "idle_glance",
  "gentle_wave",
  "quiet_sit",
  "knee_rest",
  "gentle_gaze",
  "look_around",
  "observe_object",
  "wander_explore",
  "approach_novel",
  "bounce",
  "spin",
  "greet",
  "happy_sway",
  "curl_up",
  "corner_hide",
  "hesitant_approach",
  "step_back",
  "blank_stare",
  "sit_alone",
  "slow_walk",
  "window_gaze",
  "drink",
  "smoke",
  "respond_call",
  "respond_pat",
  "respond_observe",
] as const;

export type BehaviorId = (typeof BEHAVIOR_IDS)[number];
export type BehaviorCategory = "ambient" | "dominant" | "special" | "interaction";
export type TimeBand = "morning" | "afternoon" | "evening" | "night";
export type InteractionType = "call" | "pat" | "observe";

export interface InteractionEvent {
  id: string;
  type: InteractionType;
  occurredAt: number;
  seed: number;
}

export interface BehaviorContext {
  personality: PersonalitySnapshot;
  emotion: EmotionReading | null;
  interaction: InteractionEvent | null;
  specialEligible: boolean;
  dayKey: string;
  timeBand: TimeBand;
  sequence: number;
  seed: number;
  lastBehaviorId: BehaviorId | null;
  consecutiveCount: number;
}

export interface BehaviorDecision {
  behaviorId: BehaviorId;
  category: BehaviorCategory;
  dominantId: DimensionId;
  pose: string;
  expression: string;
  animation: string;
  amplitude: number;
  durationMs: number;
  reasonCode: string;
}

export interface BehaviorDefinition {
  id: BehaviorId;
  label: string;
  category: BehaviorCategory;
  dominantId?: DimensionId;
  interactionType?: InteractionType;
  baseWeight: number;
  pose: string;
  expression: string;
  animation: string;
  durationMs: number;
}

export interface BehaviorRuleConfig {
  rulesVersion: string;
  behaviors: BehaviorDefinition[];
  ambientShare: number;
  specialBehaviorEnabled: boolean;
  specialProbability: number;
  special: {
    dominantId: "low_mood";
    behaviors: Array<{ id: "drink" | "smoke"; baseWeight: number }>;
    streakDaysRequired: number;
    lowMoodEmotionLabels: EmotionLabel[];
    dayFourSemantics: "A" | "B";
  };
  minShare: number;
  maxConsecutive: number;
  tickIntervalMs: [number, number];
  interactionDurationMs: [number, number];
  saveFeedbackDurationMs: number;
  emotionExpression: Record<EmotionLabel, { expression: string; intensity: number }>;
  ambientTimeWeights: Record<TimeBand, Partial<Record<BehaviorId, number>>>;
}

function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBehaviorRng(seed: number, dayKey: string, sequence: number, rulesVersion: string): () => number {
  return mulberry32(hashString(`${rulesVersion}|${seed}|${dayKey}|${sequence}`));
}

interface Candidate {
  def: BehaviorDefinition;
  weight: number;
}

// minShare 以权重下限实现：floor 公式保证归一化后每个候选的份额不低于 minShare。
function pickWeighted(candidates: Candidate[], minShare: number, rng: () => number): Candidate {
  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  const denominator = 1 - minShare * candidates.length;
  const floor = denominator > 0 ? (minShare * total) / denominator : 0;
  const effective = candidates.map((c) => Math.max(c.weight, floor));
  const sum = effective.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < candidates.length; i++) {
    r -= effective[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export function selectBehavior(context: BehaviorContext, config: BehaviorRuleConfig = BEHAVIOR_V2): BehaviorDecision {
  const rng = createBehaviorRng(context.seed, context.dayKey, context.sequence, config.rulesVersion);
  const dominantId = context.personality.dominantId;
  const emotionMapping = context.emotion ? config.emotionExpression[context.emotion.label] : null;

  const finish = (def: BehaviorDefinition, category: BehaviorCategory, reasonCode: string, durationMs: number): BehaviorDecision => ({
    behaviorId: def.id,
    category,
    dominantId,
    pose: def.pose,
    expression: emotionMapping ? emotionMapping.expression : def.expression,
    animation: def.animation,
    amplitude: emotionMapping ? emotionMapping.intensity : 1,
    durationMs,
    reasonCode,
  });

  if (context.interaction) {
    const def = config.behaviors.find((b) => b.category === "interaction" && b.interactionType === context.interaction!.type);
    if (def) {
      const [min, max] = config.interactionDurationMs;
      return finish(def, "interaction", "interaction", min + Math.floor(rng() * (max - min + 1)));
    }
  }

  let candidates: Candidate[];
  let category: BehaviorCategory;
  let reasonCode: string;

  if (
    config.specialBehaviorEnabled &&
    context.specialEligible &&
    dominantId === config.special.dominantId &&
    rng() < config.specialProbability
  ) {
    candidates = config.special.behaviors.flatMap((s) => {
      const def = config.behaviors.find((b) => b.id === s.id);
      return def ? [{ def, weight: s.baseWeight }] : [];
    });
    category = "special";
    reasonCode = "special";
  } else if (rng() < config.ambientShare) {
    const timeWeights = config.ambientTimeWeights[context.timeBand];
    candidates = config.behaviors
      .filter((b) => b.category === "ambient")
      .map((def) => ({ def, weight: def.baseWeight * (timeWeights[def.id] ?? 1) }));
    category = "ambient";
    reasonCode = "ambient";
  } else {
    candidates = config.behaviors
      .filter((b) => b.category === "dominant" && b.dominantId === dominantId)
      .map((def) => ({ def, weight: def.baseWeight }));
    category = "dominant";
    reasonCode = "dominant";
  }

  let chosen = pickWeighted(candidates, config.minShare, rng);
  if (candidates.length > 1 && chosen.def.id === context.lastBehaviorId && context.consecutiveCount >= config.maxConsecutive) {
    const index = candidates.findIndex((c) => c.def.id === chosen.def.id);
    chosen = candidates[(index + 1) % candidates.length];
  }
  return finish(chosen.def, category, reasonCode, chosen.def.durationMs);
}

export function selectSaveFeedback(base: BehaviorDecision, emotion: EmotionReading, config: BehaviorRuleConfig = BEHAVIOR_V2): BehaviorDecision {
  const mapping = config.emotionExpression[emotion.label];
  return {
    ...base,
    expression: mapping.expression,
    amplitude: mapping.intensity,
    animation: "react",
    durationMs: config.saveFeedbackDurationMs,
    reasonCode: "save_feedback",
  };
}