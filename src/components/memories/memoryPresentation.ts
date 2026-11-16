import {
  EMOTION_LABELS,
  EMOTION_NAMES,
  type EmotionLabel,
  type EmotionSource,
  type Entry,
} from "@/domain/types";

export const SOURCE_NAMES: Record<EmotionSource, string> = {
  ai: "AI 建议",
  manual: "手动选择",
  corrected: "手动纠正",
};

export type MemoryOrderKey = { id: string; createdAt: number };

/** Newest first; equal timestamps use id so pagination never reshuffles. */
export function orderMemories<T extends MemoryOrderKey>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id),
  );
}

export function localMonthKey(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(now: number): string {
  return `${new Date(now).getMonth() + 1}月`;
}

export type EmotionTally = { label: EmotionLabel; count: number };

export interface MonthlyMemorySummary {
  monthKey: string;
  monthLabel: string;
  total: number;
  counts: Record<EmotionLabel, number>;
  top: EmotionTally[];
  otherCount: number;
}

/** Counts the current calendar month from real saved entries only. */
export function summarizeMonth(
  entries: readonly Pick<Entry, "dayKey" | "effectiveEmotion">[],
  now: number,
): MonthlyMemorySummary {
  const monthKey = localMonthKey(now);
  const counts = Object.fromEntries(
    EMOTION_LABELS.map((label) => [label, 0]),
  ) as Record<EmotionLabel, number>;

  let total = 0;
  for (const entry of entries) {
    if (!entry.dayKey.startsWith(monthKey)) continue;
    counts[entry.effectiveEmotion.label] += 1;
    total += 1;
  }

  const ranked = EMOTION_LABELS
    .map((label) => ({ label, count: counts[label] }))
    .filter((tally) => tally.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        EMOTION_LABELS.indexOf(a.label) - EMOTION_LABELS.indexOf(b.label),
    );
  const top = ranked.slice(0, 3);
  const otherCount = ranked
    .slice(3)
    .reduce((sum, tally) => sum + tally.count, 0);

  return {
    monthKey,
    monthLabel: formatMonthLabel(now),
    total,
    counts,
    top,
    otherCount,
  };
}

export function emotionName(label: EmotionLabel): string {
  return EMOTION_NAMES[label];
}

export function sourceName(source: EmotionSource): string {
  return SOURCE_NAMES[source];
}

/** One-line note excerpt; the full text is never altered in the detail view. */
export function noteExcerpt(text: string, maxLength = 54): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized;
}

export function pageProgressPercent(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, ((index + 1) / total) * 100));
}

export function adjacentEntries<T>(
  ordered: readonly T[],
  index: number,
  radius = 1,
): T[] {
  if (ordered.length === 0) return [];
  const start = Math.max(0, index - radius);
  const end = Math.min(ordered.length, index + radius + 1);
  return ordered.slice(start, end);
}

/** Up to three index notes, keeping the current page inside the window. */
export function pageNoteWindow<T>(
  ordered: readonly T[],
  index: number,
  size = 3,
): T[] {
  if (ordered.length === 0) return [];
  const width = Math.min(size, ordered.length);
  const maxStart = ordered.length - width;
  const start = Math.max(0, Math.min(index - 1, maxStart));
  return ordered.slice(start, start + width);
}
