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
import type { CharacterView } from "@/domain/types";
import { useApp } from "./AppProvider";
import { createId, localDayKey } from "./ids";
import { computeSpecialEligibility } from "./lowMoodStreak";

const SESSION_SEED = 1;

// 会话级消费标记：同一保存事件在组件重挂载后也不重复反馈；刷新即失。
let consumedSaveEventId: string | null = null;

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
  const { state } = useApp();
  const snapshot = state.snapshot;
  const ready = snapshot !== null;
  const [decision, setDecision] = useState<BehaviorDecision | null>(null);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);

  const sequenceRef = useRef(0);
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

  const selectNext = useCallback((): BehaviorDecision | null => {
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
        BEHAVIOR_V2.specialBehaviorEnabled &&
        computeSpecialEligibility(current.entries, dayKey, BEHAVIOR_V2.special),
      dayKey,
      timeBand: timeBandOf(now),
      sequence: sequenceRef.current,
      seed: SESSION_SEED,
      lastBehaviorId: lastRef.current.id,
      consecutiveCount: lastRef.current.count,
    });
    lastRef.current =
      next.behaviorId === lastRef.current.id
        ? { id: next.behaviorId, count: lastRef.current.count + 1 }
        : { id: next.behaviorId, count: 1 };
    autonomousRef.current = next;
    if (modeRef.current === "auto") {
      setDecision(next);
      clearAction();
      if (next.animation !== "none") {
        // 动作按配置时长结束动画，保持姿态等待下一次 tick 选择
        actionEndTimerRef.current = window.setTimeout(() => {
          if (modeRef.current === "auto") setDecision((d) => (d ? { ...d, animation: "none" } : d));
        }, next.durationMs);
      }
    }
    return next;
  }, [clearAction]);

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

  const lastConfirmedSave = state.lastConfirmedSave;
  useEffect(() => {
    if (!lastConfirmedSave) return;
    if (lastConfirmedSave.eventId !== consumedSaveEventId) {
      consumedSaveEventId = lastConfirmedSave.eventId;
      const base = autonomousRef.current ?? selectNext();
      if (!base) return;
      clearAction();
      emotionExpiresAtRef.current = Date.now() + BEHAVIOR_V2.emotionExpressionDurationMs;
      modeRef.current = "feedback";
      setFeedbackActive(true);
      setDecision(selectSaveFeedback(base, lastConfirmedSave.emotion));
    }
    // StrictMode 双调用会经可见性 effect 的清理清掉结束定时器，仍处于反馈模式时须重新计时
    if (modeRef.current === "feedback") {
      clearEnd();
      endTimerRef.current = window.setTimeout(resumeAuto, BEHAVIOR_V2.saveFeedbackDurationMs);
    }
  }, [lastConfirmedSave, clearEnd, clearAction, selectNext, resumeAuto]);

  const view = useMemo(() => {
    if (!snapshot) return null;
    const effective = decision && reducedMotion ? { ...decision, animation: "none" } : decision;
    return deriveCharacterView(snapshot, effective);
  }, [snapshot, decision, reducedMotion]);

  return { decision, view, feedbackActive, paused, interact };
}