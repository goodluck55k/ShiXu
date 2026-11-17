"use client";
import type { ReactNode } from "react";
import { EMOTION_LABELS, EMOTION_NAMES, type EmotionLabel } from "@/domain/types";

const faces: Record<EmotionLabel, string> = { joy: "☺", calm: "◡", sadness: "☹", anxiety: "﹏", anger: "⌁", tired: "◡", mixed: "⁓", neutral: "·", unknown: "···" };

/** 手账贴纸图标：仅视觉表现，不改变情绪字典或选择行为。 */
const INK = "#5a4033";
const eyes = (y = 19, gap = 5) => <><circle cx={20 - gap} cy={y} r="1.6" fill={INK} /><circle cx={20 + gap} cy={y} r="1.6" fill={INK} /></>;
const stickers: Record<EmotionLabel, ReactNode> = {
  joy: <>
    <g stroke="#e9a93a" strokeWidth="2" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <path key={a} d="M20 3.5v4" transform={`rotate(${a} 20 20)`} />)}</g>
    <circle cx="20" cy="20" r="10.5" fill="#ffd25e" stroke="#e0a53a" strokeWidth="1.4" />
    {eyes(18.5, 3.8)}<path d="M15.6 22.4c2.4 2.6 6.4 2.6 8.8 0" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
  </>,
  calm: <>
    <path d="M20 9c8 0 13 6 13 12 0 7-6 11-13 11S7 28 7 21c0-6 5-12 13-12z" fill="#a9c97f" stroke="#78994c" strokeWidth="1.4" />
    <path d="M20 9c0-3 2-5 5-6" fill="none" stroke="#78994c" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14.5 21c1 1 2.4 1 3.4 0M22.1 21c1 1 2.4 1 3.4 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17.6 25.5c1.5 1.1 3.3 1.1 4.8 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
  </>,
  sadness: <>
    <path d="M11 25a6 6 0 0 1 1-11.9 8 8 0 0 1 15.4 1.4A5.3 5.3 0 0 1 29 25z" fill="#8fbbe6" stroke="#5f8fc0" strokeWidth="1.4" strokeLinejoin="round" />
    {eyes(19.5, 4)}<path d="M17.4 23.4c1.6-1.2 3.6-1.2 5.2 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 29.5l-1 3M20 29.5l-1 3M26 29.5l-1 3" stroke="#6fa3d6" strokeWidth="1.8" strokeLinecap="round" />
  </>,
  anxiety: <>
    <path d="M9 24c-3-1-3-6 1-7 0-5 6-8 10-5 3-4 10-2 10 3 4 1 4 7 0 8-1 4-7 5-10 3-3 2-9 2-11-2z" fill="#c4b2e8" stroke="#8d78c2" strokeWidth="1.4" strokeLinejoin="round" />
    {eyes(19.5, 4)}<path d="M15.5 24.5c1.2-1 2.2 1 3.4 0s2.2 1 3.4 0 2.2 1 3.2 0" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M31 9.5c1.6.3 2.4 1.6 2 3" fill="none" stroke="#8d78c2" strokeWidth="1.5" strokeLinecap="round" />
  </>,
  anger: <>
    <path d="M20 5c2 5 9 8 10 15 1 7-4 13-10 13S9 28 10 21c.6-4 3-5 4-8 1 2 2 3 3 3 0-4 1-8 3-11z" fill="#f0786a" stroke="#c4503f" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M14.6 19.6l3 1.2M25.4 19.6l-3 1.2" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="16.4" cy="22.6" r="1.5" fill={INK} /><circle cx="23.6" cy="22.6" r="1.5" fill={INK} />
    <path d="M17.6 27.6c1.5-1 3.3-1 4.8 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
  </>,
  tired: <>
    <path d="M10 26a6 6 0 0 1 .8-11.9 8 8 0 0 1 15.4 1A5.5 5.5 0 0 1 29.5 26z" fill="#bdb6b0" stroke="#8b837c" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M14 20h3.6M22.4 20H26" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M18 23.6h4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 6h4l-4 4h4" fill="none" stroke="#8b837c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  mixed: <>
    <circle cx="15" cy="16" r="7" fill="#f29a9a" opacity=".9" />
    <circle cx="25" cy="16" r="7" fill="#9ccbe8" opacity=".9" />
    <circle cx="20" cy="24" r="7.5" fill="#b8d98e" opacity=".9" />
    <circle cx="20" cy="19" r="4.2" fill="#e7c6ef" opacity=".9" />
    <path d="M17 22.5h.1M23 22.5h.1" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M17.8 26.2c1.3.8 3 .8 4.4 0" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
  </>,
  neutral: <>
    <ellipse cx="20" cy="22" rx="12.5" ry="9" fill="#b3cf96" stroke="#7f9c62" strokeWidth="1.4" />
    <path d="M14 14c2-2 4-2 6-1" fill="none" stroke="#7f9c62" strokeWidth="1.4" strokeLinecap="round" />
    {eyes(20.5, 4.5)}<path d="M17.4 25.4h5.2" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
  </>,
  unknown: <>
    <path d="M20 6c7.5 0 12 5 12 11s-4.5 11-12 11c-1.4 0-2.7-.2-3.9-.5L11 31l1.4-5.6C9.6 23.4 8 20.4 8 17 8 11 12.5 6 20 6z" fill="#ece3fb" stroke="#9a83cf" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M16.6 13.8c.5-2 2-3 3.7-3 2.1 0 3.7 1.4 3.7 3.2 0 2.6-3.6 2.8-3.6 5.4" fill="none" stroke="#7d64b8" strokeWidth="1.9" strokeLinecap="round" />
    <circle cx="20.4" cy="22.6" r="1.3" fill="#7d64b8" />
  </>,
};

export function EmotionCategoryPicker({ value, disabled, onSelect, appearance = "default" }: { value: EmotionLabel | null; disabled: boolean; onSelect: (label: EmotionLabel) => void; appearance?: "default" | "sticker" }) {
  const sticker = appearance === "sticker";
  return <div role="group" aria-label="心情类别" className={`emotion-grid${sticker ? " emotion-stickers" : ""}`}>{EMOTION_LABELS.map(label => <button key={label} type="button" disabled={disabled} aria-pressed={value === label} onClick={() => onSelect(label)} className={`emotion-option emotion-${label}`}>
    {sticker
      ? <svg className="emotion-sticker" viewBox="0 0 40 36" aria-hidden="true">{stickers[label]}</svg>
      : <span className="emotion-face" aria-hidden="true">{faces[label]}</span>}
    <span className="emotion-name">{EMOTION_NAMES[label]}</span>
    {sticker && <span className="emotion-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
  </button>)}</div>;
}
