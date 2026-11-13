"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MANUAL_EMOTION_DEFAULTS } from "@/domain/emotions";
import type { EmotionDimensions, EmotionLabel } from "@/domain/types";
import { applyGameEvent, createInitialSnapshot } from "@/domain/rules";
import { OFFLINE_LIFE_V1 } from "@/config/offlineLife";
import { derivePersonality } from "@/domain/personality";
import { planOfflineLife } from "@/domain/offlineLife";
import type {
  ActivityCheckpointEvent,
  Analysis,
  AnalysisMeta,
  EmotionReading,
  GameContext,
  GameEvent,
  SessionStartedEvent,
  Snapshot,
} from "@/domain/types";
import {
  createLocalStorageAdapter,
  SNAPSHOT_STORAGE_KEY,
} from "@/lib/storage/localStorageAdapter";
import type { LoadResult, StoragePort } from "@/lib/storage/port";
import { createId, localDayKey } from "./ids";

interface ProblemInfo {
  raw: string;
  reason: string;
}

interface PendingOperation {
  event: GameEvent;
  now: number;
  dayKey: string;
  candidate: Snapshot;
  expectedRevision: number;
}

// C1 → C4 接口：保存成功结果与本次确认情绪，运行时内存，供 C4 构造一次性共鸣上下文
export interface ConfirmedSaveContext {
  eventId: string;
  entryId: string;
  emotion: EmotionReading;
  savedAt: number;
}

export interface AppState {
  phase: "loading" | "ready" | "corrupt" | "unsupported-version" | "unavailable";
  snapshot: Snapshot | null;
  problem: ProblemInfo | null;
  temporary: boolean;
  saving: boolean;
  saveError: string | null;
  savedTick: number;
  pending: PendingOperation | null;
  tabConflict: boolean;
  lastConfirmedSave: ConfirmedSaveContext | null;
  loadId: number;
}

const initialState: AppState = {
  phase: "loading",
  snapshot: null,
  problem: null,
  temporary: false,
  saving: false,
  saveError: null,
  savedTick: 0,
  pending: null,
  tabConflict: false,
  lastConfirmedSave: null,
  loadId: 0,
};

type Action =
  | { type: "LOAD_DONE"; result: LoadResult }
  | { type: "SAVE_START"; pending: PendingOperation }
  | { type: "SAVE_OK"; snapshot: Snapshot }
  | { type: "SAVE_FAIL"; message: string; conflict: boolean }
  | { type: "COMMIT_SNAPSHOT"; snapshot: Snapshot }
  | { type: "INVALIDATE_PENDING" }
  | { type: "ENABLE_TEMP" }
  | { type: "TAB_CONFLICT" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_DONE": {
      const base = {
        ...state,
        saving: false,
        pending: null,
        tabConflict: false,
        saveError: null,
        lastConfirmedSave: null,
        loadId: state.loadId + 1,
      };
      const result = action.result;
      switch (result.status) {
        case "missing":
          return { ...base, phase: "ready", snapshot: createInitialSnapshot(), problem: null, temporary: false };
        case "ready":
          return { ...base, phase: "ready", snapshot: result.snapshot, problem: null, temporary: false };
        case "corrupt":
        case "unsupported-version":
          return {
            ...base,
            phase: result.status,
            snapshot: null,
            problem: { raw: result.raw, reason: result.reason },
            temporary: false,
          };
        case "unavailable":
          return { ...base, phase: "unavailable", snapshot: null, problem: null, temporary: false };
      }
      return base;
    }
    case "SAVE_START":
      return { ...state, saving: true, saveError: null, pending: action.pending };
    case "SAVE_OK": {
      const pending = state.pending;
      const lastConfirmedSave =
        pending && pending.event.type === "CONFIRM_ENTRY"
          ? {
              eventId: pending.event.eventId,
              entryId: pending.event.entryId,
              emotion: pending.event.emotion,
              savedAt: pending.now,
            }
          : state.lastConfirmedSave;
      return {
        ...state,
        phase: "ready",
        problem: null,
        saving: false,
        saveError: null,
        snapshot: action.snapshot,
        pending: null,
        savedTick: state.savedTick + 1,
        lastConfirmedSave,
      };
    }
    case "SAVE_FAIL":
      return { ...state, saving: false, saveError: action.message, tabConflict: action.conflict };
    case "INVALIDATE_PENDING":
      return state.pending || state.saveError
        ? { ...state, pending: null, saveError: null }
        : state;
    case "ENABLE_TEMP":
      return {
        ...state,
        phase: "ready",
        snapshot: createInitialSnapshot(),
        temporary: true,
        problem: null,
        pending: null,
        saveError: null,
        lastConfirmedSave: null,
      };
    case "COMMIT_SNAPSHOT":
      return { ...state, phase: "ready", problem: null, snapshot: action.snapshot };
    case "TAB_CONFLICT":
      return { ...state, tabConflict: true };
  }
}

