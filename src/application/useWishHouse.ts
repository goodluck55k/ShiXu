"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addWish,
  completeWishInCollection,
  createEmptyWishCollection,
  createPendingWish,
  type Wish,
  type WishCollection,
} from "@/domain/wishes";
import {
  createLocalStorageWishAdapter,
  WISH_STORAGE_KEY,
  type WishSaveResult,
  type WishStoragePort,
} from "@/lib/storage/wishStorage";
import { createId, localDayKey } from "./ids";
import type { WishActionResult, WishCelebrationSignal } from "./wishTypes";

export type WishPhase = "loading" | "ready" | "corrupt" | "unsupported-version" | "unavailable";

export interface WishCompletionNotice {
  wishId: string;
  text: string;
  nonce: number;
}

interface WishHouseState {
  phase: WishPhase;
  collection: WishCollection | null;
  problem: { raw: string; reason: string } | null;
  saving: boolean;
  busyWishId: string | null;
  tabConflict: boolean;
  celebration: WishCelebrationSignal | null;
  completionNotice: WishCompletionNotice | null;
  recoveryError: string | null;
  loadId: number;
}

type LoadProblemPhase = "corrupt" | "unsupported-version";

type WishAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_MISSING" }
  | { type: "LOAD_READY"; collection: WishCollection }
  | { type: "LOAD_PROBLEM"; phase: LoadProblemPhase; raw: string; reason: string }
  | { type: "LOAD_UNAVAILABLE" }
  | { type: "OP_START"; wishId: string | null; clearCompletion: boolean }
  | { type: "OP_CREATE_OK"; collection: WishCollection }
  | { type: "OP_COMPLETE_OK"; collection: WishCollection; wish: Wish; nonce: number }
  | { type: "OP_FAIL" }
  | { type: "TAB_CONFLICT" }
  | { type: "RESET_OK"; collection: WishCollection }
  | { type: "RECOVERY_FAIL"; message: string };

const PREVIEW_OP_DELAY_MS = 180;

function createInitialState(previewWishes: Wish[] | null): WishHouseState {
  return {
    phase: previewWishes ? "ready" : "loading",
    collection: previewWishes
      ? { schemaVersion: 1, revision: 0, wishes: previewWishes }
      : null,
    problem: null,
    saving: false,
    busyWishId: null,
    tabConflict: false,
    celebration: null,
    completionNotice: null,
    recoveryError: null,
    loadId: 0,
  };
}

function reduceWishState(state: WishHouseState, action: WishAction): WishHouseState {
  switch (action.type) {
    case "LOAD_START":
      return {
        ...state,
        phase: "loading",
        collection: null,
        problem: null,
        saving: false,
        busyWishId: null,
        tabConflict: false,
        celebration: null,
        completionNotice: null,
        recoveryError: null,
        loadId: state.loadId + 1,
      };
    case "LOAD_MISSING":
      return {
        ...state,
        phase: "ready",
        collection: createEmptyWishCollection(),
        problem: null,
        saving: false,
        busyWishId: null,
      };
    case "LOAD_READY":
      return {
        ...state,
        phase: "ready",
        collection: action.collection,
        problem: null,
        saving: false,
        busyWishId: null,
      };
    case "LOAD_PROBLEM":
      return {
        ...state,
        phase: action.phase,
        collection: null,
        problem: { raw: action.raw, reason: action.reason },
        saving: false,
        busyWishId: null,
        tabConflict: false,
        celebration: null,
        completionNotice: null,
      };
    case "LOAD_UNAVAILABLE":
      return {
        ...state,
        phase: "unavailable",
        collection: null,
        problem: null,
        saving: false,
        busyWishId: null,
        tabConflict: false,
        celebration: null,
        completionNotice: null,
      };
    case "OP_START":
      return {
        ...state,
        saving: true,
        busyWishId: action.wishId,
        recoveryError: null,
        completionNotice: action.clearCompletion ? null : state.completionNotice,
      };
    case "OP_CREATE_OK":
      return {
        ...state,
        saving: false,
        busyWishId: null,
        collection: action.collection,
        tabConflict: false,
        completionNotice: null,
      };
    case "OP_COMPLETE_OK": {
      return {
        ...state,
        saving: false,
        busyWishId: null,
        collection: action.collection,
        tabConflict: false,
        celebration: { wishId: action.wish.id, nonce: action.nonce },
        completionNotice: { wishId: action.wish.id, text: action.wish.text, nonce: action.nonce },
      };
    }
    case "OP_FAIL":
      return { ...state, saving: false, busyWishId: null };
    case "TAB_CONFLICT":
      return { ...state, tabConflict: true, saving: false, busyWishId: null };
    case "RESET_OK":
      return {
        ...state,
        phase: "ready",
        collection: action.collection,
        problem: null,
        saving: false,
        busyWishId: null,
        tabConflict: false,
        celebration: null,
        completionNotice: null,
        recoveryError: null,
      };
    case "RECOVERY_FAIL":
      return { ...state, saving: false, busyWishId: null, recoveryError: action.message };
  }
}

