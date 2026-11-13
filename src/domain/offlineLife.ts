import { OFFLINE_LIFE_V1 } from "@/config/offlineLife";
import type { DimensionId } from "./personality";

export interface OfflineActivity {
  id: string;
  label: string;
  text: string;
  weight: number;
}

export interface OfflineLifeRuleConfig {
  rulesVersion: "offline-life-v1";
  minAbsenceMs: number;
  eventIntervalMs: number;
  maxEventsPerWindow: number;
  maxStoredEvents: number;
  activities: Record<DimensionId, OfflineActivity[]>;
}

export interface OfflineLifeEvent {
  id: string;
  windowStart: number;
  occurredAt: number;
  dominantId: DimensionId;
  activityId: string;
  text: string;
}

export interface OfflineLifeState {
  lastVisitAt: number | null;
  lastActiveAt: number | null;
  lastWindowStart: number | null;
  events: OfflineLifeEvent[];
}

export interface OfflineLifePlanInput {
  lastActiveAt: number | null;
  lastVisitAt: number | null;
  now: number;
  dominantId: DimensionId;
}

export interface OfflineLifePlan {
  events: OfflineLifeEvent[];
  windowStart: number | null;
  nextLastVisitAt: number;
  nextLastActiveAt: number;
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

function pickWeighted(pool: OfflineActivity[], rng: () => number): OfflineActivity {
  const total = pool.reduce((sum, activity) => sum + activity.weight, 0);
  let r = rng() * total;
  for (const activity of pool) {
    r -= activity.weight;
    if (r < 0) return activity;
  }
  return pool[pool.length - 1];
}

// 纯函数：不写存档、不调用 Date.now()/Math.random()/网络；随机源由显式输入稳定哈希派生。
export function planOfflineLife(
  input: OfflineLifePlanInput,
  config: OfflineLifeRuleConfig = OFFLINE_LIFE_V1,
): OfflineLifePlan {
  const { lastActiveAt, lastVisitAt, now, dominantId } = input;
  const baseline = lastActiveAt ?? lastVisitAt;
  const next = { nextLastVisitAt: now, nextLastActiveAt: now };

  // 首次使用或刚迁移：baseline 为 null，不伪造“过去的生活”。
  if (baseline === null) return { events: [], windowStart: null, ...next };

  const absence = now - baseline;
  if (absence < config.minAbsenceMs) return { events: [], windowStart: baseline, ...next };

  const count = Math.min(
    config.maxEventsPerWindow,
    Math.max(1, Math.floor(absence / config.eventIntervalMs)),
  );
  const pool = config.activities[dominantId];
  const events: OfflineLifeEvent[] = [];
  for (let index = 0; index < count; index++) {
    const occurredAt = Math.min(now, baseline + config.eventIntervalMs * (index + 1));
    const rng = mulberry32(
      hashString(`${config.rulesVersion}|${baseline}|${dominantId}|${index}`),
    );
    const activity = pickWeighted(pool, rng);
    events.push({
      id: `offline:${baseline}:${index}`,
      windowStart: baseline,
      occurredAt,
      dominantId,
      activityId: activity.id,
      text: activity.text,
    });
  }
  return { events, windowStart: baseline, ...next };
}