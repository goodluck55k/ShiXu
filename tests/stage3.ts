import assert from "node:assert/strict";
import { BEHAVIOR_V2 } from "../src/config/behavior";
import { PERSONALITY_V2 } from "../src/config/personality";
import { derivePersonality, type DimensionScores, type PersonalityState } from "../src/domain/personality";
import { selectBehavior, selectSaveFeedback, type BehaviorContext, type BehaviorId, type InteractionType } from "../src/domain/behavior";
import { computeSpecialEligibility } from "../src/application/lowMoodStreak";
import type { EmotionReading, Entry } from "../src/domain/types";

const DAY = "2026-11-13";
const emotion = (label: EmotionReading["label"], intensity = 0.5): EmotionReading => ({ label, intensity, valence: .5, arousal: .5, dominance: .5, source: "manual", confidence: null });
const DOMINANTS = ["gentleness", "curiosity", "cheerfulness", "fearfulness", "low_mood"] as const;

function dominantState(d: (typeof DOMINANTS)[number]): PersonalityState {
  const deltas: DimensionScores = { gentleness: 0, curiosity: 0, cheerfulness: 0, fearfulness: 0, low_mood: 0 };
  deltas[d] = 3;
  return {
    contributions: { a: { dayKey: DAY, label: "neutral", entryRevision: 0, deltas, rulesVersion: PERSONALITY_V2.rulesVersion } },
    dominantId: null,
    rulesVersion: PERSONALITY_V2.rulesVersion,
  };
}
function context(state: PersonalityState, sequence: number, overrides: Partial<BehaviorContext> = {}): BehaviorContext {
  return {
    personality: derivePersonality(state),
    emotion: null,
    interaction: null,
    specialEligible: false,
    dayKey: DAY,
    timeBand: "afternoon",
    sequence,
    seed: 1,
    lastBehaviorId: null,
    consecutiveCount: 0,
    ...overrides,
  };
}
const poolOf = (d: string) => BEHAVIOR_V2.behaviors.filter((b) => b.category === "dominant" && b.dominantId === d).map((b) => b.id);
const noAmbient = { ...BEHAVIOR_V2, ambientShare: 0 };

function entry(id: string, dayKey: string, label: EmotionReading["label"]): Entry {
  return { id, text: `原文 ${id}`, createdAt: 1, updatedAt: 1, dayKey, revision: 0, originalAnalysis: null, analysisMeta: null, effectiveEmotion: emotion(label), corrections: [], awardedXp: 0, rulesVersion: "rules-v1" };
}