function blockedReasonFor(state: WishHouseState): string | null {
  if (state.tabConflict) return "愿望已在其他标签页更新，请先重新加载愿望。";
  switch (state.phase) {
    case "loading":
      return "愿望还在打开中，请稍候。";
    case "corrupt":
    case "unsupported-version":
      return "愿望数据需要先恢复，暂时无法保存。";
    case "unavailable":
      return "浏览器存储不可用，暂时无法保存愿望。";
    default:
      return null;
  }
}

function previewDelay(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, PREVIEW_OP_DELAY_MS));
}

export interface UseWishHouseResult {
  preview: boolean;
  phase: WishPhase;
  wishes: Wish[];
  pendingCount: number;
  completedCount: number;
  problem: { raw: string; reason: string } | null;
  saving: boolean;
  busyWishId: string | null;
  tabConflict: boolean;
  celebration: WishCelebrationSignal | null;
  completionNotice: WishCompletionNotice | null;
  recoveryError: string | null;
  canWrite: boolean;
  blockedReason: string | null;
  loadId: number;
  createWish: (text: string) => Promise<WishActionResult>;
  completeWish: (wishId: string) => Promise<WishActionResult>;
  resetWishes: () => Promise<WishActionResult>;
  exportRaw: () => boolean;
  reloadWishes: () => void;
}

/**
 * 愿望应用层：独立于日记快照。正式数据只在持久化成功后才进入界面状态；
 * 开发预览传入非 null 样例时完全在内存运行，不接触愿望存储。
 */
