"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/application/AppProvider";
import { useEmotionAnalysis } from "@/application/useEmotionAnalysis";
import { canCorrectContribution } from "@/domain/personality";
import { MANUAL_EMOTION_DEFAULTS } from "@/domain/emotions";
import {
  EMOTION_NAMES,
  type EmotionDimensions,
  type EmotionLabel,
  type EmotionReading,
  type Entry,
} from "@/domain/types";
import { LOW_CONFIDENCE_THRESHOLD, MOCK_PROVIDER_NAME } from "@/lib/ai/contract";
import { EmotionCategoryPicker } from "./EmotionCategoryPicker";
import { EmotionDimensionSliders } from "./EmotionDimensionSliders";

// 已保存记录的最小纠正控件：AI 重识别建议或手选后经 CORRECT_EMOTION 提交，
// 替换贡献不叠加；正文与已有成长记录不受影响（docs/AI_CONTRACT.md §4）。
export function EntryEmotionCorrection({ entry }: { entry: Entry }) {
  const { state, correctEmotion } = useApp();
  const ai = useEmotionAnalysis();
  const [label, setLabel] = useState<EmotionLabel | null>(null);
  const [dimensions, setDimensions] = useState<EmotionDimensions>(MANUAL_EMOTION_DEFAULTS.neutral);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestedRevision, setRequestedRevision] = useState<number | null>(null);

  const unavailable = !!state.snapshot && !canCorrectContribution(state.snapshot.personality, entry.id);
  const busy = state.saving || state.tabConflict || unavailable;
  const invalidate = ai.invalidate;
  useEffect(() => invalidate, [invalidate]);

  const suggestion = ai.suggestion;
  const revisionChanged = requestedRevision !== null && entry.revision !== requestedRevision;
  const usableSuggestion = suggestion && !revisionChanged ? suggestion : null;
  const needsExtraConfirmation =
    usableSuggestion !== null &&
    (usableSuggestion.analysis.confidence < LOW_CONFIDENCE_THRESHOLD || usableSuggestion.analysis.label === "unknown");
  const isDemo = usableSuggestion?.analysisMeta?.provider === MOCK_PROVIDER_NAME;

  function resetControls(message: string | null) {
    setRequestedRevision(null);
    setLabel(null);
    setDimensions(MANUAL_EMOTION_DEFAULTS.neutral);
    ai.invalidate();
    setNotice(message);
  }

  function handleAnalyze() {
    setNotice(null);
    setRequestedRevision(entry.revision);
    void ai.requestAnalysis(entry.text, entry.id);
  }

  async function submitCorrection(emotion: EmotionReading) {
    const analysis = usableSuggestion?.analysis ?? null;
    const analysisMeta = usableSuggestion?.analysisMeta ?? null;
    const saved = await correctEmotion(entry.id, entry.revision, emotion, analysis, analysisMeta);
    if (saved) {
      resetControls("已纠正这条记录的心情。");
    } else {
      setNotice(state.tabConflict ? "提交已暂停，请重新加载后再试。" : "本次未保存，记录可能已变化，请重新操作。");
    }
  }

  function handleAdoptSuggestion() {
    if (!usableSuggestion) return;
    const analysis = usableSuggestion.analysis;
    void submitCorrection({
      label: analysis.label,
      valence: analysis.valence,
      arousal: analysis.arousal,
      dominance: analysis.dominance,
      intensity: analysis.intensity,
      confidence: null,
      source: "corrected",
    });
  }

  function handleManualCorrect() {
    if (label === null) return;
    void submitCorrection({ label, ...dimensions, confidence: null, source: "corrected" });
  }

  function selectLabel(next: EmotionLabel) {
    ai.overrideSelection();
    setLabel(next);
    setDimensions(MANUAL_EMOTION_DEFAULTS[next]);
    setNotice(null);
  }

  return (
    <div className="dimensions">
      <p>纠正这条记录的心情（不改变正文，不重复计分）。</p>
      {unavailable && <p role="status">这条记录的历史性格规则不可用，暂时无法纠正心情；原记录已保留。</p>}
      <button type="button" className="text-button" disabled={busy || ai.loading || state.phase !== "ready"} onClick={handleAnalyze}>{ai.loading ? "AI 重新识别中…" : "AI 重新识别"}</button>
      {ai.error && <div role="alert" className="save-error"><p>{ai.error.message}</p><p>也可手动选择新心情后保存纠正。</p></div>}
      {suggestion && revisionChanged && <p role="alert" className="form-hint">这条记录已变化，识别结果已丢弃，请重新识别。</p>}
      {usableSuggestion && <p role="status" className="form-hint">AI 建议：{EMOTION_NAMES[usableSuggestion.analysis.label]}（置信度 {usableSuggestion.analysis.confidence.toFixed(2)}）。{needsExtraConfirmation ? "建议先确认或手动选择。" : ""}{isDemo ? "（演示数据，非真实模型结果）" : ""}<button type="button" className="text-button" disabled={busy} onClick={handleAdoptSuggestion}>采纳建议并纠正</button></p>}
      <EmotionCategoryPicker value={label} disabled={busy} onSelect={selectLabel} />
      {label !== null && <details className="dimensions"><summary>细调一下这种感觉 <span>（可选）</span></summary><div><p>已选「{EMOTION_NAMES[label]}」，可以按自己的感觉调整。</p><EmotionDimensionSliders value={dimensions} disabled={busy} onChange={setDimensions} /></div></details>}
      <button type="button" className="text-button" disabled={label === null || busy} onClick={handleManualCorrect}>保存纠正</button>
      {notice && <p role="status" className="form-hint">{notice}</p>}
    </div>
  );
}