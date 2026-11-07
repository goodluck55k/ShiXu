"use client";

import { EMOTION_NAMES, type Entry, type EmotionSource } from "@/domain/types";
import { formatDateTime } from "@/lib/format";

const SOURCE_NAMES: Record<EmotionSource, string> = {
  ai: "AI 建议",
  manual: "手动选择",
  corrected: "手动纠正",
};

export function DiaryHistory({ entries }: { entries: Entry[] }) {
  const ordered = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <section aria-label="日记历史" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">日记历史</h2>
      {ordered.length === 0 ? (
        <p className="mt-3 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
          还没有日记。写下第一条，小人会记住这一天。
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {ordered.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                <time dateTime={new Date(entry.createdAt).toISOString()}>
                  {formatDateTime(entry.createdAt)}
                </time>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
                  {EMOTION_NAMES[entry.effectiveEmotion.label]}
                </span>
                <span>{SOURCE_NAMES[entry.effectiveEmotion.source]}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-800">
                {entry.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}