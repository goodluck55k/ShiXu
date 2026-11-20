import type { WishView } from "./wishView";
import { MAX_VISIBLE_BALLS, MAX_VISIBLE_STARS } from "./wishView";

export interface BallPalette {
  base: string;
  light: string;
  dark: string;
  line: string;
}

export const BALL_PALETTES = {
  pink: { base: "#f4bbb2", light: "#fde4df", dark: "#db8b80", line: "#c8776c" },
  green: { base: "#cadf9e", light: "#ebf5d3", dark: "#9bb96f", line: "#82a156" },
  cream: { base: "#f9edd0", light: "#fffaf0", dark: "#e2ca9e", line: "#c7ab7c" },
  peach: { base: "#f8d8b2", light: "#fff0da", dark: "#e5b682", line: "#c89a64" },
  yellow: { base: "#f8e2a0", light: "#fef4d3", dark: "#e5c176", line: "#caa45a" },
} satisfies Record<string, BallPalette>;

const PALETTE_NAMES = Object.keys(BALL_PALETTES) as Array<keyof typeof BALL_PALETTES>;

interface SlotBase {
  x: number;
  y: number;
  s: number;
  r: number;
}

// Fixed composition slots aligned to the jar belly and mouth. Which wish occupies
// which slot is derived from the wish id, so refreshes do not reshuffle the jar.
export const BALL_SLOTS: readonly SlotBase[] = [
  { x: 158, y: 498, s: 1.18, r: -10 },
  { x: 232, y: 512, s: 1.24, r: 8 },
  { x: 304, y: 494, s: 1.16, r: -14 },
  { x: 190, y: 444, s: 1.12, r: 12 },
  { x: 268, y: 448, s: 1.14, r: -6 },
  { x: 322, y: 442, s: 0.98, r: 18 },
  { x: 140, y: 446, s: 0.94, r: 22 },
  { x: 230, y: 394, s: 1.0, r: -8 },
];

export const STAR_SLOTS: readonly SlotBase[] = [
  { x: 236, y: 74, s: 1.16, r: -10 },
  { x: 174, y: 126, s: 0.88, r: 14 },
  { x: 300, y: 122, s: 0.94, r: -18 },
  { x: 158, y: 68, s: 0.78, r: 8 },
  { x: 314, y: 66, s: 0.82, r: -8 },
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