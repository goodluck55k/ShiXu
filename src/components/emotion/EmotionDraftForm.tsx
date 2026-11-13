"use client";

import { useState } from "react";
import { useApp } from "@/application/AppProvider";
import { useEmotionAnalysis } from "@/application/useEmotionAnalysis";
import { createId } from "@/application/ids";
import { createManualEmotion, MANUAL_EMOTION_DEFAULTS } from "@/domain/emotions";
import {
  EMOTION_NAMES,
  type Analysis,
  type AnalysisMeta,
  type EmotionDimensions,
  type EmotionLabel,
  type EmotionReading,
} from "@/domain/types";
import { LOW_CONFIDENCE_THRESHOLD, MOCK_PROVIDER_NAME } from "@/lib/ai/contract";
import { EmotionCategoryPicker } from "./EmotionCategoryPicker";
import { EmotionDimensionSliders } from "./EmotionDimensionSliders";

function sameDimensions(a: EmotionDimensions, b: EmotionDimensions): boolean {
  return a.valence === b.valence && a.arousal === b.arousal && a.dominance === b.dominance && a.intensity === b.intensity;
}

export function EmotionDraftForm() {
  const { state, draft, setDraft, confirmEntry, retrySave, invalidatePending } = useApp();
  const { text, label, dimensions } = draft;
  const ai = useEmotionAnalysis();
  // 只有用户点击「采纳建议」后才把建议填入草稿；任何手选/细调都会取消采纳，保存为 corrected。
  const [adopted, setAdopted] = useState<Analysis | null>(null);

  const busy = state.saving || state.tabConflict;
  const canConfirm = text.trim().length > 0 && label !== null && !busy;
  const canAnalyze = text.trim().length > 0 && !busy && !ai.loading && state.phase === "ready";

  const suggestion = ai.suggestion;
  const suggestionSession = ai.suggestionSession;

  function clearDraft() {
    setAdopted(null);
    ai.invalidate();
    setDraft({ text: "", label: null, dimensions: MANUAL_EMOTION_DEFAULTS.neutral });
  }

  function requestSuggestion() {
    setAdopted(null);
    void ai.requestAnalysis(text, createId("entry"));
  }

  function adoptSuggestion() {
    if (!suggestion || !suggestionSession || suggestionSession.text !== text) {
      ai.invalidate();
      return;
    }
    const analysis = suggestion.analysis;
    setAdopted(analysis);
    setDraft(current => ({
      ...current,
      label: analysis.label,
      dimensions: {
        valence: analysis.valence,
        arousal: analysis.arousal,
        dominance: analysis.dominance,
        intensity: analysis.intensity,
      },
    }));
    invalidatePending();
  }

  async function handleConfirm() {
    if (label === null) return;
    let emotion: EmotionReading;
    let analysis: Analysis | null = null;
    let analysisMeta: AnalysisMeta | null = null;
    if (suggestion && suggestionSession && suggestionSession.text === text) {
      analysis = suggestion.analysis;
      analysisMeta = suggestion.analysisMeta;
      const accepted =
        adopted === suggestion.analysis &&
        suggestion.analysis.label === label &&
        sameDimensions(dimensions, suggestion.analysis);
      emotion = accepted
        ? { label, ...dimensions, confidence: suggestion.analysis.confidence, source: "ai" }
        : { label, ...dimensions, confidence: null, source: "corrected" };
    } else {
      emotion = createManualEmotion(label, dimensions);
    }
    const saved = await confirmEntry(text, emotion, analysis, analysisMeta);
    if (saved) clearDraft();
  }

  async function handleRetry() {
    const saved = await retrySave();
    if (saved) clearDraft();
  }

  function selectLabel(next: EmotionLabel) {
    setAdopted(null);
    ai.overrideSelection();
    setDraft(current => ({ ...current, label: next, dimensions: MANUAL_EMOTION_DEFAULTS[next] }));
    invalidatePending();
  }

  function changeText(next: string) {
    setAdopted(null);
    ai.invalidate();
    setDraft(current => ({ ...current, text: next }));
    invalidatePending();
  }

  function changeDimensions(next: EmotionDimensions) {
    setAdopted(null);
    ai.overrideSelection();
    setDraft(current => ({ ...current, dimensions: next }));
    invalidatePending();
  }

  const lowConfidence = suggestion !== null && suggestion.analysis.confidence < LOW_CONFIDENCE_THRESHOLD;
  const unknownSuggestion = suggestion?.analysis.label === "unknown";
  const suggestionHints: string[] = [];
  if (lowConfidence) suggestionHints.push("置信度较低，请确认或手动选择。");
  if (unknownSuggestion) suggestionHints.push("AI 无法判断具体心情，请手动选择，或明确采纳「说不清」。");
  if (suggestion && suggestionHints.length === 0) suggestionHints.push("建议仅为参考，可采纳后修改，或直接手动选择。");
  const isDemo = suggestion?.analysisMeta?.provider === MOCK_PROVIDER_NAME;

  return (
    <section aria-label="写日记" className="diary-form">
      <div className="section-heading"><div><span className="section-kicker">TODAY’S NOTE</span><h2>今天想说些什么？</h2></div><span aria-hidden="true">✳</span></div>
      <p className="section-description">不必组织语言，想到什么就写下来。</p>
      <textarea disabled={state.saving} value={text} onChange={event => changeText(event.target.value)} placeholder="今天发生了什么？有什么想轻轻记下的……" rows={7} aria-label="日记正文" className="diary-input" />
      <button type="button" className="text-button" disabled={!canAnalyze} onClick={requestSuggestion}>{ai.loading ? "AI 识别中…" : "让 AI 建议心情"}</button>
      {ai.error && <div role="alert" className="save-error"><p>{ai.error.message}</p><p>草稿已保留，可手动选择心情后保存。</p></div>}
      {suggestion && (
        <div role="status" className="form-hint">
          <p>AI 建议：{EMOTION_NAMES[suggestion.analysis.label]}（置信度 {suggestion.analysis.confidence.toFixed(2)}）。{suggestionHints.join("")}{isDemo ? "（演示数据，非真实模型结果）" : ""}</p>
          {adopted === null
            ? <button type="button" className="text-button" disabled={busy} onClick={adoptSuggestion}>{unknownSuggestion ? "仍采纳「说不清」" : "采纳建议"}</button>
            : <p>已采纳 AI 建议；修改下方心情或细调后会按手动纠正保存。</p>}
        </div>
      )}
      <div className="emotion-heading"><div><span className="section-kicker">HOW DO YOU FEEL</span><h2>此刻的心情</h2></div><span>手选或采纳 AI 建议</span></div>
      <EmotionCategoryPicker value={label} disabled={busy} onSelect={selectLabel} />
      <details className="dimensions"><summary>细调一下这种感觉 <span>（可选）</span></summary>{label === null ? <p>先选择一种心情，再调整细节。</p> : <div><p>已选「{EMOTION_NAMES[label]}」，可以按自己的感觉调整。</p><EmotionDimensionSliders value={dimensions} disabled={busy} onChange={changeDimensions} /></div>}</details>
      {state.saveError && <div role="alert" className="save-error"><p>{state.saveError}</p><p>草稿已保留，本次未保存。</p>{state.pending && !state.tabConflict && <button type="button" onClick={() => void handleRetry()} disabled={state.saving} className="text-button">重试保存这一条</button>}</div>}
      <button type="button" disabled={!canConfirm} onClick={() => void handleConfirm()} className="save-button">{state.saving ? "保存中…" : "保存今天的心情"} <span aria-hidden="true">↗</span></button>
      {label === null && text.trim().length > 0 && <p className="form-hint">请先选择一个心情再保存。</p>}
      {state.savedTick > 0 && !state.saveError && <p role="status" className="form-hint">{state.temporary ? "已记录（仅本次会话）" : "已保存到本地"}</p>}
    </section>
  );
}