import type { WishView } from "./wishView";
import { MAX_VISIBLE_BALLS, MAX_VISIBLE_STARS } from "./wishView";

export interface BallPalette {
  base: string;
  light: string;
  dark: string;
  line: string;
}

export const BALL_PALETTES = {
  pink: { base: "#f2bdb6", light: "#fae0db", dark: "#dd8f86", line: "#c97c74" },
  green: { base: "#c8dc9e", light: "#e7f1cd", dark: "#99b871", line: "#82a058" },
  cream: { base: "#f7ebcf", light: "#fdf8e9", dark: "#e0c99f", line: "#c9ad7f" },
  peach: { base: "#f6d9b4", light: "#fdeed8", dark: "#e5b988", line: "#cba06c" },
  yellow: { base: "#f6df9f", light: "#fcf0cd", dark: "#e6c47e", line: "#cfa961" },
} satisfies Record<string, BallPalette>;

const PALETTE_NAMES = Object.keys(BALL_PALETTES) as Array<keyof typeof BALL_PALETTES>;

interface SlotBase {
  x: number;
  y: number;
  s: number;
  r: number;
}

// Fixed composition slots from the approved visual round. Which wish occupies
// which slot is derived from the wish id, so refreshes do not reshuffle the jar.
export const BALL_SLOTS: readonly SlotBase[] = [
  { x: 150, y: 488, s: 1.22, r: -8 },
  { x: 238, y: 512, s: 1.28, r: 6 },
  { x: 316, y: 484, s: 1.16, r: -14 },
  { x: 180, y: 420, s: 1.1, r: 12 },
  { x: 272, y: 428, s: 1.12, r: -5 },
  { x: 340, y: 428, s: 0.95, r: 18 },
  { x: 128, y: 430, s: 0.88, r: 20 },
  { x: 226, y: 368, s: 0.95, r: -10 },
];

export const STAR_SLOTS: readonly SlotBase[] = [
  { x: 240, y: 58, s: 1.0, r: -12 },
  { x: 156, y: 116, s: 0.72, r: 14 },
  { x: 314, y: 122, s: 0.8, r: -20 },
  { x: 116, y: 50, s: 0.5, r: 8 },
  { x: 338, y: 42, s: 0.55, r: -6 },
];

export interface BallLayoutItem {
  wish: WishView;
  slot: SlotBase;
  slotIndex: number;
  palette: BallPalette;
  scale: number;
  rotation: number;
  hash: number;
}

export interface StarLayoutItem {
  wish: WishView;
  slot: SlotBase;
  slotIndex: number;
  scale: number;
  rotation: number;
  delay: number;
  hash: number;
}

/** FNV-1a: deterministic per wish id, independent of locale and time. */
export function hashWishId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortPending(wishes: readonly WishView[]): WishView[] {
  return [...wishes]
    .filter((wish) => wish.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt || compareIds(a.id, b.id));
}

function sortCompleted(wishes: readonly WishView[]): WishView[] {
  return [...wishes]
    .filter((wish) => wish.status === "completed")
    .sort(
      (a, b) =>
        (a.completedAt ?? a.createdAt) - (b.completedAt ?? b.createdAt) || compareIds(a.id, b.id),
    );
}

function allocateSlots<T>(items: readonly T[], slots: readonly SlotBase[], hashOf: (item: T) => number) {
  const used = new Set<number>();
  return items.map((item) => {
    let index = hashOf(item) % slots.length;
    let probes = 0;
    while (used.has(index) && probes < slots.length) {
      index = (index + 1) % slots.length;
      probes++;
    }
    used.add(index);
    return { item, slotIndex: index, slot: slots[index] };
  });
}

export function assignBallSlots(wishes: readonly WishView[]): BallLayoutItem[] {
  const visible = sortPending(wishes).slice(0, MAX_VISIBLE_BALLS);
  return allocateSlots(visible, BALL_SLOTS, (wish) => hashWishId(wish.id)).map(({ item, slotIndex, slot }) => {
    const hash = hashWishId(item.id);
    return {
      wish: item,
      slot,
      slotIndex,
      palette: BALL_PALETTES[PALETTE_NAMES[hash % PALETTE_NAMES.length]],
      scale: slot.s * (0.94 + ((hash >>> 12) % 9) / 100),
      rotation: slot.r + ((hash >>> 8) % 13) - 6,
      hash,
    };
  });
}

export function assignStarSlots(wishes: readonly WishView[]): StarLayoutItem[] {
  const visible = sortCompleted(wishes).slice(0, MAX_VISIBLE_STARS);
  return allocateSlots(visible, STAR_SLOTS, (wish) => hashWishId(wish.id)).map(({ item, slotIndex, slot }) => {
    const hash = hashWishId(item.id);
    return {
      wish: item,
      slot,
      slotIndex,
      scale: slot.s * (0.94 + ((hash >>> 12) % 9) / 100),
      rotation: slot.r + ((hash >>> 8) % 9) - 4,
      delay: ((hash >>> 16) % 7) * 0.4,
      hash,
    };
  });
}