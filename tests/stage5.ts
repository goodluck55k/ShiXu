import assert from "node:assert/strict";
import { OFFLINE_LIFE_V1 } from "../src/config/offlineLife";
import { PERSONALITY_V2 } from "../src/config/personality";
import { REUNION_V1 } from "../src/config/reunion";
import { planOfflineLife } from "../src/domain/offlineLife";
import { derivePersonality, type DimensionId, type DimensionScores } from "../src/domain/personality";
import { evaluateReunion, type ReunionRuleConfig } from "../src/domain/reunion";
import { applyGameEvent, createInitialSnapshot } from "../src/domain/rules";
import type { SessionStartedEvent, Snapshot } from "../src/domain/types";

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const DOMINANTS: DimensionId[] = ["gentleness", "curiosity", "cheerfulness", "fearfulness", "low_mood"];
const THRESHOLD = REUNION_V1.thresholdMs;
const FORBIDDEN = ["你终于回来了", "你都不理我", "我等了你好久", "你是不是不要我了"];

function snapshotWithDominant(dominant: DimensionId): Snapshot {
  const deltas: DimensionScores = { gentleness: 0, curiosity: 0, cheerfulness: 0, fearfulness: 0, low_mood: 0 };
  deltas[dominant] = 3;
  const snap = createInitialSnapshot();
  return {
    ...snap,
    entries: [{
      id: "a", text: "原文 a", createdAt: 1, updatedAt: 1, dayKey: "2026-11-01", revision: 0,
      originalAnalysis: null, analysisMeta: null,
      effectiveEmotion: { label: "neutral", intensity: 0.5, valence: 0.5, arousal: 0.5, dominance: 0.5, source: "manual", confidence: null },
      corrections: [], awardedXp: 0, rulesVersion: "rules-v1",
    }],
    personality: {
      contributions: { a: { dayKey: "2026-11-01", label: "neutral", entryRevision: 0, deltas, rulesVersion: PERSONALITY_V2.rulesVersion } },
      dominantId: null,
      rulesVersion: PERSONALITY_V2.rulesVersion,
    },
    offlineLife: { lastVisitAt: NOW - 4 * DAY, lastActiveAt: NOW - 4 * DAY, lastWindowStart: null, events: [] },
    reunion: { lastTriggeredWindowStart: null, lastTriggeredAt: null },
  };
}

function evaluate(dominant: DimensionId, baseline: number | null, patch: Partial<Parameters<typeof evaluateReunion>[0]> = {}) {
  return evaluateReunion({
    now: NOW,
    lastActiveAt: baseline,
    lastVisitAt: baseline,
    lastTriggeredWindowStart: null,
    dominantId: dominant,
    ...patch,
  }, REUNION_V1);
}

