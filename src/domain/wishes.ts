export const WISH_SCHEMA_VERSION = 1 as const;

export type WishStatus = "pending" | "completed";

export interface Wish {
  id: string;
  text: string;
  status: WishStatus;
  createdAt: number;
  completedAt: number | null;
}

export interface WishCollection {
  schemaVersion: typeof WISH_SCHEMA_VERSION;
  revision: number;
  wishes: Wish[];
}

export type WishCollectionValidation =
  | { ok: true; collection: WishCollection }
  | { ok: false; kind: "unsupported-version" | "corrupt"; reason: string };

export type WishCreationResult =
  | { ok: true; wish: Wish }
  | { ok: false; reason: string };

export type WishAddResult =
  | { ok: true; collection: WishCollection }
  | { ok: false; reason: string };

export interface WishCompletionResult {
  changed: boolean;
  collection: WishCollection;
  wish: Wish | null;
  reason?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function fail(kind: "unsupported-version" | "corrupt", reason: string): WishCollectionValidation {
  return { ok: false, kind, reason };
}

export function createEmptyWishCollection(): WishCollection {
  return { schemaVersion: WISH_SCHEMA_VERSION, revision: 0, wishes: [] };
}

export function createPendingWish(id: string, text: string, createdAt: number): WishCreationResult {
  if (!isNonEmptyString(id)) return { ok: false, reason: "愿望标识无效，请重试" };
  if (typeof text !== "string" || text.trim().length === 0) return { ok: false, reason: "先写下一个愿望吧" };
  if (!isValidTimestamp(createdAt)) return { ok: false, reason: "当前时间无效，请刷新后重试" };
  return {
    ok: true,
    wish: { id, text, status: "pending", createdAt, completedAt: null },
  };
}

export function addWish(collection: WishCollection, wish: Wish): WishAddResult {
  if (collection.wishes.some((item) => item.id === wish.id)) {
    return { ok: false, reason: "这个愿望已经存在" };
  }
  return { ok: true, collection: { ...collection, wishes: [...collection.wishes, wish] } };
}

export function completeWishInCollection(
  collection: WishCollection,
  wishId: string,
  completedAt: number,
): WishCompletionResult {
  if (!isValidTimestamp(completedAt)) {
    return { changed: false, collection, wish: null, reason: "当前时间无效，请刷新后重试" };
  }
  const index = collection.wishes.findIndex((item) => item.id === wishId);
  if (index < 0) {
    return { changed: false, collection, wish: null, reason: "没有找到这个愿望" };
  }
  const current = collection.wishes[index];
  if (current.status === "completed") {
    // 重复完成必须保持幂等：原完成时间、文本与创建时间都不改写。
    return { changed: false, collection, wish: current };
  }
  const wish: Wish = { ...current, status: "completed", completedAt };
  const wishes = collection.wishes.slice();
  wishes[index] = wish;
  return { changed: true, collection: { ...collection, wishes }, wish };
}

function validateWish(value: unknown, index: number): string | null {
  const path = `wishes[${index}]`;
  if (!isRecord(value)) return `${path} 必须是对象`;
  if (!isNonEmptyString(value.id)) return `${path}.id 缺失`;
  if (typeof value.text !== "string" || value.text.trim().length === 0) return `${path}.text 不能为空`;
  if (value.status !== "pending" && value.status !== "completed") return `${path}.status 非法`;
  if (!isValidTimestamp(value.createdAt)) return `${path}.createdAt 非法`;
  if (value.status === "pending") {
    if (value.completedAt !== null) return `${path}.completedAt 在未完成时必须为 null`;
  } else if (!isValidTimestamp(value.completedAt)) {
    return `${path}.completedAt 在已完成时必须为时间戳`;
  }
  return null;
}

export function validateWishCollection(value: unknown): WishCollectionValidation {
  if (!isRecord(value)) return fail("corrupt", "愿望数据根节点必须是对象");
  if (typeof value.schemaVersion !== "number" || !Number.isFinite(value.schemaVersion)) {
    return fail("corrupt", "愿望数据缺少有效 schemaVersion");
  }
  if (value.schemaVersion !== WISH_SCHEMA_VERSION) {
    return fail("unsupported-version", `不支持的愿望存储版本 ${value.schemaVersion}`);
  }
  if (!isNonNegativeInteger(value.revision)) return fail("corrupt", "愿望数据 revision 非法");
  if (!Array.isArray(value.wishes)) return fail("corrupt", "愿望数据 wishes 必须是数组");

  const ids = new Set<string>();
  for (const [index, wish] of value.wishes.entries()) {
    const error = validateWish(wish, index);
    if (error) return fail("corrupt", error);
    const id = (wish as Wish).id;
    if (ids.has(id)) return fail("corrupt", `愿望 ID 重复：${id}`);
    ids.add(id);
  }
  return { ok: true, collection: value as unknown as WishCollection };
}

export function serializeWishCollection(collection: WishCollection): string {
  return JSON.stringify(collection);
}