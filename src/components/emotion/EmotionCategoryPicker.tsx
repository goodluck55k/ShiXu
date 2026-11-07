"use client";

import { EMOTION_LABELS, EMOTION_NAMES, type EmotionLabel } from "@/domain/types";

export function EmotionCategoryPicker({
  value,
  disabled,
  onSelect,
}: {
  value: EmotionLabel | null;
  disabled: boolean;
  onSelect: (label: EmotionLabel) => void;
}) {
  return (
    <div role="group" aria-label="心情类别" className="grid grid-cols-3 gap-2">
      {EMOTION_LABELS.map((label) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          aria-pressed={value === label}
          onClick={() => onSelect(label)}
          className={`rounded-xl border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
            value === label
              ? "border-teal-600 bg-teal-600 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:border-teal-500"
          }`}
        >
          {EMOTION_NAMES[label]}
        </button>
      ))}
    </div>
  );
}