"use client";

import { useCallback, useRef, useState } from "react";
import { EMOTION_LABELS, type Analysis, type AnalysisMeta } from "@/domain/types";
import {
  EMOTION_API_ERROR_MESSAGES,
  type EmotionApiResponse,
} from "@/lib/ai/contract";
import { createId } from "./ids";

// AI 识别会话（docs/AI_CONTRACT.md §1）：成功与失败响应只在三元组全匹配
// 且会话仍有效时采纳；旧响应不覆盖新草稿或用户已手选的状态。

export interface EmotionSuggestion {
  analysis: Analysis;
  analysisMeta: AnalysisMeta | null;
}

export interface EmotionAnalysisError {
  code: string;
  message: string;
}

interface AnalysisSession {
  requestId: string;
  entryId: string;
  inputRevision: number;
  active: boolean;
}

const CLIENT_TIMEOUT_MS = 20000;

function isUnitInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isAnalysisShape(value: unknown): value is Analysis {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === 1 &&
    typeof record.label === "string" &&
    EMOTION_LABELS.includes(record.label as never) &&
    isUnitInterval(record.valence) &&
    isUnitInterval(record.arousal) &&
    isUnitInterval(record.dominance) &&
    isUnitInterval(record.intensity) &&
    isUnitInterval(record.confidence)
  );
}

export function useEmotionAnalysis() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<EmotionSuggestion | null>(null);
  const [error, setError] = useState<EmotionAnalysisError | null>(null);
  const sessionRef = useRef<AnalysisSession | null>(null);
  const revisionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // 正文编辑、保存、取消、切换记录：整体失效并清除建议
  const invalidate = useCallback(() => {
    if (sessionRef.current) sessionRef.current.active = false;
    sessionRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    revisionRef.current += 1;
    setLoading(false);
    setSuggestion(null);
    setError(null);
  }, []);

  // 加载期间用户手选：丢弃在途响应，不清除已有建议之外的用户状态
  const overrideSelection = useCallback(() => {
    revisionRef.current += 1;
    if (sessionRef.current) sessionRef.current.active = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setError(null);
  }, []);

  const requestAnalysis = useCallback(async (text: string, entryId: string) => {
    if (text.trim().length === 0) return;
    if (sessionRef.current) sessionRef.current.active = false;
    abortRef.current?.abort();
    revisionRef.current += 1;
    const session: AnalysisSession = {
      requestId: createId("req"),
      entryId,
      inputRevision: revisionRef.current,
      active: true,
    };
    sessionRef.current = session;
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    const isCurrent = () => sessionRef.current === session && session.active;
    setLoading(true);
    setSuggestion(null);
    setError(null);
    try {
      const response = await fetch("/api/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          requestId: session.requestId,
          entryId: session.entryId,
          inputRevision: session.inputRevision,
          text,
        }),
        signal: controller.signal,
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!isCurrent()) return;
      if (typeof payload === "object" && payload !== null && "ok" in payload) {
        const envelope = payload as EmotionApiResponse;
        if (
          envelope.requestId !== session.requestId ||
          envelope.entryId !== session.entryId ||
          envelope.inputRevision !== session.inputRevision
        ) {
          return;
        }
        if (envelope.ok) {
          if (!isAnalysisShape(envelope.analysis)) {
            setError({ code: "AI_INVALID_OUTPUT", message: EMOTION_API_ERROR_MESSAGES.AI_INVALID_OUTPUT });
          } else {
            setSuggestion({ analysis: envelope.analysis, analysisMeta: envelope.analysisMeta ?? null });
          }
        } else {
          const code = typeof envelope.code === "string" ? envelope.code : "AI_UPSTREAM_ERROR";
          const message = typeof envelope.message === "string" && envelope.message
            ? envelope.message
            : EMOTION_API_ERROR_MESSAGES.AI_UPSTREAM_ERROR;
          setError({ code, message });
        }
      } else {
        const code = response.status === 413 ? "INPUT_TOO_LONG" : "AI_UPSTREAM_ERROR";
        setError({ code, message: EMOTION_API_ERROR_MESSAGES[code] });
      }
    } catch {
      if (!isCurrent()) return;
      setError({ code: "AI_UPSTREAM_ERROR", message: EMOTION_API_ERROR_MESSAGES.AI_UPSTREAM_ERROR });
    } finally {
      clearTimeout(timer);
      if (isCurrent()) setLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  return { loading, suggestion, error, requestAnalysis, invalidate, overrideSelection };
}