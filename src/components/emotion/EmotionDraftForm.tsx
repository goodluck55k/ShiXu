"use client";

import { useState } from "react";
import Link from "next/link";
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
      <div className="diary-sheet">
        <span className="diary-sheet-tape" aria-hidden="true" />
        <textarea disabled={state.saving} value={text} onChange={event => changeText(event.target.value)} placeholder="今天发生了什么？有什么想轻轻记下的……" rows={7} aria-label="日记正文" className="diary-input" />
      </div>
      <div className="mood-card">
        <div className="emotion-heading">
          <h2><MoodHeadingIcon />今天的心情是？</h2>
          <button type="button" className="ai-suggestion-button" disabled={!canAnalyze} onClick={requestSuggestion} aria-busy={ai.loading}>
            <SparkleIcon />{ai.loading ? "AI 识别中…" : "让 AI 建议心情"}
          </button>
        </div>
        {ai.error && <div role="alert" className="save-error ai-error"><p>{ai.error.message}</p><p>草稿已保留，可手动选择心情后保存。</p></div>}
        {suggestion && (
          <div role="status" className="form-hint ai-note">
            <span className="ai-note-tag" aria-hidden="true">AI 的小建议 · 仅供参考</span>
            <p>AI 建议：<b>{EMOTION_NAMES[suggestion.analysis.label]}</b>（置信度 {suggestion.analysis.confidence.toFixed(2)}）。{suggestionHints.join("")}{isDemo ? "（演示数据，非真实模型结果）" : ""}</p>
            {adopted === null
              ? <button type="button" className="text-button" disabled={busy} onClick={adoptSuggestion}>{unknownSuggestion ? "仍采纳「说不清」" : "采纳建议"}</button>
              : <p>已采纳 AI 建议；修改下方心情或细调后会按手动纠正保存。</p>}
          </div>
        )}
        <EmotionCategoryPicker value={label} disabled={busy} onSelect={selectLabel} appearance="sticker" />
        <details className="dimensions">
          <summary><SlidersIcon />细调一下这种感觉 <span>（可选）</span><ChevronIcon /></summary>
          {label === null ? <p>先选择一种心情，再调整细节。</p> : <div><p>已选「{EMOTION_NAMES[label]}」，可以按自己的感觉调整。</p><EmotionDimensionSliders value={dimensions} disabled={busy} onChange={changeDimensions} /></div>}
        </details>
      </div>
      {state.saveError && <div role="alert" className="save-error"><p>{state.saveError}</p><p>草稿已保留，本次未保存。</p>{state.pending && !state.tabConflict && <button type="button" onClick={() => void handleRetry()} disabled={state.saving} className="text-button">重试保存这一条</button>}</div>}
      <button type="button" disabled={!canConfirm} onClick={() => void handleConfirm()} className="save-button" aria-busy={state.saving}><SaveIcon /><span>{state.saving ? "保存中…" : "保存今天的心情"}</span></button>
      {label === null && text.trim().length > 0 && <p className="form-hint save-hint">请先选择一个心情再保存。</p>}
      {state.savedNotice && !state.saveError && <p role="status" className="form-hint saved-note"><span className="saved-stamp" aria-hidden="true">✓</span>{state.savedNotice === "temporary" ? "已记录（仅本次会话，刷新后不保留）" : "已保存到本地"}　<Link href="/">回小屋看看 →</Link></p>}
    </section>
  );
}

function MoodHeadingIcon() {
  return (
    <svg className="mood-heading-icon" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12.5" fill="#fde3bf" stroke="#d98a4e" strokeWidth="2" />
      <circle cx="12" cy="14" r="1.6" fill="#7a4a2c" /><circle cx="20" cy="14" r="1.6" fill="#7a4a2c" />
      <path d="M11.5 19c2.6 2.6 6.4 2.6 9 0" fill="none" stroke="#7a4a2c" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" fill="#f2c94c" stroke="#a7802a" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M19 15c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7z" fill="#a9c27a" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.3" fill="#fffaf1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15" cy="12" r="2.3" fill="#fffaf1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="17" r="2.3" fill="#fffaf1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="dimensions-chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg className="btn-icon save-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M8 4v5h7V4M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}