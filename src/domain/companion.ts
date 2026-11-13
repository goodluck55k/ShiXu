import {
  PERSONALITY_DIMENSIONS,
  type CompanionState,
  type EmotionLabel,
  type PersonalityContribution,
  type PersonalityDeltas,
  type PersonalityDimension,
  type SnapshotV2,
  type SnapshotV1,
} from "./types";

export const COMPANION_RULES_VERSION = "companion-v1";

// 数值唯一来源：docs/COMPANION_SPEC.md §2.2–2.3（候选参数，本轮按 companion-v1 落地，待验收）
export const PERSONALITY_PARAMS = {
  initialScore: 50,
  minScore: 20,
  maxScore: 80,
  dailyNetCap: 6,
} as const;

export const EMOTION_SCORE_TABLE: Record<EmotionLabel, PersonalityDeltas> = {
  joy: { exploration: 2, serenity: -1, affinity: 1 },
  calm: { exploration: -1, serenity: 2, affinity: 1 },
  sadness: { exploration: -1, serenity: 1, affinity: 2 },
  anxiety: { exploration: 1, serenity: -2, affinity: 1 },
  anger: { exploration: 2, serenity: -2, affinity: -1 },
  tired: { exploration: -2, serenity: 2, affinity: 0 },
  mixed: { exploration: 1, serenity: 0, affinity: 1 },
  neutral: { exploration: 0, serenity: 1, affinity: 0 },
  unknown: { exploration: 0, serenity: 0, affinity: 0 },
};

export type PersonalityParams = typeof PERSONALITY_PARAMS;

export function createEmptyCompanion(): CompanionState {
  return {
    contributions: {},
    habits: {},
    world: [],
    companionRulesVersion: COMPANION_RULES_VERSION,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function emptyDeltas(): PersonalityDeltas {
  return { exploration: 0, serenity: 0, affinity: 0 };
}

export function sumDayDeltas(
  contributions: Record<string, PersonalityContribution>,
  dayKey: string,
): PersonalityDeltas {
  const totals = emptyDeltas();
  for (const contribution of Object.values(contributions)) {
    if (contribution.dayKey !== dayKey) continue;
    for (const dimension of PERSONALITY_DIMENSIONS) {
      totals[dimension] += contribution.deltas[dimension];
    }
  }
  return totals;
}

export function scoreContribution(
  label: EmotionLabel,
  dayDeltas: PersonalityDeltas,
  params: PersonalityParams = PERSONALITY_PARAMS,
): PersonalityDeltas {
  const raw = EMOTION_SCORE_TABLE[label];
  const applied = emptyDeltas();
  for (const dimension of PERSONALITY_DIMENSIONS) {
    const cap = params.dailyNetCap;
    applied[dimension] = clamp(raw[dimension], -cap - dayDeltas[dimension], cap - dayDeltas[dimension]);
  }
  return applied;
}

export function buildContribution(
  dayKey: string,
  label: EmotionLabel,
  entryRevision: number,
  contributions: Record<string, PersonalityContribution>,
  params: PersonalityParams = PERSONALITY_PARAMS,
): PersonalityContribution {
  const deltas = scoreContribution(label, sumDayDeltas(contributions, dayKey), params);
  return { dayKey, label, deltas, entryRevision };
}

// 替换修订：以「当日合计减去旧贡献后的余量」重新截断；无台账贡献（v1 旧日记）不补算
export function reviseContribution(
  contributions: Record<string, PersonalityContribution>,
  entryId: string,
  newLabel: EmotionLabel,
  entryRevision: number,
  params: PersonalityParams = PERSONALITY_PARAMS,
): Record<string, PersonalityContribution> {
  const previous = contributions[entryId];
  if (!previous) return contributions;
  const remainder = sumDayDeltas(contributions, previous.dayKey);
  for (const dimension of PERSONALITY_DIMENSIONS) {
    remainder[dimension] -= previous.deltas[dimension];
  }
  const deltas = scoreContribution(newLabel, remainder, params);
  return {
    ...contributions,
    [entryId]: { dayKey: previous.dayKey, label: newLabel, deltas, entryRevision },
  };
}

export interface PersonalityProfile {
  // 内部分数仅供领域与调度消费，UI 不得展示精确数值
  scores: PersonalityDeltas;
  descriptions: string[];
}

// 文案区间为候选三段（低 ≤44 / 均衡 45–55 / 高 ≥56），只描述小白人行为倾向
const DESCRIPTIONS: Record<PersonalityDimension, [string, string, string]> = {
  exploration: [
    "最近更喜欢安静地待着，不太急着到处探索。",
    "对周围的好奇和安静待着的喜好差不多均衡。",
    "最近更喜欢探索周围，到处看看。",
  ],
  serenity: [
    "最近好像更想多活动活动，不太停得下来。",
    "安静待着和外出活动的喜好差不多均衡。",
    "最近喜欢安静地待着。",
  ],
  affinity: [
    "最近更喜欢自己待着，享受独处。",
    "亲近你和独自待着的喜好差不多均衡。",
    "最近似乎更愿意亲近你。",
  ],
};

export function derivePersonality(
  companion: CompanionState,
  params: PersonalityParams = PERSONALITY_PARAMS,
): PersonalityProfile {
  const totals = emptyDeltas();
  for (const contribution of Object.values(companion.contributions)) {
    for (const dimension of PERSONALITY_DIMENSIONS) {
      totals[dimension] += contribution.deltas[dimension];
    }
  }
  const scores = emptyDeltas();
  const descriptions: string[] = [];
  for (const dimension of PERSONALITY_DIMENSIONS) {
    const score = clamp(params.initialScore + totals[dimension], params.minScore, params.maxScore);
    scores[dimension] = score;
    const band = score <= 44 ? 0 : score >= 56 ? 2 : 1;
    descriptions.push(DESCRIPTIONS[dimension][band]);
  }
  return { scores, descriptions };
}

export function migrateSnapshotV1toV2(v1: SnapshotV1): SnapshotV2 {
  return {
    schemaVersion: 2,
    revision: v1.revision,
    character: v1.character,
    entries: v1.entries,
    decorations: v1.decorations,
    memories: v1.memories,
    appliedEventIds: v1.appliedEventIds,
    companion: createEmptyCompanion(),
  };
}