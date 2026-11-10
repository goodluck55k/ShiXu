import { migrateSnapshotV1toV2 } from "@/domain/companion";
import { createInitialSnapshot } from "@/domain/rules";
import { serializeSnapshot, validateSnapshot, validateSnapshotJson } from "@/domain/schema";
import type { Snapshot } from "@/domain/types";
import type { LoadResult, SaveResult, StoragePort } from "./port";

export const SNAPSHOT_STORAGE_KEY = "shixu.snapshot.v1";

function storageUnavailableReason(error: unknown): string {
  void error;
  return "浏览器本地存储不可用";
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function createLocalStorageAdapter(): StoragePort {
  function getStorage(): Storage {
    if (typeof window === "undefined") throw new Error("localStorage 仅在客户端可用");
    return window.localStorage;
  }

  function readRawSafe(): string | null {
    try {
      return getStorage().getItem(SNAPSHOT_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function writeSnapshot(snapshot: Snapshot, expectedRevision: number): SaveResult {
    const validation = validateSnapshot(snapshot);
    if (!validation.ok) return { status: "invalid", reason: validation.reason };
    let storage: Storage;
    let raw: string | null;
    try {
      storage = getStorage();
      raw = storage.getItem(SNAPSHOT_STORAGE_KEY);
    } catch (error) {
      return { status: "unavailable", reason: storageUnavailableReason(error) };
    }
    if (raw !== null) {
      const existing = validateSnapshotJson(raw);
      if (!existing.ok) {
        return { status: "conflict", reason: "现有存档损坏或版本不支持，请先导出并重置" };
      }
      if (existing.snapshot.revision !== expectedRevision) {
        return { status: "conflict", reason: "存档已在其他位置更新，请重新加载" };
      }
    } else if (expectedRevision !== 0) {
      return { status: "conflict", reason: "存档已被清除，请重新加载" };
    }
    const next: Snapshot = { ...validation.snapshot, revision: expectedRevision + 1 };
    try {
      storage.setItem(SNAPSHOT_STORAGE_KEY, serializeSnapshot(next));
    } catch (error) {
      if (isQuotaError(error)) {
        return { status: "quota-exceeded", reason: "本地存储空间不足，本次未保存" };
      }
      return { status: "unavailable", reason: storageUnavailableReason(error) };
    }
    return { status: "saved", snapshot: next };
  }

  return {
    async load(): Promise<LoadResult> {
      let raw: string | null;
      try {
        raw = getStorage().getItem(SNAPSHOT_STORAGE_KEY);
      } catch (error) {
        return { status: "unavailable", reason: storageUnavailableReason(error) };
      }
      if (raw === null) return { status: "missing" };
      const validation = validateSnapshotJson(raw);
      if (validation.ok) {
        // v1 只在内存中迁移为 v2，磁盘原始数据留到下一次成功 save 才落盘
        const snapshot =
          validation.schemaVersion === 1
            ? migrateSnapshotV1toV2(validation.snapshot)
            : validation.snapshot;
        return { status: "ready", snapshot };
      }
      return { status: validation.kind, raw, reason: validation.reason };
    },
    async save(snapshot: Snapshot, expectedRevision: number): Promise<SaveResult> {
      return writeSnapshot(snapshot, expectedRevision);
    },
    readRaw(): string | null {
      return readRawSafe();
    },
    async reset(): Promise<SaveResult> {
      let storage: Storage;
      try {
        storage = getStorage();
      } catch (error) {
        return { status: "unavailable", reason: storageUnavailableReason(error) };
      }
      const initial = createInitialSnapshot();
      try {
        storage.setItem(SNAPSHOT_STORAGE_KEY, serializeSnapshot(initial));
      } catch (error) {
        if (isQuotaError(error)) {
          return { status: "quota-exceeded", reason: "本地存储空间不足，重置未保存" };
        }
        return { status: "unavailable", reason: storageUnavailableReason(error) };
      }
      return { status: "saved", snapshot: initial };
    },
  };
}