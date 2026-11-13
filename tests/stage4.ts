import assert from "node:assert/strict";
import { OFFLINE_LIFE_V1 as cfg } from "../src/config/offlineLife";
import { PERSONALITY_V2 } from "../src/config/personality";
import { planOfflineLife, type OfflineLifeEvent } from "../src/domain/offlineLife";
import { derivePersonality, type DimensionId, type DimensionScores } from "../src/domain/personality";
import { applyGameEvent, createInitialSnapshot } from "../src/domain/rules";
import { migrateSnapshotV2toV3 } from "../src/domain/migrations";
import { createEmptyCompanion } from "../src/domain/companion";
import { validateSnapshot } from "../src/domain/schema";
import { createLocalStorageAdapter } from "../src/lib/storage/localStorageAdapter";
import type { ActivityCheckpointEvent, SessionStartedEvent, Snapshot, SnapshotV2 } from "../src/domain/types";

const DAY = "2026-11-13";
const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;
const DOMINANTS: DimensionId[] = ["gentleness", "curiosity", "cheerfulness", "fearfulness", "low_mood"];
const ctx = (now: number) => ({ now, dayKey: DAY });

function snapshotWithDominant(d: DimensionId): Snapshot {
  const deltas: DimensionScores = { gentleness: 0, curiosity: 0, cheerfulness: 0, fearfulness: 0, low_mood: 0 };
  deltas[d] = 3;
  return {
    ...createInitialSnapshot(),
    entries: [{ id: "a", text: "原文 a", createdAt: 1, updatedAt: 1, dayKey: DAY, revision: 0, originalAnalysis: null, analysisMeta: null, effectiveEmotion: { label: "neutral", intensity: .5, valence: .5, arousal: .5, dominance: .5, source: "manual", confidence: null }, corrections: [], awardedXp: 0, rulesVersion: "rules-v1" }],
    personality: {
      contributions: { a: { dayKey: DAY, label: "neutral", entryRevision: 0, deltas, rulesVersion: PERSONALITY_V2.rulesVersion } },
      dominantId: null,
      rulesVersion: PERSONALITY_V2.rulesVersion,
    },
  };
}
function offlineSnapshot(d: DimensionId, baseline: number | null): Snapshot {
  return { ...snapshotWithDominant(d), offlineLife: { lastVisitAt: baseline, lastActiveAt: baseline, lastWindowStart: null, events: [] } };
}
function sessionEvent(windowStart: number | null, events: OfflineLifeEvent[], eventId?: string): SessionStartedEvent {
  return { type: "SESSION_STARTED", eventId: eventId ?? `session:${windowStart ?? "first"}`, windowStart, offlineEvents: events, reunionTriggered: false };
}
const poolIds = (d: DimensionId) => cfg.activities[d].map((a) => a.id);