export function useWishHouse(previewWishes: Wish[] | null): UseWishHouseResult {
  const preview = previewWishes !== null;
  const previewRef = useRef(preview);
  const [storage] = useState<WishStoragePort>(() => createLocalStorageWishAdapter());
  const [state, setState] = useState<WishHouseState>(() => createInitialState(previewWishes));
  const stateRef = useRef(state);
  const savingRef = useRef(false);
  const loadedRef = useRef(false);
  // Monotonic across reload/reset so a new completion can never reuse a consumed animation nonce.
  const celebrationCounterRef = useRef(0);

  const apply = useCallback((action: WishAction) => {
    const next = reduceWishState(stateRef.current, action);
    stateRef.current = next;
    setState(next);
  }, []);

  const load = useCallback(() => {
    if (previewRef.current) return;
    apply({ type: "LOAD_START" });
    const result = storage.load();
    switch (result.status) {
      case "missing":
        apply({ type: "LOAD_MISSING" });
        return;
      case "ready":
        apply({ type: "LOAD_READY", collection: result.collection });
        return;
      case "corrupt":
      case "unsupported-version":
        apply({ type: "LOAD_PROBLEM", phase: result.status, raw: result.raw, reason: result.reason });
        return;
      case "unavailable":
        apply({ type: "LOAD_UNAVAILABLE" });
        return;
    }
  }, [apply, storage]);

  useEffect(() => {
    if (previewRef.current || loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  useEffect(() => {
    if (previewRef.current) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === WISH_STORAGE_KEY) apply({ type: "TAB_CONFLICT" });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [apply]);

  const createWish = useCallback(
    async (text: string): Promise<WishActionResult> => {
      const current = stateRef.current;
      if (savingRef.current) return { ok: false, reason: "正在保存，请稍候。" };
      if (!previewRef.current) {
        if (current.tabConflict) return { ok: false, reason: "愿望已在其他标签页更新，请先重新加载愿望。" };
        if (current.phase !== "ready" || !current.collection) {
          return { ok: false, reason: blockedReasonFor(current) ?? "愿望暂时无法保存。" };
        }
      }
      if (!current.collection) return { ok: false, reason: "愿望还在打开中，请稍候。" };

      let wishId: string;
      try {
        wishId = createId(previewRef.current ? "sample-wish" : "wish");
      } catch {
        return { ok: false, reason: "无法生成愿望标识，请刷新后重试。" };
      }
      const created = createPendingWish(wishId, text, Date.now());
      if (!created.ok) return created;
      const added = addWish(current.collection, created.wish);
      if (!added.ok) return added;

      savingRef.current = true;
      apply({ type: "OP_START", wishId: null, clearCompletion: true });
      try {
        if (previewRef.current) {
          await previewDelay();
          apply({ type: "OP_CREATE_OK", collection: { ...added.collection, revision: current.collection.revision + 1 } });
          return { ok: true };
        }
        const result = await storage.save(added.collection, current.collection.revision);
        if (result.status === "saved") {
          apply({ type: "OP_CREATE_OK", collection: result.collection });
          return { ok: true };
        }
        if (result.status === "conflict") {
          apply({ type: "TAB_CONFLICT" });
          return { ok: false, reason: result.reason };
        }
        if (result.status === "corrupt" || result.status === "unsupported-version") {
          apply({ type: "LOAD_PROBLEM", phase: result.status, raw: result.raw, reason: result.reason });
          return { ok: false, reason: "愿望数据无法读取，本次保存已停止。请先导出原始数据。" };
        }
        apply({ type: "OP_FAIL" });
        return { ok: false, reason: result.reason };
      } catch {
        apply({ type: "OP_FAIL" });
        return { ok: false, reason: "愿望保存失败，请重试。" };
      } finally {
        savingRef.current = false;
      }
    },
    [apply, storage],
  );

  const completeWish = useCallback(
    async (wishId: string): Promise<WishActionResult> => {
      const current = stateRef.current;
      if (savingRef.current) return { ok: false, reason: "正在保存，请稍候。" };
      if (!previewRef.current) {
        if (current.tabConflict) return { ok: false, reason: "愿望已在其他标签页更新，请先重新加载愿望。" };
        if (current.phase !== "ready" || !current.collection) {
          return { ok: false, reason: blockedReasonFor(current) ?? "愿望暂时无法完成。" };
        }
      }
      if (!current.collection) return { ok: false, reason: "愿望还在打开中，请稍候。" };

      const existing = current.collection.wishes.find((wish) => wish.id === wishId);
      if (!existing) return { ok: false, reason: "没有找到这个愿望。" };
      if (existing.status === "completed") return { ok: true };

      const completed = completeWishInCollection(current.collection, wishId, Date.now());
      if (!completed.changed || !completed.wish) {
        return { ok: false, reason: completed.reason ?? "愿望无法完成。" };
      }

      savingRef.current = true;
      apply({ type: "OP_START", wishId, clearCompletion: false });
      try {
        if (previewRef.current) {
          await previewDelay();
          celebrationCounterRef.current += 1;
          apply({
            type: "OP_COMPLETE_OK",
            collection: { ...completed.collection, revision: current.collection.revision + 1 },
            wish: completed.wish,
            nonce: celebrationCounterRef.current,
          });
          return { ok: true };
        }
        const result: WishSaveResult = await storage.save(completed.collection, current.collection.revision);
        if (result.status === "saved") {
          celebrationCounterRef.current += 1;
          apply({
            type: "OP_COMPLETE_OK",
            collection: result.collection,
            wish: completed.wish,
            nonce: celebrationCounterRef.current,
          });
          return { ok: true };
        }
        if (result.status === "conflict") {
          apply({ type: "TAB_CONFLICT" });
          return { ok: false, reason: result.reason };
        }
        if (result.status === "corrupt" || result.status === "unsupported-version") {
          apply({ type: "LOAD_PROBLEM", phase: result.status, raw: result.raw, reason: result.reason });
          return { ok: false, reason: "愿望数据无法读取，本次完成操作已停止。请先导出原始数据。" };
        }
        apply({ type: "OP_FAIL" });
        return { ok: false, reason: result.reason };
      } catch {
        apply({ type: "OP_FAIL" });
        return { ok: false, reason: "愿望完成状态保存失败，请重试。" };
      } finally {
        savingRef.current = false;
      }
    },
    [apply, storage],
  );

  const resetWishes = useCallback(async (): Promise<WishActionResult> => {
    if (previewRef.current) return { ok: false, reason: "开发预览模式不会写入真实存储。" };
    const current = stateRef.current;
    if (savingRef.current) return { ok: false, reason: "正在保存，请稍候。" };
    savingRef.current = true;
    apply({ type: "OP_START", wishId: null, clearCompletion: false });
    try {
      const result = await storage.reset(current.problem?.raw ?? null);
      if (result.status === "saved") {
        apply({ type: "RESET_OK", collection: result.collection });
        return { ok: true };
      }
      if (result.status === "conflict") {
        apply({ type: "TAB_CONFLICT" });
        apply({ type: "RECOVERY_FAIL", message: result.reason });
        return { ok: false, reason: result.reason };
      }
      apply({ type: "RECOVERY_FAIL", message: result.reason });
      return { ok: false, reason: result.reason };
    } catch {
      apply({ type: "RECOVERY_FAIL", message: "愿望数据重置失败，请重试。" });
      return { ok: false, reason: "愿望数据重置失败，请重试。" };
    } finally {
      savingRef.current = false;
    }
  }, [apply, storage]);

  const exportRaw = useCallback((): boolean => {
    if (previewRef.current) return false;
    const raw = stateRef.current.problem?.raw ?? storage.readRaw();
    if (raw === null) return false;
    const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shixu-wishes-raw-${localDayKey(Date.now())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  }, [storage]);

  const reloadWishes = useCallback(() => {
    if (!previewRef.current) load();
  }, [load]);

  const wishes = state.collection?.wishes ?? [];
  const pendingCount = wishes.filter((wish) => wish.status === "pending").length;
  const completedCount = wishes.filter((wish) => wish.status === "completed").length;
  const canWrite = state.phase === "ready" && !state.tabConflict;

  return {
    preview,
    phase: state.phase,
    wishes,
    pendingCount,
    completedCount,
    problem: state.problem,
    saving: state.saving,
    busyWishId: state.busyWishId,
    tabConflict: state.tabConflict,
    celebration: state.celebration,
    completionNotice: state.completionNotice,
    recoveryError: state.recoveryError,
    canWrite,
    blockedReason: blockedReasonFor(state),
    loadId: state.loadId,
    createWish,
    completeWish,
    resetWishes,
    exportRaw,
    reloadWishes,
  };
}