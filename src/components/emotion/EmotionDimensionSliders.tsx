"use client";

import type { EmotionDimensions } from "@/domain/types";

const DIMENSIONS: { key: keyof EmotionDimensions; name: string; low: string; high: string }[] = [
  { key: "valence", name: "愉快程度", low: "很不愉快", high: "很愉快" },
  { key: "arousal", name: "激动程度", low: "很平静", high: "很激动" },
  { key: "dominance", name: "控制感", low: "无助", high: "有把握" },
  { key: "intensity", name: "情绪强度", low: "很淡", high: "很强烈" },
];

export function EmotionDimensionSliders({
  value,
  disabled,
  onChange,
}: {
  value: EmotionDimensions;
  disabled: boolean;
  onChange: (dimensions: EmotionDimensions) => void;
}) {
  return (
    <div className="space-y-3">
      {DIMENSIONS.map(({ key, name, low, high }) => (
        <div key={key}>
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor={`dimension-${key}`} className="font-medium text-stone-700">
              {name}
            </label>
            <span className="tabular-nums text-stone-500">{value[key].toFixed(2)}</span>
          </div>
          <input
            id={`dimension-${key}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={disabled}
            value={value[key]}
            onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })}
            className="w-full accent-teal-600 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-stone-400">
            <span>{low}</span>
            <span>{high}</span>
          </div>
        </div>
      ))}
    </div>
  );
}