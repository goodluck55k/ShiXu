"use client";
import { EMOTION_LABELS, EMOTION_NAMES, type EmotionLabel } from "@/domain/types";
const faces: Record<EmotionLabel, string> = { joy: "☺", calm: "◡", sadness: "☹", anxiety: "﹏", anger: "⌁", tired: "◡", mixed: "⁓", neutral: "·", unknown: "···" };
export function EmotionCategoryPicker({ value, disabled, onSelect }: { value: EmotionLabel | null; disabled: boolean; onSelect: (label: EmotionLabel) => void }) {
 return <div role="group" aria-label="心情类别" className="emotion-grid">{EMOTION_LABELS.map(label => <button key={label} type="button" disabled={disabled} aria-pressed={value === label} onClick={() => onSelect(label)} className={`emotion-option emotion-${label}`}><span className="emotion-face" aria-hidden="true">{faces[label]}</span><span>{EMOTION_NAMES[label]}</span></button>)}</div>;
}
