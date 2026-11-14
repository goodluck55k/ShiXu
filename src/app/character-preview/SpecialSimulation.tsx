"use client";

import { useMemo, useState } from "react";
import { useBehaviorRuntimeState } from "@/application/useBehaviorRuntime";
import { localDayKey } from "@/application/ids";
import { computeSpecialEligibility } from "@/application/lowMoodStreak";
import { BEHAVIOR_V2 } from "@/config/behavior";
import { CharacterRenderer } from "@/components/character/CharacterRenderer";
import { selectBehavior } from "@/domain/behavior";
import { derivePersonality } from "@/domain/personality";
import { applyGameEvent, createInitialSnapshot } from "@/domain/rules";
import type { EmotionReading, Snapshot } from "@/domain/types";
import type { ConfirmedSaveContext } from "@/application/AppProvider";

const sad: EmotionReading = { label: "sadness", intensity: 1, valence: .2, arousal: .3, dominance: .3, source: "manual", confidence: null };

function scenario() {
  const now = Date.now();
  let snapshot = createInitialSnapshot();
  for (let offset = 3; offset >= 0; offset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const dayKey = localDayKey(date.getTime());
    snapshot = applyGameEvent(snapshot, { type: "CONFIRM_ENTRY", eventId: `sim-${offset}`, entryId: `sim-${offset}`, text: "模拟日记", emotion: sad, analysis: null, analysisMeta: null }, { now: date.getTime(), dayKey }).snapshot;
  }
  return { snapshot, today: localDayKey(now) };
}

function Playback({ snapshot, sequence, onFeedback }: { snapshot: Snapshot; sequence: number; onFeedback: number }) {
  const feedback = useMemo<ConfirmedSaveContext | null>(() => onFeedback ? { eventId: `simulation-${onFeedback}`, entryId: "simulation", emotion: sad, savedAt: 0 } : null, [onFeedback]);
  // 开发模式 StrictMode 会在挂载时重新执行一次可见性 effect。
  const { decision, view, paused, interact } = useBehaviorRuntimeState(snapshot, feedback, true, sequence - 2);
  return <div>
    <p aria-live="polite">{paused ? "已暂停" : `${decision?.behaviorId ?? "准备中"} · ${decision?.reasonCode ?? ""}`}</p>
    <div style={{ width: 180 }} className={paused ? "scene-character is-paused" : undefined}>{view && <CharacterRenderer view={view} />}</div>
    <button type="button" onClick={() => interact("pat")}>模拟互动</button>
  </div>;
}

export function SpecialSimulation() {
  const [run, setRun] = useState<{ sequence: number; key: number; snapshot: Snapshot } | null>(null);
  const [feedback, setFeedback] = useState(0);
  const play = (id: "smoke" | "drink") => {
    const data = scenario();
    const eligible = computeSpecialEligibility(data.snapshot.entries, data.today, BEHAVIOR_V2.special);
    const personality = derivePersonality(data.snapshot.personality);
    for (let sequence = 1; sequence <= 10000; sequence++) {
      const decision = selectBehavior({ personality, emotion: null, interaction: null, specialEligible: eligible, dayKey: data.today, timeBand: "afternoon", sequence, seed: 1, lastBehaviorId: null, consecutiveCount: 0 }, { ...BEHAVIOR_V2, specialBehaviorEnabled: true });
      if (decision.behaviorId === id) { setFeedback(0); setRun(previous => ({ sequence, snapshot: data.snapshot, key: (previous?.key ?? 0) + 1 })); return; }
    }
  };
  return <section>
    <h2>特殊行为接入模拟（仅开发验收）</h2>
    <p>四天模拟日记与性格只存在于内存；通过正式判定和确定性选择查找命中种子，不读取或写入真实存档。</p>
    <button type="button" onClick={() => play("smoke")}>模拟命中抽烟</button>{" "}
    <button type="button" onClick={() => play("drink")}>模拟命中喝酒</button>{" "}
    <button type="button" onClick={() => setFeedback(n => n + 1)} disabled={!run}>模拟保存反馈</button>
    {run && <Playback key={run.key} snapshot={run.snapshot} sequence={run.sequence} onFeedback={feedback} />}
  </section>;
}
