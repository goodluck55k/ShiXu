import type { EmotionLabel, Entry } from "@/domain/types";
import { localDayKey } from "./ids";

export interface LowMoodStreakOptions {
  lowMoodEmotionLabels: readonly EmotionLabel[];
  streakDaysRequired: number;
  dayFourSemantics: "A" | "B";
}

// 候选判定（COMPANION_SPEC 3.5.1），仅供测试入口；正式 specialBehaviorEnabled=false，不接入触发。
export function computeSpecialEligibility(
  entries: readonly Entry[],
  todayKey: string,
  options: LowMoodStreakOptions,
): boolean {
  const lowDays = new Set(
    entries
      .filter((entry) => options.lowMoodEmotionLabels.includes(entry.effectiveEmotion.label))
      .map((entry) => entry.dayKey),
  );
  let streak = 0;
  let cursor = todayKey;
  for (;;) {
    const [year, month, day] = cursor.split("-").map(Number);
    cursor = localDayKey(new Date(year, month - 1, day - 1).getTime());
    if (!lowDays.has(cursor)) break;
    streak += 1;
  }
  if (streak < options.streakDaysRequired) return false;
  return options.dayFourSemantics === "A" || lowDays.has(todayKey);
}