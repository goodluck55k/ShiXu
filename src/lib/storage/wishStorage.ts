import {
  createEmptyWishCollection,
  serializeWishCollection,
  validateWishCollection,
  type WishCollection,
} from "../../domain/wishes";

export const WISH_STORAGE_KEY = "shixu.wishes.v1";
export const WISH_STORAGE_LOCK = "shixu.wishes.lock";

export type WishLoadResult =
  | { status: "missing" }
  | { status: "ready"; collection: WishCollection }
  | { status: "unsupported-version"; raw: string; reason: string }
  | { status: "corrupt"; raw: string; reason: string }
  | { status: "unavailable"; reason: string };

export type WishSaveResult =
  | { status: "saved"; collection: WishCollection }
  | { status: "conflict"; reason: string }
  | { status: "corrupt"; raw: string; reason: string }
  | { status: "unsupported-version"; raw: string; reason: string }
  | { status: "unavailable"; reason: string }
  | { status: "quota-exceeded"; reason: string }
  | { status: "invalid"; reason: string };

export interface WishStoragePort {
  load(): WishLoadResult;
  save(collection: WishCollection, expectedRevision: number): Promise<WishSaveResult>;
  reset(expectedRaw: string | null): Promise<WishSaveResult>;
  readRaw(): string | null;
}

function storageUnavailableReason(): string {
  return "浏览器本地存储不可用";
}

function isQuotaError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function parseStoredWishCollection(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false as const, kind: "corrupt" as const, reason: "愿望数据不是合法 JSON" };
  }
  return validateWishCollection(parsed);
}

function getLockManager(): LockManager | null {
  if (typeof navigator === "undefined" || !("locks" in navigator) || !navigator.locks) return null;
  return navigator.locks;
}

export function createLocalStorageWishAdapter(target?: Storage): WishStoragePort {
  function getStorage(): Storage {
    if (target) return target;
    if (typeof window === "undefined") throw new Error("localStorage 仅在客户端可用");
    return window.localStorage;
  }

  function readRawSafe(): string | null {
    try {
      return getStorage().getItem(WISH_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function writeCollection(collection: WishCollection, expectedRevision: number): WishSaveResult {
    const validation = validateWishCollection(collection);
    if (!validation.ok) return { status: "invalid", reason: validation.reason };
    if (collection.revision !== expectedRevision) {
      return { status: "invalid", reason: "愿望数据修订号不一致" };
    }

    let storage: Storage;
    let raw: string | null;
    try {
      storage = getStorage();
      raw = storage.getItem(WISH_STORAGE_KEY);
    } catch {
      return { status: "unavailable", reason: storageUnavailableReason() };
    }

    if (raw !== null) {
      const existing = parseStoredWishCollection(raw);
      if (!existing.ok) {
        // 不可读的现有愿望数据不能被当作空集合覆盖，原样返回供导出与显式恢复。
        return { status: existing.kind, raw, reason: existing.reason };
      }
      if (existing.collection.revision !== expectedRevision) {
        return { status: "conflict", reason: "愿望已在其他位置更新，请重新加载" };
      }
    } else if (expectedRevision !== 0) {
      return { status: "conflict", reason: "愿望数据已被清除，请重新加载" };
    }

    // 修订号必须严格递增；达到安全整数上限时无法再安全递增，拒绝写入而不是产生修订号不变的假成功。
    if (expectedRevision >= Number.MAX_SAFE_INTEGER) {
      return { status: "invalid", reason: "愿望数据修订号已达上限，本次写入已停止" };
    }

    const next: WishCollection = { ...collection, revision: expectedRevision + 1 };
    try {
      storage.setItem(WISH_STORAGE_KEY, serializeWishCollection(next));
    } catch (error) {
      if (isQuotaError(error)) {
        return { status: "quota-exceeded", reason: "本地存储空间不足，本次愿望未保存" };
      }
      return { status: "unavailable", reason: storageUnavailableReason() };
    }
    return { status: "saved", collection: next };
  }

  async function withWriteLock(run: () => WishSaveResult): Promise<WishSaveResult> {
    const locks = getLockManager();
    if (!locks) return run();
    // 支持的浏览器里，跨标签页的“读取→比较修订→写入”在同一把原生锁内串行执行。
    // 不支持 Web Locks 时退回修订号检查与 storage 事件，后者不是原子事务。
    const result = await locks.request(WISH_STORAGE_LOCK, { mode: "exclusive" }, () => run());
    return result as WishSaveResult;
  }

  return {
    load(): WishLoadResult {
      let raw: string | null;
      try {
        raw = getStorage().getItem(WISH_STORAGE_KEY);
      } catch {
        return { status: "unavailable", reason: storageUnavailableReason() };
      }
      if (raw === null) return { status: "missing" };
      const validation = parseStoredWishCollection(raw);
      if (validation.ok) return { status: "ready", collection: validation.collection };
      return { status: validation.kind, raw, reason: validation.reason };
    },
    save(collection: WishCollection, expectedRevision: number): Promise<WishSaveResult> {
      return withWriteLock(() => writeCollection(collection, expectedRevision));
    },
    reset(expectedRaw: string | null): Promise<WishSaveResult> {
      return withWriteLock(() => {
        let storage: Storage;
        let currentRaw: string | null;
        try {
          storage = getStorage();
          currentRaw = storage.getItem(WISH_STORAGE_KEY);
        } catch {
          return { status: "unavailable", reason: storageUnavailableReason() };
        }
        if (currentRaw !== expectedRaw) {
          return { status: "conflict", reason: "愿望数据已在其他位置更新，请重新加载" };
        }
        const empty = createEmptyWishCollection();
        try {
          storage.setItem(WISH_STORAGE_KEY, serializeWishCollection(empty));
        } catch (error) {
          if (isQuotaError(error)) {
            return { status: "quota-exceeded", reason: "本地存储空间不足，愿望数据未重置" };
          }
          return { status: "unavailable", reason: storageUnavailableReason() };
        }
        return { status: "saved", collection: empty };
      });
    },
    readRaw(): string | null {
      return readRawSafe();
    },
  };
}