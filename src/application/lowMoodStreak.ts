import type { EmotionLabel, Entry } from "@/domain/types";
import { localDayKey } from "./ids";

export interface LowMoodStreakOptions {
  lowMoodEmotionLabels: readonly EmotionLabel[];
  streakDaysRequired: number;
  dayFourSemantics: "A" | "B";
}

// 连续日总数包含当天；只读取已提交条目的当前有效情绪和冻结日期。
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
  if (options.dayFourSemantics === "A") {
    const [year, month, day] = cursor.split("-").map(Number);
    cursor = localDayKey(new Date(year, month - 1, day - 1).getTime());
  }
  for (;;) {
    if (!lowDays.has(cursor)) break;
    streak += 1;
    const [year, month, day] = cursor.split("-").map(Number);
    cursor = localDayKey(new Date(year, month - 1, day - 1).getTime());
  }
  return streak >= options.streakDaysRequired;
}