async function main() {
  // 配置完整性：五主导各四行为、四类分离
  for (const d of DOMINANTS) assert.equal(poolOf(d).length, 4);
  assert.equal(BEHAVIOR_V2.behaviors.filter((b) => b.category === "ambient").length, 2);
  assert.equal(BEHAVIOR_V2.behaviors.filter((b) => b.category === "interaction").length, 3);
  assert.equal(BEHAVIOR_V2.special.behaviors.length, 2);
  assert.equal(BEHAVIOR_V2.specialBehaviorEnabled, false);
  assert.ok(BEHAVIOR_V2.emotionExpressionDurationMs > 0);

  // 确定性：相同上下文同结果
  const s0 = dominantState("cheerfulness");
  for (let seq = 1; seq <= 50; seq++) {
    assert.deepEqual(selectBehavior(context(s0, seq)), selectBehavior(context(s0, seq)));
  }

  // 主导池独立、可辨认、互不重叠；非主导维度不影响主池
  const seenByDominant: Record<string, Set<BehaviorId>> = {};
  for (const d of DOMINANTS) {
    const state = dominantState(d);
    const seen = new Set<BehaviorId>();
    for (let seq = 1; seq <= 400; seq++) {
      const decision = selectBehavior(context(state, seq), noAmbient);
      assert.equal(decision.category, "dominant");
      assert.equal(decision.dominantId, d);
      assert.ok(poolOf(d).includes(decision.behaviorId));
      seen.add(decision.behaviorId);
    }
    assert.equal(seen.size, 4);
    seenByDominant[d] = seen;
    const other = d === "low_mood" ? "cheerfulness" : "low_mood";
    const base = state.contributions.a;
    const deltas = { ...base.deltas };
    deltas[other] += 1;
    const state2: PersonalityState = { contributions: { a: base, b: { ...base, deltas } }, dominantId: null, rulesVersion: PERSONALITY_V2.rulesVersion };
    assert.equal(derivePersonality(state2).dominantId, d);
    for (let seq = 1; seq <= 100; seq++) {
      assert.deepEqual(selectBehavior(context(state, seq), noAmbient), selectBehavior(context(state2, seq), noAmbient));
    }
  }
  for (const a of DOMINANTS) for (const b of DOMINANTS) if (a !== b) {
    for (const id of seenByDominant[a]) assert.ok(!seenByDominant[b].has(id));
  }

  // 即时情绪只改表情/幅度，不改主池
  for (let seq = 1; seq <= 100; seq++) {
    const plain = selectBehavior(context(s0, seq), noAmbient);
    const sad = selectBehavior(context(s0, seq, { emotion: emotion("sadness") }), noAmbient);
    const joy = selectBehavior(context(s0, seq, { emotion: emotion("joy") }), noAmbient);
    assert.equal(plain.behaviorId, sad.behaviorId);
    assert.equal(plain.behaviorId, joy.behaviorId);
    assert.equal(sad.expression, "sad");
    assert.equal(joy.expression, "happy");
    assert.equal(joy.amplitude, 1.2);
    assert.equal(plain.amplitude, 1);
    // 无即时情绪时回行为配置基础表情；自主行为时长取配置 durationMs
    const def = BEHAVIOR_V2.behaviors.find((b) => b.id === plain.behaviorId)!;
    assert.equal(plain.expression, def.expression);
    assert.equal(plain.durationMs, def.durationMs);
  }

  // 最低份额（长期）与防连续
  for (const d of DOMINANTS) {
    const counts = new Map<BehaviorId, number>();
    const total = 4000;
    for (let seq = 1; seq <= total; seq++) {
      const id = selectBehavior(context(dominantState(d), seq), noAmbient).behaviorId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const id of poolOf(d)) assert.ok((counts.get(id) ?? 0) >= BEHAVIOR_V2.minShare * total, `${d}/${id} share`);
  }
  let last: BehaviorId | null = null;
  let count = 0;
  for (let seq = 1; seq <= 2000; seq++) {
    const decision = selectBehavior(context(s0, seq, { lastBehaviorId: last, consecutiveCount: count }));
    count = decision.behaviorId === last ? count + 1 : 1;
    assert.ok(count <= BEHAVIOR_V2.maxConsecutive);
    last = decision.behaviorId;
  }

  // 互动优先于自主/特殊；时长在候选区间
  const enabled = { ...BEHAVIOR_V2, specialBehaviorEnabled: true };
  for (const type of ["call", "pat", "observe"] as InteractionType[]) {
    const decision = selectBehavior(context(dominantState("low_mood"), 7, { interaction: { id: "i", type, occurredAt: 1, seed: 1 }, specialEligible: true }), enabled);
    assert.equal(decision.category, "interaction");
    assert.equal(decision.behaviorId, `respond_${type}` as BehaviorId);
    assert.ok(decision.durationMs >= 2500 && decision.durationMs <= 4000);
  }

  // 特殊行为：默认关闭；开启后双条件+概率；缺一不触发
  const lowState = dominantState("low_mood");
  for (let seq = 1; seq <= 1000; seq++) {
    assert.notEqual(selectBehavior(context(lowState, seq, { specialEligible: true })).category, "special");
  }
  let specialHits = 0;
  let normalHits = 0;
  for (let seq = 1; seq <= 1000; seq++) {
    const decision = selectBehavior(context(lowState, seq, { specialEligible: true }), enabled);
    if (decision.category === "special") { specialHits++; assert.ok(["drink", "smoke"].includes(decision.behaviorId)); } else normalHits++;
  }
  assert.ok(specialHits > 0 && normalHits > 0);
  for (let seq = 1; seq <= 300; seq++) {
    assert.notEqual(selectBehavior(context(lowState, seq, { specialEligible: false }), enabled).category, "special");
    assert.notEqual(selectBehavior(context(dominantState("cheerfulness"), seq, { specialEligible: true }), enabled).category, "special");
  }

  // 连续低落候选判定（A/B 语义、中断、纠正、同日多条）
  const opts = { lowMoodEmotionLabels: ["sadness"] as const, streakDaysRequired: 3, dayFourSemantics: "A" as const };
  const threeDays = [entry("a", "2026-11-10", "sadness"), entry("b", "2026-11-11", "sadness"), entry("c", "2026-11-12", "sadness")];
  assert.equal(computeSpecialEligibility(threeDays, DAY, opts), true);
  assert.equal(computeSpecialEligibility(threeDays, DAY, { ...opts, dayFourSemantics: "B" }), false);
  assert.equal(computeSpecialEligibility([...threeDays, entry("d", DAY, "sadness")], DAY, { ...opts, dayFourSemantics: "B" }), true);
  assert.equal(computeSpecialEligibility([entry("a", "2026-11-10", "sadness"), entry("b", "2026-11-11", "sadness"), entry("c", DAY, "sadness")], DAY, opts), false);
  assert.equal(computeSpecialEligibility([entry("b", "2026-11-11", "sadness"), entry("c", "2026-11-12", "sadness")], DAY, opts), false);
  assert.equal(computeSpecialEligibility([entry("a", "2026-11-10", "sadness"), entry("b", "2026-11-11", "sadness"), entry("c", "2026-11-12", "joy")], DAY, opts), false);
  assert.equal(computeSpecialEligibility([...threeDays, entry("a2", "2026-11-10", "sadness")], DAY, opts), true);
  assert.equal(computeSpecialEligibility([], DAY, opts), false);

  // 纯函数不修改输入；性格派生不受行为选择影响
  const frozenContext = context(s0, 3);
  const before = JSON.stringify(frozenContext);
  const personalityBefore = JSON.stringify(s0);
  Object.freeze(frozenContext);
  selectBehavior(frozenContext);
  assert.equal(JSON.stringify(frozenContext), before);
  assert.equal(JSON.stringify(s0), personalityBefore);

  // 保存后一次性反馈决策：只改表情/幅度/动画/时长，不改行为与类别
  const base = selectBehavior(context(s0, 11));
  const feedback = selectSaveFeedback(base, emotion("sadness"));
  assert.equal(feedback.behaviorId, base.behaviorId);
  assert.equal(feedback.category, base.category);
  assert.equal(feedback.expression, "sad");
  assert.equal(feedback.reasonCode, "save_feedback");
  assert.equal(feedback.durationMs, BEHAVIOR_V2.saveFeedbackDurationMs);
  assert.equal(feedback.animation, "react");

  // ambient 只受 timeBand 权重影响，且池固定
  const ambientOnly = { ...BEHAVIOR_V2, ambientShare: 1 };
  for (const timeBand of ["morning", "afternoon", "evening", "night"] as const) {
    for (let seq = 1; seq <= 100; seq++) {
      const decision = selectBehavior(context(s0, seq, { timeBand }), ambientOnly);
      assert.equal(decision.category, "ambient");
      assert.ok(["idle_breathe", "idle_glance"].includes(decision.behaviorId));
    }
  }

  console.log("阶段三行为引擎、互动、反馈与特殊判定验证通过");
}
void main();