async function main() {
  // 1. 首次打开 baseline=null：不伪造过去的生活。
  const fresh = createInitialSnapshot();
  const firstPlan = planOfflineLife({ lastActiveAt: null, lastVisitAt: null, now: NOW, dominantId: "gentleness" }, cfg);
  assert.deepEqual(firstPlan.events, []);
  assert.equal(firstPlan.windowStart, null);
  const firstSession = applyGameEvent(fresh, sessionEvent(null, []), ctx(NOW));
  assert.equal(firstSession.changed, true);
  assert.deepEqual(firstSession.snapshot.offlineLife.events, []);
  assert.equal(firstSession.snapshot.offlineLife.lastActiveAt, NOW);
  assert.equal(firstSession.snapshot.offlineLife.lastVisitAt, NOW);

  // 2. absence < minAbsenceMs：不生成事件，但窗口起点仍为基准。
  const shortBaseline = NOW - (cfg.minAbsenceMs - 1);
  const shortPlan = planOfflineLife({ lastActiveAt: shortBaseline, lastVisitAt: shortBaseline, now: NOW, dominantId: "curiosity" }, cfg);
  assert.deepEqual(shortPlan.events, []);
  assert.equal(shortPlan.windowStart, shortBaseline);

  // 3/4. 正常离线生成当前主导池活动；五主导池独立。
  const baseline = NOW - 5 * HOUR;
  for (const d of DOMINANTS) {
    const plan = planOfflineLife({ lastActiveAt: baseline, lastVisitAt: baseline, now: NOW, dominantId: d }, cfg);
    assert.ok(plan.events.length > 0);
    for (const e of plan.events) {
      assert.equal(e.dominantId, d);
      assert.ok(poolIds(d).includes(e.activityId), `${d} 池应包含 ${e.activityId}`);
      assert.equal(e.windowStart, baseline);
    }
  }
  const allIds = DOMINANTS.flatMap(poolIds);
  assert.equal(new Set(allIds).size, allIds.length, "五主导活动 id 应互不重叠");

  // 5. 确定性、升序、occurredAt ≤ now、数量上限。
  const input = { lastActiveAt: baseline, lastVisitAt: baseline, now: NOW, dominantId: "cheerfulness" as DimensionId };
  const planA = planOfflineLife(input, cfg);
  const planB = planOfflineLife(input, cfg);
  assert.deepEqual(planA, planB);
  const expectedCount = Math.min(cfg.maxEventsPerWindow, Math.max(1, Math.floor((NOW - baseline) / cfg.eventIntervalMs)));
  assert.equal(planA.events.length, expectedCount);
  for (let i = 0; i < planA.events.length; i++) {
    assert.ok(planA.events[i].occurredAt <= NOW);
    if (i > 0) assert.ok(planA.events[i].occurredAt >= planA.events[i - 1].occurredAt);
  }
  const longPlan = planOfflineLife({ lastActiveAt: NOW - 20 * HOUR, lastVisitAt: null, now: NOW, dominantId: "gentleness" }, cfg);
  assert.equal(longPlan.events.length, cfg.maxEventsPerWindow);
  // lastActiveAt 优先于 lastVisitAt 作为基准。
  const mixed = planOfflineLife({ lastActiveAt: baseline, lastVisitAt: baseline - 10 * HOUR, now: NOW, dominantId: "gentleness" }, cfg);
  assert.equal(mixed.windowStart, baseline);

  // 6. SESSION_STARTED 幂等：同 eventId / 窗口推进后旧窗口 / 事件 id 去重。
  let s = offlineSnapshot("gentleness", baseline);
  const committed = applyGameEvent(s, sessionEvent(planA.windowStart, planA.events), ctx(NOW));
  assert.equal(committed.changed, true);
  s = committed.snapshot;
  assert.equal(s.offlineLife.events.length, planA.events.length);
  assert.equal(s.offlineLife.lastWindowStart, baseline);
  assert.equal(applyGameEvent(s, sessionEvent(planA.windowStart, planA.events), ctx(NOW)).changed, false, "同 eventId 不重复");
  assert.equal(applyGameEvent(s, sessionEvent(baseline, planA.events, "other-id"), ctx(NOW + 1)).changed, false, "基准已推进，旧窗口拒绝");
  assert.equal(applyGameEvent(s, sessionEvent(baseline + 1, []), ctx(NOW + 1)).changed, false, "windowStart 必须等于基准");
  // 事件 id 去重（不同 eventId，相同基准，含已存在 id）。
  const dupBase = offlineSnapshot("gentleness", baseline);
  const existing = planA.events[0];
  const dupSnapshot: Snapshot = { ...dupBase, offlineLife: { ...dupBase.offlineLife, events: [existing] } };
  const freshEvent = { ...planA.events[1], id: `offline:${baseline}:99` };
  const dedup = applyGameEvent(dupSnapshot, sessionEvent(baseline, [existing, freshEvent], "dedup-1"), ctx(NOW));
  assert.equal(dedup.changed, true);
  assert.equal(dedup.snapshot.offlineLife.events.filter((e) => e.id === existing.id).length, 1);
  assert.ok(dedup.snapshot.offlineLife.events.some((e) => e.id === freshEvent.id));

  // 7. ACTIVITY_CHECKPOINT 单调：重复/乱序/重放不倒退，不写回忆/appliedEventIds。
  let c = offlineSnapshot("curiosity", baseline);
  const idsBefore = c.appliedEventIds;
  const memoriesBefore = c.memories;
  const cp = (at: number): ActivityCheckpointEvent => ({ type: "ACTIVITY_CHECKPOINT", eventId: `checkpoint:${at}`, at });
  c = applyGameEvent(c, cp(NOW), ctx(NOW)).snapshot;
  assert.equal(c.offlineLife.lastActiveAt, NOW);
  assert.deepEqual(c.appliedEventIds, idsBefore);
  assert.deepEqual(c.memories, memoriesBefore);
  assert.equal(applyGameEvent(c, cp(NOW), ctx(NOW)).changed, false, "重复 checkpoint 无副作用");
  assert.equal(applyGameEvent(c, cp(NOW - HOUR), ctx(NOW)).changed, false, "乱序不倒退");
  assert.equal(applyGameEvent(c, cp(NOW + HOUR), ctx(NOW)).changed, false, "at > now 拒绝");
  c = applyGameEvent(c, cp(NOW + HOUR), ctx(NOW + HOUR)).snapshot;
  assert.equal(c.offlineLife.lastActiveAt, NOW + HOUR);
  assert.equal(applyGameEvent(c, cp(NOW), ctx(NOW + HOUR)).changed, false, "重放旧值不倒退");

  // 8. 日记保存顺带单调推进 lastActiveAt。
  const diaryBase = offlineSnapshot("gentleness", baseline);
  const confirmed = applyGameEvent(diaryBase, { type: "CONFIRM_ENTRY", eventId: "evt-1", entryId: "entry-1", text: "今天还好", emotion: { label: "calm", intensity: .5, valence: .5, arousal: .5, dominance: .5, source: "manual", confidence: null }, analysis: null, analysisMeta: null }, ctx(NOW));
  assert.equal(confirmed.changed, true);
  assert.equal(confirmed.snapshot.offlineLife.lastActiveAt, NOW);
  assert.equal(confirmed.snapshot.entries.length, 2);

  // 9. 离线前后五维/日记/回忆/重逢完全不变；low_mood 不因离线增加。
  const low = offlineSnapshot("low_mood", baseline);
  const personalityBefore = low.personality;
  const scoresBefore = derivePersonality(low.personality).scores;
  const lowPlan = planOfflineLife({ lastActiveAt: baseline, lastVisitAt: baseline, now: NOW, dominantId: "low_mood" }, cfg);
  const lowAfter = applyGameEvent(low, sessionEvent(lowPlan.windowStart, lowPlan.events), ctx(NOW)).snapshot;
  assert.deepEqual(lowAfter.personality, personalityBefore);
  assert.deepEqual(derivePersonality(lowAfter.personality).scores, scoresBefore);
  assert.deepEqual(lowAfter.entries, low.entries);
  assert.deepEqual(lowAfter.memories, low.memories);
  assert.deepEqual(lowAfter.reunion, low.reunion);
  assert.equal(lowAfter.reunion.lastTriggeredWindowStart, null);

  // 10. 裁剪到 maxStoredEvents，保留最新，窗口幂等不被破坏。
  const oldBaseline = NOW - 100 * HOUR;
  const filler: OfflineLifeEvent[] = Array.from({ length: cfg.maxStoredEvents }, (_, i) => ({
    id: `offline:${oldBaseline}:${i}`, windowStart: oldBaseline, occurredAt: oldBaseline + i * 1000,
    dominantId: "gentleness", activityId: poolIds("gentleness")[0], text: "旧片段",
  }));
  const full: Snapshot = { ...offlineSnapshot("gentleness", baseline), offlineLife: { lastVisitAt: baseline, lastActiveAt: baseline, lastWindowStart: oldBaseline, events: filler } };
  assert.equal(validateSnapshot(full).ok, true);
  const trimmed = applyGameEvent(full, sessionEvent(baseline, planA.events), ctx(NOW)).snapshot;
  assert.equal(trimmed.offlineLife.events.length, cfg.maxStoredEvents);
  for (const e of planA.events) assert.ok(trimmed.offlineLife.events.some((x) => x.id === e.id), "最新窗口事件应保留");
  assert.equal(trimmed.offlineLife.events.some((e) => e.id === filler[0].id), false, "最旧事件应被裁剪");
  assert.equal(validateSnapshot(trimmed).ok, true);
  assert.equal(applyGameEvent(trimmed, sessionEvent(baseline, planA.events), ctx(NOW)).changed, false);
  const over: Snapshot = { ...full, offlineLife: { ...full.offlineLife, events: [...filler, { ...filler[0], id: "extra" }] } };
  assert.equal(validateSnapshot(over).ok, false, "超过存储上限应校验失败");

  // 11. 迁移：v2→v3 离线时间为空，首次会话不生成过去的生活。
  const v2: SnapshotV2 = { schemaVersion: 2, revision: 4, character: { totalXp: 12, stage: 2, latestEntryId: null, currentEmotion: null }, entries: [], memories: [], appliedEventIds: [], decorations: { ownedIds: [], equippedBySlot: {}, hiddenById: {} }, companion: createEmptyCompanion() };
  const migrated = migrateSnapshotV2toV3(v2);
  assert.deepEqual(migrated.offlineLife, { lastVisitAt: null, lastActiveAt: null, lastWindowStart: null, events: [] });
  const migratedSession = applyGameEvent(migrated, sessionEvent(null, []), ctx(NOW));
  assert.equal(migratedSession.changed, true);
  assert.deepEqual(migratedSession.snapshot.offlineLife.events, []);
  assert.equal(validateSnapshot(migratedSession.snapshot).ok, true);

  // 12. 存储失败不提交/不半写；恢复重试不重复；冲突保护。
  let raw: string | null = JSON.stringify(offlineSnapshot("gentleness", baseline));
  let fail = false;
  const fakeStorage = { getItem: () => raw, setItem: (_: string, value: string) => { if (fail) throw new Error("failed"); raw = value; } };
  Object.defineProperty(globalThis, "window", { value: { localStorage: fakeStorage }, configurable: true });
  const storage = createLocalStorageAdapter();
  const loaded = await storage.load();
  assert.equal(loaded.status, "ready");
  if (loaded.status !== "ready") throw new Error("load failed");
  const storePlan = planOfflineLife({ lastActiveAt: baseline, lastVisitAt: baseline, now: NOW, dominantId: "gentleness" }, cfg);
  const candidate = applyGameEvent(loaded.snapshot, sessionEvent(storePlan.windowStart, storePlan.events), ctx(NOW)).snapshot;
  const rawBefore = raw;
  fail = true;
  assert.notEqual((await storage.save(candidate, loaded.snapshot.revision)).status, "saved");
  assert.equal(raw, rawBefore, "保存失败不得改变原始存档");
  fail = false;
  assert.equal((await storage.save(candidate, loaded.snapshot.revision)).status, "saved");
  const reloaded = await storage.load();
  assert.equal(reloaded.status, "ready");
  if (reloaded.status === "ready") {
    assert.equal(reloaded.snapshot.offlineLife.events.length, storePlan.events.length);
    assert.deepEqual(reloaded.snapshot.personality, candidate.personality);
    assert.equal(applyGameEvent(reloaded.snapshot, sessionEvent(storePlan.windowStart, storePlan.events), ctx(NOW)).changed, false, "恢复后重放不重复");
    assert.equal((await storage.save(candidate, 0)).status, "conflict", "错误修订号应冲突");
  }
  assert.equal(raw, JSON.stringify(reloaded.status === "ready" ? reloaded.snapshot : candidate), "冲突不得覆盖存档");

  console.log("阶段四离线生活领域、幂等、迁移与存储验证通过");
}
void main();