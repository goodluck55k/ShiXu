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
import type { Analysis, AnalysisMeta, EmotionReading, Snapshot } from "@/domain/types";
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

interface PendingConfirm {
  eventId: string;
  entryId: string;
  now: number;
  dayKey: string;
  text: string;
  emotion: EmotionReading;
  analysis: Analysis | null;
  analysisMeta: AnalysisMeta | null;
  candidate: Snapshot;
  expectedRevision: number;
}

export interface AppState {
  phase: "loading" | "ready" | "corrupt" | "unsupported-version" | "unavailable";
  snapshot: Snapshot | null;
  problem: ProblemInfo | null;
  temporary: boolean;
  saving: boolean;
  saveError: string | null;
  savedTick: number;
  pending: PendingConfirm | null;
  tabConflict: boolean;
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
};

type Action =
  | { type: "LOAD_DONE"; result: LoadResult }
  | { type: "SAVE_START"; pending: PendingConfirm }
  | { type: "SAVE_OK"; snapshot: Snapshot }
  | { type: "SAVE_FAIL"; message: string; conflict: boolean }
  | { type: "INVALIDATE_PENDING" }
  | { type: "ENABLE_TEMP" }
  | { type: "TAB_CONFLICT" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_DONE": {
      const base = { ...state, saving: false, pending: null, tabConflict: false, saveError: null };
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
    case "SAVE_OK":
      return {
        ...state,
        phase: "ready",
        problem: null,
        saving: false,
        saveError: null,
        snapshot: action.snapshot,
        pending: null,
        savedTick: state.savedTick + 1,
      };
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
  // 手选传 null。P2 接入 AI 时由调用方传入 source=ai/corrected 与建议，不在此重写为 manual。
  confirmEntry: (
    text: string,
    emotion: EmotionReading,
    analysis?: Analysis | null,
    analysisMeta?: AnalysisMeta | null,
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
    a.intensity === b.intensity
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
    async (pending: PendingConfirm, temporary: boolean): Promise<boolean> => {
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

  const confirmEntry = useCallback(
    async (
      text: string,
      emotion: EmotionReading,
      analysis: Analysis | null = null,
      analysisMeta: AnalysisMeta | null = null,
    ): Promise<boolean> => {
      if (
        state.phase !== "ready" ||
        !state.snapshot ||
        state.saving ||
        state.tabConflict ||
        text.trim().length === 0
      ) {
        return false;
      }
      let pending = state.pending;
      // 同一逻辑操作重试必须复用冻结的 eventId/entryId/now/dayKey，跨午夜不重新归日
      if (
        !pending ||
        pending.text !== text ||
        !sameEmotion(pending.emotion, emotion) ||
        pending.emotion.source !== emotion.source ||
        pending.emotion.confidence !== emotion.confidence ||
        pending.analysis !== analysis ||
        pending.analysisMeta !== analysisMeta
      ) {
        const now = Date.now();
        const dayKey = localDayKey(now);
        const eventId = createId("evt");
        const entryId = createId("entry");
        const result = applyGameEvent(
          state.snapshot,
          {
            type: "CONFIRM_ENTRY",
            eventId,
            entryId,
            text,
            emotion,
            analysis,
            analysisMeta,
          },
          { now, dayKey },
        );
        if (!result.changed) return false;
        pending = {
          eventId,
          entryId,
          now,
          dayKey,
          text,
          emotion,
          analysis,
          analysisMeta,
          candidate: result.snapshot,
          expectedRevision: state.snapshot.revision,
        };
      }
      return saveCandidate(pending, state.temporary);
    },
    [state, saveCandidate],
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