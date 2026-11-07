"use client";

import { useState } from "react";
import { useApp } from "@/application/AppProvider";
import { createManualEmotion, MANUAL_EMOTION_DEFAULTS } from "@/domain/emotions";
import {
  EMOTION_NAMES,
  type EmotionDimensions,
  type EmotionLabel,
} from "@/domain/types";
import { EmotionCategoryPicker } from "./EmotionCategoryPicker";
import { EmotionDimensionSliders } from "./EmotionDimensionSliders";

export function EmotionDraftForm() {
  const { state, confirmEntry, retrySave, invalidatePending } = useApp();
  const [text, setText] = useState("");
  const [label, setLabel] = useState<EmotionLabel | null>(null);
  const [dimensions, setDimensions] = useState<EmotionDimensions>(
    MANUAL_EMOTION_DEFAULTS.neutral,
  );

  const busy = state.saving || state.tabConflict;
  const canConfirm = text.trim().length > 0 && label !== null && !busy;

  function clearDraft() {
    setText("");
    setLabel(null);
    setDimensions(MANUAL_EMOTION_DEFAULTS.neutral);
  }

  async function handleConfirm() {
    if (label === null) return;
    const saved = await confirmEntry(text, createManualEmotion(label, dimensions));
    if (saved) clearDraft();
  }

  async function handleRetry() {
    const saved = await retrySave();
    if (saved) clearDraft();
  }

  function selectLabel(next: EmotionLabel) {
    setLabel(next);
    setDimensions(MANUAL_EMOTION_DEFAULTS[next]);
    invalidatePending();
  }

  function changeText(next: string) {
    setText(next);
    invalidatePending();
  }

  function changeDimensions(next: EmotionDimensions) {
    setDimensions(next);
    invalidatePending();
  }

  return (
    <section aria-label="写日记" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">今天的日记</h2>
      <p className="mt-1 text-sm text-stone-500">
        写下触动你的日常，原样保存，不限制字数。这里没有 AI 改写，只有你自己的文字。
      </p>
      <textarea
        value={text}
        onChange={(event) => changeText(event.target.value)}
        placeholder="今天发生了什么？此刻心里是什么感觉……"
        rows={6}
        aria-label="日记正文"
        className="mt-3 w-full resize-y rounded-xl border border-stone-300 bg-stone-50 p-3 text-sm leading-relaxed focus:border-teal-500 focus:outline-none"
      />

      <h3 className="mt-4 text-sm font-semibold text-stone-700">现在的心情（手动选择）</h3>
      <p className="mt-1 mb-2 text-xs text-stone-500">
        AI 识别将在后续版本接入；当前为手动选择，不是 AI 判断。
      </p>
      <EmotionCategoryPicker value={label} disabled={busy} onSelect={selectLabel} />

      {label !== null && (
        <div className="mt-4 rounded-xl bg-stone-50 p-4">
          <p className="mb-3 text-sm text-stone-600">
            已选「{EMOTION_NAMES[label]}」，默认数值来自手动默认值，可微调：
          </p>
          <EmotionDimensionSliders value={dimensions} disabled={busy} onChange={changeDimensions} />
        </div>
      )}

      {state.saveError && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p>{state.saveError}</p>
          <p className="mt-1 text-xs">草稿已保留，本次未保存。</p>
          {state.pending && !state.tabConflict && (
            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={state.saving}
              className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              重试保存这一条
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => void handleConfirm()}
        className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {state.saving ? "保存中…" : "确认心情并保存日记"}
      </button>
      {label === null && text.trim().length > 0 && (
        <p className="mt-2 text-xs text-stone-500">请先选择一个心情类别再保存。</p>
      )}
    </section>
  );
}