"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BEHAVIOR_V2 } from "@/config/behavior";
import {
  createBehaviorRng,
  selectBehavior,
  selectSaveFeedback,
  type BehaviorDecision,
  type BehaviorId,
  type InteractionType,
  type TimeBand,
} from "@/domain/behavior";
import { deriveCharacterView } from "@/domain/characterView";
import { derivePersonality } from "@/domain/personality";
import type { CharacterView, Snapshot } from "@/domain/types";
import { useApp, type ConfirmedSaveContext } from "./AppProvider";
import { createId, localDayKey } from "./ids";
import { computeSpecialEligibility } from "./lowMoodStreak";

const SESSION_SEED = 1;

// 保存反馈投递归属：正式运行时由 Provider 持有跨页面标记；开发模拟使用自身实例。
export interface SaveFeedbackDelivery {
  hasStarted: (eventId: string) => boolean;
  markStarted: (eventId: string) => void;
}

function timeBandOf(now: number): TimeBand {
  const hour = new Date(now).getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export interface BehaviorRuntime {
  decision: BehaviorDecision | null;
  view: CharacterView | null;
  feedbackActive: boolean;
  paused: boolean;
  interact: (type: InteractionType) => void;
}

export function useBehaviorRuntime(): BehaviorRuntime {
  const { state, hasSaveFeedbackStarted, markSaveFeedbackStarted } = useApp();
  const delivery = useMemo<SaveFeedbackDelivery>(
    () => ({ hasStarted: hasSaveFeedbackStarted, markStarted: markSaveFeedbackStarted }),
    [hasSaveFeedbackStarted, markSaveFeedbackStarted],
  );
  return useBehaviorRuntimeState(state.snapshot, state.lastConfirmedSave, false, 0, delivery);
}

// 开发验收复用同一运行时，但只传入内存快照；正式调用使用 AppProvider 的已提交快照。
export function useBehaviorRuntimeState(snapshot: Snapshot | null, lastConfirmedSave: ConfirmedSaveContext | null, simulation = false, initialSequence = 0, delivery?: SaveFeedbackDelivery): BehaviorRuntime {
  const ready = snapshot !== null;
  const [decision, setDecision] = useState<BehaviorDecision | null>(null);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);

  const sequenceRef = useRef(initialSequence);
  // 本实例内已开始展示的反馈事件；卸载后由 Provider 标记继续去重（模拟实例仅本实例有效）。
  const startedFeedbackEventIdRef = useRef<string | null>(null);
  const lastRef = useRef<{ id: BehaviorId | null; count: number }>({ id: null, count: 0 });
  const autonomousRef = useRef<BehaviorDecision | null>(null);
  const modeRef = useRef<"auto" | "interaction" | "feedback">("auto");
  const tickTimerRef = useRef<number | null>(null);
  const endTimerRef = useRef<number | null>(null);
  const actionEndTimerRef = useRef<number | null>(null);
  // 即时情绪只在保存后的运行时有效期内影响表情/幅度；刷新即失，不重新激活。
  const emotionExpiresAtRef = useRef(0);
  const liveRef = useRef({ snapshot });
  const scheduleTickRef = useRef<() => void>(() => {});
  const selectNextRef = useRef<(allowSpecial?: boolean) => BehaviorDecision | null>(() => null);

  const clearTick = useCallback(() => {
    if (tickTimerRef.current !== null) {
      window.clearTimeout(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  const clearEnd = useCallback(() => {
    if (endTimerRef.current !== null) {
      window.clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
  }, []);

  const clearAction = useCallback(() => {
    if (actionEndTimerRef.current !== null) {
      window.clearTimeout(actionEndTimerRef.current);
      actionEndTimerRef.current = null;
    }
  }, []);

  const selectNext = useCallback((allowSpecial = true): BehaviorDecision | null => {
    const current = liveRef.current.snapshot;
    if (!current) return null;
    const now = Date.now();
    const dayKey = localDayKey(now);
    sequenceRef.current += 1;
    const next = selectBehavior({
      personality: derivePersonality(current.personality),
      emotion: now < emotionExpiresAtRef.current ? current.character.currentEmotion : null,
      interaction: null,
      specialEligible:
        allowSpecial && (BEHAVIOR_V2.specialBehaviorEnabled || simulation) &&
        computeSpecialEligibility(current.entries, dayKey, BEHAVIOR_V2.special),
      dayKey,
      timeBand: timeBandOf(now),
      sequence: sequenceRef.current,
      seed: SESSION_SEED,
      lastBehaviorId: lastRef.current.id,
      consecutiveCount: lastRef.current.count,
    }, simulation ? { ...BEHAVIOR_V2, specialBehaviorEnabled: true } : BEHAVIOR_V2);
    lastRef.current =
      next.behaviorId === lastRef.current.id
        ? { id: next.behaviorId, count: lastRef.current.count + 1 }
        : { id: next.behaviorId, count: 1 };
    autonomousRef.current = next;
    if (modeRef.current === "auto") {
      setDecision(next);
      clearAction();
      if (next.category === "special") {
        actionEndTimerRef.current = window.setTimeout(() => {
          if (modeRef.current !== "auto" || document.visibilityState !== "visible") return;
          selectNextRef.current(false);
          scheduleTickRef.current();
        }, next.durationMs);
      } else if (next.animation !== "none") {
        // 动作按配置时长结束动画，保持姿态等待下一次 tick 选择
        actionEndTimerRef.current = window.setTimeout(() => {
          if (modeRef.current === "auto") setDecision((d) => (d ? { ...d, animation: "none" } : d));
        }, next.durationMs);
      }
    }
    return next;
  }, [clearAction, simulation]);

  useEffect(() => { selectNextRef.current = selectNext; }, [selectNext]);

  const scheduleTick = useCallback(() => {
    clearTick();
    if (!liveRef.current.snapshot || document.visibilityState !== "visible") return;
    const now = Date.now();
    const rng = createBehaviorRng(SESSION_SEED, localDayKey(now), sequenceRef.current + 1, BEHAVIOR_V2.rulesVersion);
    const [min, max] = BEHAVIOR_V2.tickIntervalMs;
    tickTimerRef.current = window.setTimeout(() => {
      selectNext();
      scheduleTickRef.current();
    }, min + Math.floor(rng() * (max - min + 1)));
  }, [clearTick, selectNext]);

  useEffect(() => {
    scheduleTickRef.current = scheduleTick;
  }, [scheduleTick]);

  useEffect(() => {
    liveRef.current = { snapshot };
  }, [snapshot]);

  const resumeAuto = useCallback(() => {
    clearEnd();
    clearAction();
    modeRef.current = "auto";
    setFeedbackActive(false);
    selectNext();
    scheduleTick();
  }, [clearEnd, clearAction, selectNext, scheduleTick]);

  useEffect(() => {
    if (!ready) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearTick();
        clearEnd();
        clearAction();
        modeRef.current = "auto";
        setDecision(null);
        setFeedbackActive(false);
        setPaused(true);
      } else {
        setPaused(false);
        selectNext();
        scheduleTick();
      }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTick();
      clearEnd();
      clearAction();
    };
  }, [ready, clearTick, clearEnd, clearAction, selectNext, scheduleTick]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const interact = useCallback(
    (type: InteractionType) => {
      const current = liveRef.current.snapshot;
      if (!current) return;
      clearTick();
      clearEnd();
      clearAction();
      const now = Date.now();
      sequenceRef.current += 1;
      const next = selectBehavior({
        personality: derivePersonality(current.personality),
        emotion: now < emotionExpiresAtRef.current ? current.character.currentEmotion : null,
        interaction: { id: createId("int"), type, occurredAt: now, seed: SESSION_SEED },
        specialEligible: false,
        dayKey: localDayKey(now),
        timeBand: timeBandOf(now),
        sequence: sequenceRef.current,
        seed: SESSION_SEED,
        lastBehaviorId: lastRef.current.id,
        consecutiveCount: lastRef.current.count,
      });
      modeRef.current = "interaction";
      setFeedbackActive(false);
      setDecision(next);
      endTimerRef.current = window.setTimeout(resumeAuto, next.durationMs);
    },
    [clearTick, clearEnd, clearAction, resumeAuto],
  );

  const reunionPending = snapshot?.reunion.pending ?? null;

  useEffect(() => {
    if (!ready || !lastConfirmedSave) return;
    // 页面隐藏时保留待投递状态：既不展示，也不写入“已开始展示”标记。
    if (document.visibilityState !== "visible" || paused) return;
    const eventId = lastConfirmedSave.eventId;
    const started =
      startedFeedbackEventIdRef.current === eventId || (delivery?.hasStarted(eventId) ?? false);
    if (started) {
      // StrictMode 重跑会先清理可见性 effect 的计时器；仅在仍处于反馈模式且计时器缺失时补一次。
      if (modeRef.current === "feedback" && endTimerRef.current === null) {
        endTimerRef.current = window.setTimeout(resumeAuto, BEHAVIOR_V2.saveFeedbackDurationMs);
      }
      return;
    }
    // 重逢问候优先：未处理时既不展示保存反馈，也不提前消费；确认失败时继续门控。
    if (reunionPending) return;
    // 隐藏与重逢门控的等待时间同样计入有效期；过期直接丢弃，不排队延后补播。
    if (!(Date.now() < lastConfirmedSave.savedAt + BEHAVIOR_V2.saveFeedbackTtlMs)) return;
    const previous = autonomousRef.current;
    const base = previous?.category === "special" ? selectNext(false) : previous ?? selectNext(false);
    if (!base) return;
    clearTick();
    clearEnd();
    clearAction();
    startedFeedbackEventIdRef.current = eventId;
    delivery?.markStarted(eventId);
    emotionExpiresAtRef.current = Date.now() + BEHAVIOR_V2.emotionExpressionDurationMs;
    modeRef.current = "feedback";
    setFeedbackActive(true);
    setDecision(selectSaveFeedback(base, lastConfirmedSave.emotion));
    endTimerRef.current = window.setTimeout(resumeAuto, BEHAVIOR_V2.saveFeedbackDurationMs);
  }, [ready, lastConfirmedSave, reunionPending, paused, delivery, clearTick, clearEnd, clearAction, selectNext, resumeAuto]);

  const view = useMemo(() => {
    if (!snapshot) return null;
    const effective = decision && reducedMotion ? { ...decision, animation: "none" } : decision;
    return deriveCharacterView(snapshot, effective);
  }, [snapshot, decision, reducedMotion]);

  return { decision, view, feedbackActive, paused, interact };
}
