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
import type {
  Analysis,
  AnalysisMeta,
  EmotionReading,
  GameContext,
  GameEvent,
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
};

type Action =
  | { type: "LOAD_DONE"; result: LoadResult }
  | { type: "SAVE_START"; pending: PendingOperation }
  | { type: "SAVE_OK"; snapshot: Snapshot }
  | { type: "SAVE_FAIL"; message: string; conflict: boolean }
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draft, setDraft] = useState<{ text: string; label: EmotionLabel | null; dimensions: EmotionDimensions }>({ text: "", label: null, dimensions: MANUAL_EMOTION_DEFAULTS.neutral });
  const savingRef = useRef(false);
  const [storage] = useState<StoragePort>(() => createLocalStorageAdapter());

  const load = useCallback(async () => {
    dispatch({ type: "LOAD_DONE", result: await storage.load() });
  }, [storage]);

  useEffect(() => {
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