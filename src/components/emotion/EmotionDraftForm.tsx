"use client";

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
  const { state, draft, setDraft, confirmEntry, retrySave, invalidatePending } = useApp();
  const { text, label, dimensions } = draft;

  const busy = state.saving || state.tabConflict;
  const canConfirm = text.trim().length > 0 && label !== null && !busy;

  function clearDraft() {
    setDraft({ text: "", label: null, dimensions: MANUAL_EMOTION_DEFAULTS.neutral });
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
    setDraft(current => ({ ...current, label: next, dimensions: MANUAL_EMOTION_DEFAULTS[next] }));
    invalidatePending();
  }

  function changeText(next: string) {
    setDraft(current => ({ ...current, text: next }));
    invalidatePending();
  }

  function changeDimensions(next: EmotionDimensions) {
    setDraft(current => ({ ...current, dimensions: next }));
    invalidatePending();
  }

  return (
    <section aria-label="写日记" className="diary-form">
      <div className="section-heading"><div><span className="section-kicker">TODAY’S NOTE</span><h2>今天想说些什么？</h2></div><span aria-hidden="true">✳</span></div>
      <p className="section-description">不必组织语言，想到什么就写下来。</p>
      <textarea disabled={state.saving} value={text} onChange={event => changeText(event.target.value)} placeholder="今天发生了什么？有什么想轻轻记下的……" rows={7} aria-label="日记正文" className="diary-input" />
      <div className="emotion-heading"><div><span className="section-kicker">HOW DO YOU FEEL</span><h2>此刻的心情</h2></div><span>手动选择一种</span></div>
      <EmotionCategoryPicker value={label} disabled={busy} onSelect={selectLabel} />
      <details className="dimensions"><summary>细调一下这种感觉 <span>（可选）</span></summary>{label === null ? <p>先选择一种心情，再调整细节。</p> : <div><p>已选「{EMOTION_NAMES[label]}」，可以按自己的感觉调整。</p><EmotionDimensionSliders value={dimensions} disabled={busy} onChange={changeDimensions} /></div>}</details>
      {state.saveError && <div role="alert" className="save-error"><p>{state.saveError}</p><p>草稿已保留，本次未保存。</p>{state.pending && !state.tabConflict && <button type="button" onClick={() => void handleRetry()} disabled={state.saving} className="text-button">重试保存这一条</button>}</div>}
      <button type="button" disabled={!canConfirm} onClick={() => void handleConfirm()} className="save-button">{state.saving ? "保存中…" : "保存今天的心情"} <span aria-hidden="true">↗</span></button>
      {label === null && text.trim().length > 0 && <p className="form-hint">请先选择一个心情再保存。</p>}
      {state.savedTick > 0 && !state.saveError && <p role="status" className="form-hint">{state.temporary ? "已记录（仅本次会话）" : "已保存到本地"}</p>}
    </section>
  );
}