function main() {
  // 1. 首次使用/迁移后基准为 null：不触发。
  const fresh = evaluate("gentleness", null);
  assert.equal(fresh.triggered, false);
  assert.equal(fresh.reasonCode, "no-baseline");
  assert.equal(fresh.windowStart, null);
  assert.equal(fresh.greeting, null);

  // 2. 离线 1 天：不触发。
  const oneDay = evaluate("gentleness", NOW - DAY);
  assert.equal(oneDay.triggered, false);
  assert.equal(oneDay.reasonCode, "within-threshold");
  assert.equal(oneDay.absenceMs, DAY);

  // 3. 恰好 72 小时：严格大于才触发，所以不触发。
  const exact = evaluate("gentleness", NOW - THRESHOLD);
  assert.equal(exact.triggered, false, "恰好等于阈值不触发");
  assert.equal(exact.reasonCode, "within-threshold");
  assert.equal(exact.absenceMs, THRESHOLD);

  // 4. 72 小时 + 1 毫秒：触发并生成问候。
  const baseline = NOW - THRESHOLD - 1;
  const triggered = evaluate("gentleness", baseline);
  assert.equal(triggered.triggered, true);
  assert.equal(triggered.reasonCode, "triggered");
  assert.equal(triggered.windowStart, baseline);
  assert.equal(triggered.absenceMs, THRESHOLD + 1);
  assert.ok(triggered.greeting);
  assert.equal(triggered.greeting!.windowStart, baseline);
  assert.equal(triggered.greeting!.question, "最近过得还好吗？");
  assert.equal(triggered.greeting!.rulesVersion, "reunion-v1");
  assert.ok(triggered.greeting!.message.length > 0);

  // 5. 基准使用 lastActiveAt ?? lastVisitAt：lastActiveAt 更新时不因 lastVisitAt 很旧而误触发。
  const activeNewer = evaluateReunion({
    now: NOW,
    lastActiveAt: NOW - HOUR,
    lastVisitAt: NOW - 10 * DAY,
    lastTriggeredWindowStart: null,
    dominantId: "gentleness",
  }, REUNION_V1);
  assert.equal(activeNewer.triggered, false, "lastActiveAt 优先");
  const activeOlder = evaluateReunion({
    now: NOW,
    lastActiveAt: NOW - 10 * DAY,
    lastVisitAt: NOW - HOUR,
    lastTriggeredWindowStart: null,
    dominantId: "gentleness",
  }, REUNION_V1);
  assert.equal(activeOlder.triggered, true, "lastActiveAt 较旧时应触发");

  // 6. 同一离线窗口只触发一次；更早的已触发窗口不影响新窗口。
  const repeated = evaluate("gentleness", baseline, { lastTriggeredWindowStart: baseline });
  assert.equal(repeated.triggered, false);
  assert.equal(repeated.reasonCode, "already-triggered");
  const nextWindow = evaluate("gentleness", baseline + HOUR, { lastTriggeredWindowStart: baseline, now: NOW + DAY });
  assert.equal(nextWindow.triggered, true, "新的更晚窗口可以再次触发");

  // 7. 同标签页救援时间戳抬高基准：旧 lastActiveAt 不应因刷新误触发。
  const rescued = evaluate("gentleness", NOW - 10 * DAY, { activityRescueAt: NOW - 5 * 60 * 1000 });
  assert.equal(rescued.triggered, false, "救援值代表最近活动，不应误触发");
  const staleRescue = evaluate("gentleness", baseline, { activityRescueAt: baseline - HOUR });
  assert.equal(staleRescue.triggered, true, "早于窗口起点的救援值被忽略");
  const futureRescue = evaluate("gentleness", baseline, { activityRescueAt: NOW + HOUR });
  assert.equal(futureRescue.triggered, true, "未来救援值被忽略");

  // 8. 五种主导问候可区分，基础问句固定，文案无责备/依赖表达。
  const messages = new Set<string>();
  const tones = new Set<string>();
  for (const dominant of DOMINANTS) {
    const result = evaluate(dominant, baseline);
    assert.equal(result.triggered, true);
    const greeting = result.greeting!;
    assert.equal(greeting.dominantId, dominant);
    assert.equal(greeting.question, REUNION_V1.baseQuestion);
    assert.equal(greeting.message, REUNION_V1.templates[dominant].generic);
    messages.add(greeting.message);
    tones.add(greeting.tone);
    for (const line of [greeting.message, ...Object.values(REUNION_V1.templates[dominant].activityLines)]) {
      for (const phrase of FORBIDDEN) assert.equal(line.includes(phrase), false, `${dominant} 不得出现「${phrase}」`);
    }
  }
  assert.equal(messages.size, DOMINANTS.length, "五主导问候应可区分");
  assert.equal(tones.size, DOMINANTS.length, "五主导语气应可区分");

  // 9. 具体经历只引用本次窗口真实生成的离线事件；无事件时使用通用问候。
  for (const dominant of DOMINANTS) {
    const plan = planOfflineLife({ lastActiveAt: baseline, lastVisitAt: baseline, now: NOW, dominantId: dominant }, OFFLINE_LIFE_V1);
    const result = evaluate(dominant, baseline, { offlineEvents: plan.events });
    const latest = plan.events[plan.events.length - 1];
    assert.equal(result.greeting!.message, REUNION_V1.templates[dominant].activityLines[latest.activityId], "应引用真实事件对应文案");
    // 其他窗口的事件不得被引用。
    const foreign = { ...plan.events[0], id: "foreign", windowStart: baseline - 1 };
    const noMatch = evaluate(dominant, baseline, { offlineEvents: [foreign] });
    assert.equal(noMatch.greeting!.message, REUNION_V1.templates[dominant].generic, "非本窗口事件回落到通用问候");
  }
  for (const dominant of DOMINANTS) {
    for (const activityId of Object.keys(REUNION_V1.templates[dominant].activityLines)) {
      assert.ok(OFFLINE_LIFE_V1.activities[dominant].some((item) => item.id === activityId), `${dominant}.${activityId} 应属于离线活动池`);
    }
  }

  // 10. 确定性：相同输入相同结果，且不修改输入。
  const input = {
    now: NOW,
    lastActiveAt: baseline,
    lastVisitAt: baseline,
    lastTriggeredWindowStart: null,
    dominantId: "curiosity" as DimensionId,
    offlineEvents: planOfflineLife({ lastActiveAt: baseline, lastVisitAt: baseline, now: NOW, dominantId: "curiosity" }, OFFLINE_LIFE_V1).events,
  };
  const before = JSON.stringify(input);
  const a = evaluateReunion(input, REUNION_V1);
  const b = evaluateReunion(input, REUNION_V1);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(input), before, "评估不得修改输入");

  // 11. 阈值可配置。
  const custom: ReunionRuleConfig = { ...REUNION_V1, thresholdMs: HOUR };
  const customEval = evaluateReunion({ now: NOW, lastActiveAt: NOW - 2 * HOUR, lastVisitAt: null, lastTriggeredWindowStart: null, dominantId: "gentleness" }, custom);
  assert.equal(customEval.triggered, true, "阈值应可配置");

  // 12. SESSION_STARTED 只在成功事件中写重逢标记；未触发时保留原标记；空窗口防御性拒绝。
  const seed: Snapshot = {
    ...snapshotWithDominant("low_mood"),
    offlineLife: { lastVisitAt: baseline, lastActiveAt: baseline, lastWindowStart: null, events: [] },
  };
  const sessionEvent = (windowStart: number | null, reunionTriggered: boolean): SessionStartedEvent => ({
    type: "SESSION_STARTED",
    eventId: `session:${windowStart ?? "first"}`,
    windowStart,
    offlineEvents: [],
    reunionTriggered,
  });
  const scoresBefore = derivePersonality(seed.personality).scores;
  const committed = applyGameEvent(seed, sessionEvent(baseline, true), { now: NOW, dayKey: "2026-11-13" });
  assert.equal(committed.changed, true);
  assert.deepEqual(committed.snapshot.reunion, { lastTriggeredWindowStart: baseline, lastTriggeredAt: NOW });
  assert.deepEqual(committed.snapshot.entries, seed.entries, "重逢不写日记");
  assert.deepEqual(committed.snapshot.personality, seed.personality, "重逢不改性格台账");
  assert.deepEqual(derivePersonality(committed.snapshot.personality).scores, scoresBefore, "重逢不改五维分数");
  assert.deepEqual(committed.snapshot.memories, seed.memories, "重逢不写回忆");

  const history = { lastTriggeredWindowStart: baseline - DAY, lastTriggeredAt: NOW - DAY };
  const kept: Snapshot = { ...seed, reunion: history };
  const noTrigger = applyGameEvent(kept, sessionEvent(baseline, false), { now: NOW, dayKey: "2026-11-13" });
  assert.deepEqual(noTrigger.snapshot.reunion, history, "未触发时保留原重逢标记");

  const freshSnapshot = createInitialSnapshot();
  const firstSession = applyGameEvent(freshSnapshot, sessionEvent(null, true), { now: NOW, dayKey: "2026-11-13" });
  assert.equal(firstSession.changed, true);
  assert.deepEqual(firstSession.snapshot.reunion, freshSnapshot.reunion, "首次会话空窗口不得写入重逢标记");

  // 13. 已提交的窗口不会被不同 eventId 重复触发（基准已推进）。
  const replay = applyGameEvent(committed.snapshot, { ...sessionEvent(baseline, true), eventId: "other" }, { now: NOW, dayKey: "2026-11-13" });
  assert.equal(replay.changed, false, "基准推进后旧窗口拒绝");

  console.log("阶段五久别重逢领域、阈值、文案与零结算验证通过");
}
main();
