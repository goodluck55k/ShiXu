import assert from "node:assert/strict";
import {
  adjacentEntries,
  noteExcerpt,
  orderMemories,
  pageNoteWindow,
  pageProgressPercent,
  summarizeMonth,
} from "../src/components/memories/memoryPresentation";
import type { EmotionReading } from "../src/domain/types";

function emotion(label: EmotionReading["label"]): EmotionReading {
  return {
    label,
    valence: 0.5,
    arousal: 0.5,
    dominance: 0.5,
    intensity: 0.5,
    confidence: null,
    source: "manual",
  };
}

const ordered = orderMemories([
  { id: "b", createdAt: 200 },
  { id: "a", createdAt: 200 },
  { id: "c", createdAt: 300 },
  { id: "d", createdAt: 100 },
]);
assert.deepEqual(ordered.map((entry) => entry.id), ["c", "a", "b", "d"]);
assert.deepEqual(adjacentEntries(ordered, 0).map((entry) => entry.id), ["c", "a"]);
assert.deepEqual(adjacentEntries(ordered, 1).map((entry) => entry.id), ["c", "a", "b"]);
assert.deepEqual(adjacentEntries(ordered, 3).map((entry) => entry.id), ["b", "d"]);
assert.deepEqual(pageNoteWindow(ordered, 0).map((entry) => entry.id), ["c", "a", "b"]);
assert.deepEqual(pageNoteWindow(ordered, 2).map((entry) => entry.id), ["a", "b", "d"]);
assert.deepEqual(pageNoteWindow(ordered, 3).map((entry) => entry.id), ["a", "b", "d"]);

const now = new Date(2026, 10, 16, 12, 0, 0).getTime();
const summary = summarizeMonth(
  [
    { dayKey: "2026-11-15", effectiveEmotion: emotion("joy") },
    { dayKey: "2026-11-01", effectiveEmotion: emotion("joy") },
    { dayKey: "2026-11-02", effectiveEmotion: emotion("calm") },
    { dayKey: "2026-11-03", effectiveEmotion: emotion("sadness") },
    { dayKey: "2026-11-04", effectiveEmotion: emotion("neutral") },
    { dayKey: "2026-10-31", effectiveEmotion: emotion("anger") },
  ],
  now,
);
assert.equal(summary.monthKey, "2026-11");
assert.equal(summary.monthLabel, "11月");
assert.equal(summary.total, 5);
assert.equal(summary.counts.joy, 2);
assert.equal(summary.counts.anger, 0);
assert.deepEqual(summary.top.map((tally) => tally.label), ["joy", "calm", "sadness"]);
assert.deepEqual(summary.top.map((tally) => tally.count), [2, 1, 1]);
assert.equal(summary.otherCount, 1);

const empty = summarizeMonth([], now);
assert.equal(empty.total, 0);
assert.deepEqual(empty.top, []);
assert.equal(empty.otherCount, 0);

assert.equal(pageProgressPercent(0, 8), 12.5);
assert.equal(pageProgressPercent(7, 8), 100);
assert.equal(pageProgressPercent(0, 0), 0);
assert.equal(pageProgressPercent(4, 3), 100);

assert.equal(noteExcerpt("  第一行\n\n第二行  "), "第一行 第二行");
assert.equal(noteExcerpt("一二三四五", 3), "一二三…");

console.log("回忆手账排序、稳定同时间次序、月度统计、相邻便签与进度检查通过");