interface AppContextValue {
  state: AppState;
  draft: { text: string; label: EmotionLabel | null; dimensions: EmotionDimensions };
  setDraft: React.Dispatch<React.SetStateAction<{ text: string; label: EmotionLabel | null; dimensions: EmotionDimensions }>>;
  // emotion 携带调用方确认的真实 source/confidence；analysis/analysisMeta 为规范化 AI 建议，
  // 手选传 null。C2 接入 AI 时由调用方传入 source=ai/corrected 与建议，不在此重写为 manual。
  confirmEntry: (
    text: string,
    emotion: EmotionReading,
    analysis?: Analysis | null,
    analysisMeta?: AnalysisMeta | null,
  ) => Promise<boolean>;
  correctEmotion: (
    entryId: string,
    expectedEntryRevision: number,
    emotion: EmotionReading,
    analysis?: Analysis | null,
    analysisMeta?: AnalysisMeta | null,
  ) => Promise<boolean>;
  editEntryText: (
    entryId: string,
    expectedEntryRevision: number,
    text: string,
  ) => Promise<boolean>;
  retrySave: () => Promise<boolean>;
  invalidatePending: () => void;
  reload: () => Promise<void>;
  enableTemporary: () => void;
  resetStorage: () => Promise<void>;
  exportRaw: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function sameEmotion(a: EmotionReading, b: EmotionReading): boolean {
  return (
    a.label === b.label &&
    a.valence === b.valence &&
    a.arousal === b.arousal &&
    a.dominance === b.dominance &&
    a.intensity === b.intensity &&
    a.source === b.source &&
    a.confidence === b.confidence
  );
}

const CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVITY_RESCUE_KEY = "shixu.activityRescue";

// 同标签页救援时间戳：仅用于避免刷新/恢复被误判离线；不是正式存档，不替代 StoragePort。
function readActivityRescue(): number | null {
  try {
    const raw = window.sessionStorage.getItem(ACTIVITY_RESCUE_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeActivityRescue(at: number): void {
  try {
    window.sessionStorage.setItem(ACTIVITY_RESCUE_KEY, String(at));
  } catch {
    // 隐私模式等禁用存储时忽略；降级为最后一次成功的 lastActiveAt。
  }
}

function clearActivityRescue(): void {
  try {
    window.sessionStorage.removeItem(ACTIVITY_RESCUE_KEY);
  } catch {
    // 忽略
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draft, setDraft] = useState<{ text: string; label: EmotionLabel | null; dimensions: EmotionDimensions }>({ text: "", label: null, dimensions: MANUAL_EMOTION_DEFAULTS.neutral });
  const savingRef = useRef(false);
  const [storage] = useState<StoragePort>(() => createLocalStorageAdapter());
  const sessionStartedRef = useRef(false);
  const sessionDoneLoadRef = useRef(-1);
  const loadedRef = useRef(false);
  const snapshotRef = useRef<Snapshot | null>(state.snapshot);
  const temporaryRef = useRef(state.temporary);
  const tabConflictRef = useRef(state.tabConflict);
  useEffect(() => {
    snapshotRef.current = state.snapshot;
    temporaryRef.current = state.temporary;
    tabConflictRef.current = state.tabConflict;
  });

  const load = useCallback(async () => {
    sessionStartedRef.current = false;
    dispatch({ type: "LOAD_DONE", result: await storage.load() });
  }, [storage]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [load]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SNAPSHOT_STORAGE_KEY && !state.temporary) {
        dispatch({ type: "TAB_CONFLICT" });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [state.temporary]);

  // 会话开始：先按当前基准计算离线窗口，再推进访问时间；只有保存成功才提交正式状态。
  const startSession = useCallback(
    async (snapshot: Snapshot) => {
      const now = Date.now();
      const dominantId = derivePersonality(snapshot.personality).dominantId;
      const plan = planOfflineLife(
        {
          lastActiveAt: snapshot.offlineLife.lastActiveAt,
          lastVisitAt: snapshot.offlineLife.lastVisitAt,
          now,
          dominantId,
        },
        OFFLINE_LIFE_V1,
      );
      // 同标签页刷新救援：最近活动距今不足最小离线时长时抑制事件，避免把刷新误判为离线。
      // 只抑制事件生成，不改变 windowStart（必须等于快照基准，否则领域拒绝提交）。
      const rescue = readActivityRescue();
      const refreshRescue =
        rescue !== null &&
        rescue <= now &&
        plan.windowStart !== null &&
        rescue > plan.windowStart &&
        now - rescue < OFFLINE_LIFE_V1.minAbsenceMs;
      const event: SessionStartedEvent = {
        type: "SESSION_STARTED",
        eventId: `session:${plan.windowStart ?? "first"}`,
        windowStart: plan.windowStart,
        offlineEvents: refreshRescue ? [] : plan.events,
        reunionTriggered: false,
      };
      const result = applyGameEvent(snapshot, event, { now, dayKey: localDayKey(now) });
      if (!result.changed) {
        sessionStartedRef.current = true;
        clearActivityRescue();
        return;
      }
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        const saved = await storage.save(result.snapshot, snapshot.revision);
        if (saved.status === "saved") {
          sessionStartedRef.current = true;
          clearActivityRescue();
          dispatch({ type: "COMMIT_SNAPSHOT", snapshot: saved.snapshot });
        } else if (saved.status === "conflict") {
          dispatch({ type: "TAB_CONFLICT" });
        }
        // 其他失败静默降级：保留最后成功的基准与事件，不改变正式访问时间。
      } finally {
        savingRef.current = false;
      }
    },
    [storage],
  );

  useEffect(() => {
    if (state.phase !== "ready" || !state.snapshot || state.temporary) return;
    if (sessionDoneLoadRef.current === state.loadId) return;
    sessionDoneLoadRef.current = state.loadId;
    void startSession(state.snapshot);
  }, [state.loadId, state.phase, state.snapshot, state.temporary, startSession]);

  // 活动检查点：单调推进 lastActiveAt，不进 appliedEventIds/回忆/五维；失败按最后成功值降级。
  const checkpoint = useCallback(async () => {
    const snapshot = snapshotRef.current;
    if (!snapshot || temporaryRef.current || tabConflictRef.current || savingRef.current) return;
    const now = Date.now();
    const event: ActivityCheckpointEvent = {
      type: "ACTIVITY_CHECKPOINT",
      eventId: `checkpoint:${now}`,
      at: now,
    };
    const result = applyGameEvent(snapshot, event, { now, dayKey: localDayKey(now) });
    if (!result.changed) return;
    savingRef.current = true;
    try {
      const saved = await storage.save(result.snapshot, snapshot.revision);
      if (saved.status === "saved") {
        dispatch({ type: "COMMIT_SNAPSHOT", snapshot: saved.snapshot });
      }
      // 冲突/失败静默跳过：跨标签页冲突由 storage 事件与日记保存的 expectedRevision 兜底。
    } finally {
      savingRef.current = false;
    }
  }, [storage]);

  useEffect(() => {
    if (state.phase !== "ready" || state.temporary) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkpoint();
    }, CHECKPOINT_INTERVAL_MS);
    const rescueNow = () => {
      // 仅在会话已成功提交后写救援时间戳；失败会话不写，刷新后保留真实离线窗口。
      if (sessionStartedRef.current) writeActivityRescue(Date.now());
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        rescueNow();
        void checkpoint();
      }
    };
    const onPageHide = () => {
      rescueNow();
      void checkpoint();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [state.phase, state.temporary, checkpoint]);

  const saveCandidate = useCallback(
    async (pending: PendingOperation, temporary: boolean): Promise<boolean> => {
      if (savingRef.current) return false;
      savingRef.current = true;
      dispatch({ type: "SAVE_START", pending });
      try {
        if (temporary) {
          dispatch({
            type: "SAVE_OK",
            snapshot: { ...pending.candidate, revision: pending.expectedRevision + 1 },
          });
          return true;
        }
        const result = await storage.save(pending.candidate, pending.expectedRevision);
        if (result.status === "saved") {
          dispatch({ type: "SAVE_OK", snapshot: result.snapshot });
          return true;
        }
        const conflict = result.status === "conflict";
        const message = conflict ? `${result.reason}（提交已暂停）` : result.reason;
        dispatch({ type: "SAVE_FAIL", message, conflict });
        return false;
      } finally {
        savingRef.current = false;
      }
    },
    [storage],
  );

  const runOperation = useCallback(
    async (
      build: () => { event: GameEvent; context: GameContext } | null,
      matchesPending: (pendingEvent: GameEvent) => boolean,
    ): Promise<boolean> => {
      if (state.phase !== "ready" || !state.snapshot || state.saving || state.tabConflict) {
        return false;
      }
      let pending = state.pending;
      // 同一逻辑操作重试必须复用冻结的 eventId/entryId/now/dayKey，跨午夜不重新归日
      if (!pending || !matchesPending(pending.event)) {
        const built = build();
        if (!built) return false;
        const result = applyGameEvent(state.snapshot, built.event, built.context);
        if (!result.changed) return false;
        pending = {
          event: built.event,
          now: built.context.now,
          dayKey: built.context.dayKey,
          candidate: result.snapshot,
          expectedRevision: state.snapshot.revision,
        };
      }
      return saveCandidate(pending, state.temporary);
    },
    [state, saveCandidate],
  );

  const confirmEntry = useCallback(
    async (
      text: string,
      emotion: EmotionReading,
      analysis: Analysis | null = null,
      analysisMeta: AnalysisMeta | null = null,
    ): Promise<boolean> => {
      return runOperation(
        () => {
          if (text.trim().length === 0) return null;
          const now = Date.now();
          return {
            event: {
              type: "CONFIRM_ENTRY",
              eventId: createId("evt"),
              entryId: createId("entry"),
              text,
              emotion,
              analysis,
              analysisMeta,
            },
            context: { now, dayKey: localDayKey(now) },
          };
        },
        (pendingEvent) =>
          pendingEvent.type === "CONFIRM_ENTRY" &&
          pendingEvent.text === text &&
          sameEmotion(pendingEvent.emotion, emotion) &&
          pendingEvent.analysis === analysis &&
          pendingEvent.analysisMeta === analysisMeta,
      );
    },
    [runOperation],
  );

  const correctEmotion = useCallback(
    async (
      entryId: string,
      expectedEntryRevision: number,
      emotion: EmotionReading,
      analysis: Analysis | null = null,
      analysisMeta: AnalysisMeta | null = null,
    ): Promise<boolean> => {
      return runOperation(
        () => {
          const now = Date.now();
          return {
            event: {
              type: "CORRECT_EMOTION",
              eventId: createId("evt"),
              entryId,
              expectedEntryRevision,
              emotion,
              analysis,
              analysisMeta,
            },
            context: { now, dayKey: localDayKey(now) },
          };
        },
        (pendingEvent) =>
          pendingEvent.type === "CORRECT_EMOTION" &&
          pendingEvent.entryId === entryId &&
          pendingEvent.expectedEntryRevision === expectedEntryRevision &&
          sameEmotion(pendingEvent.emotion, emotion) &&
          pendingEvent.analysis === analysis &&
          pendingEvent.analysisMeta === analysisMeta,
      );
    },
    [runOperation],
  );

  const editEntryText = useCallback(
    async (entryId: string, expectedEntryRevision: number, text: string): Promise<boolean> => {
      return runOperation(
        () => {
          if (text.trim().length === 0) return null;
          const now = Date.now();
          return {
            event: {
              type: "EDIT_ENTRY_TEXT",
              eventId: createId("evt"),
              entryId,
              expectedEntryRevision,
              text,
            },
            context: { now, dayKey: localDayKey(now) },
          };
        },
        (pendingEvent) =>
          pendingEvent.type === "EDIT_ENTRY_TEXT" &&
          pendingEvent.entryId === entryId &&
          pendingEvent.expectedEntryRevision === expectedEntryRevision &&
          pendingEvent.text === text,
      );
    },
    [runOperation],
  );

  const retrySave = useCallback(async (): Promise<boolean> => {
    if (!state.pending || state.saving || state.tabConflict || state.phase !== "ready") {
      return false;
    }
    return saveCandidate(state.pending, state.temporary);
  }, [state, saveCandidate]);

  const invalidatePending = useCallback(() => dispatch({ type: "INVALIDATE_PENDING" }), []);
  const reload = useCallback(async () => load(), [load]);
  const enableTemporary = useCallback(() => dispatch({ type: "ENABLE_TEMP" }), []);

  const resetStorage = useCallback(async () => {
    const result = await storage.reset();
    if (result.status === "saved") {
      dispatch({ type: "SAVE_OK", snapshot: result.snapshot });
      return;
    }
    dispatch({ type: "SAVE_FAIL", message: result.reason, conflict: false });
  }, [storage]);

  const exportRaw = useCallback(() => {
    const raw = state.problem?.raw ?? storage.readRaw();
    if (raw === null) return;
    const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shixu-snapshot-raw-${localDayKey(Date.now())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [state.problem, storage]);

  const value: AppContextValue = {
    state,
    draft,
    setDraft,
    confirmEntry,
    correctEmotion,
    editEntryText,
    retrySave,
    invalidatePending,
    reload,
    enableTemporary,
    resetStorage,
    exportRaw,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp 必须在 AppProvider 内使用");
  return context;
}