import type { Wish, WishStatus } from "../../domain/wishes";

export type { WishStatus };
export type WishDecorIcon = "shoe" | "book" | "trip" | "phone" | "dish" | "sprout";

export interface WishView {
  id: string;
  text: string;
  status: WishStatus;
  createdAt: number;
  completedAt: number | null;
  icon?: WishDecorIcon;
}

// Candidate visual caps from the approved visual round; the full list stays accessible in the board.
export const MAX_VISIBLE_BALLS = 8;
export const MAX_VISIBLE_STARS = 5;

export function toWishView(wish: Wish): WishView {
  return {
    id: wish.id,
    text: wish.text,
    status: wish.status,
    createdAt: wish.createdAt,
    completedAt: wish.completedAt,
  };
}

const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

export interface WishCompletedAtLabel {
  label: string;
  dateTime: string;
}

/** 展示层兜底：即使收到未经校验的时间戳也不构造非法 Date，避免渲染抛错。 */
export function formatWishCompletedAt(completedAt: number | null): WishCompletedAtLabel | null {
  if (
    completedAt === null ||
    !Number.isFinite(completedAt) ||
    completedAt < 0 ||
    completedAt > MAX_DATE_TIMESTAMP
  ) {
    return null;
  }
  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return {
    label: `${date.getFullYear()}.${month}.${day} 完成`,
    dateTime: date.toISOString(),
  };
}

const SAMPLE_DAY = 24 * 60 * 60 * 1000;
const SAMPLE_BASE = Date.UTC(2026, 10, 1, 2);

// Isolated development sample, injected only in development via ?preview=sample.
// It is never persisted and must always be labelled as sample data on screen.
export const DEV_SAMPLE_WISHES: WishView[] = [
  { id: "sample-p1", text: "坚持每周运动 3 次", status: "pending", createdAt: SAMPLE_BASE + SAMPLE_DAY * 1, completedAt: null, icon: "shoe" },
  { id: "sample-p2", text: "读完一本一直想读的书", status: "pending", createdAt: SAMPLE_BASE + SAMPLE_DAY * 2, completedAt: null, icon: "book" },
  { id: "sample-p3", text: "准备一次小小的旅行", status: "pending", createdAt: SAMPLE_BASE + SAMPLE_DAY * 3, completedAt: null, icon: "trip" },
  { id: "sample-p4", text: "给窗台的绿植换一个新花盆", status: "pending", createdAt: SAMPLE_BASE + SAMPLE_DAY * 4, completedAt: null, icon: "sprout" },
  { id: "sample-p5", text: "早睡一周，看看清晨的样子", status: "pending", createdAt: SAMPLE_BASE + SAMPLE_DAY * 5, completedAt: null, icon: "sprout" },
  { id: "sample-c1", text: "给妈妈打一通长长的电话", status: "completed", createdAt: SAMPLE_BASE + SAMPLE_DAY * 6, completedAt: SAMPLE_BASE + SAMPLE_DAY * 9, icon: "phone" },
  { id: "sample-c2", text: "学会做一道新菜", status: "completed", createdAt: SAMPLE_BASE + SAMPLE_DAY * 7, completedAt: SAMPLE_BASE + SAMPLE_DAY * 10, icon: "dish" },
  { id: "sample-c3", text: "把书桌收拾成喜欢的样子", status: "completed", createdAt: SAMPLE_BASE + SAMPLE_DAY * 8, completedAt: SAMPLE_BASE + SAMPLE_DAY * 11, icon: "sprout" },
];

// Stable module constant so preview state is created once per mount, never from storage.
export const DEV_SAMPLE_WISH_MODELS: Wish[] = DEV_SAMPLE_WISHES.map(({ id, text, status, createdAt, completedAt }) => ({
  id,
  text,
  status,
  createdAt,
  completedAt,
}));