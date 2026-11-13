"use client";

import { useCallback, useRef, useState } from "react";
import {
  AnalysisSessionTracker,
  evaluateEmotionResponse,
  type AnalysisSession,
  type EmotionAnalysisError,
  type EmotionSuggestion,
} from "@/lib/ai/client";
import { EMOTION_API_ERROR_MESSAGES } from "@/lib/ai/contract";
import { createId } from "./ids";

// AI 识别会话（docs/AI_CONTRACT.md §1、§3）：成功与失败响应只在三元组全匹配
// 且会话仍有效时采纳；旧响应不覆盖新草稿或用户已手选的状态。

export type { EmotionAnalysisError, EmotionSuggestion };

const CLIENT_TIMEOUT_MS = 20000;

export function useEmotionAnalysis() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<EmotionSuggestion | null>(null);
  // 建议对应的请求身份；组件保存/纠正前再次核对正文与修订绑定。
  const [suggestionSession, setSuggestionSession] = useState<AnalysisSession | null>(null);
  const [error, setError] = useState<EmotionAnalysisError | null>(null);
  const trackerRef = useRef(new AnalysisSessionTracker());
  const abortRef = useRef<AbortController | null>(null);

  // 正文编辑、保存、取消、切换记录：整体失效并清除建议
  const invalidate = useCallback(() => {
    trackerRef.current.invalidate();
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setSuggestion(null);
    setSuggestionSession(null);
    setError(null);
  }, []);

  // 加载期间用户手选：丢弃在途响应；已到达的建议保留给用户显式采纳
  const overrideSelection = useCallback(() => {
    trackerRef.current.invalidate();
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setError(null);
  }, []);

  const requestAnalysis = useCallback(async (text: string, entryId: string) => {
    if (text.trim().length === 0) return;
    const tracker = trackerRef.current;
    tracker.invalidate();
    abortRef.current?.abort();
    const session = tracker.begin(createId("req"), entryId, text);
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);
    setLoading(true);
    setSuggestion(null);
    setSuggestionSession(null);
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
      if (!tracker.isActive(session)) return;
      const outcome = evaluateEmotionResponse(payload, response.status, session);
      if (outcome.kind === "ignore") return;
      if (outcome.kind === "error") {
        setError(outcome.error);
        return;
      }
      setSuggestion(outcome.suggestion);
      setSuggestionSession(session);
    } catch {
      if (!tracker.isActive(session)) return;
      if (timedOut) {
        setError({ code: "AI_TIMEOUT", message: EMOTION_API_ERROR_MESSAGES.AI_TIMEOUT });
      } else {
        setError({ code: "AI_UPSTREAM_ERROR", message: EMOTION_API_ERROR_MESSAGES.AI_UPSTREAM_ERROR });
      }
    } finally {
      clearTimeout(timer);
      if (tracker.isActive(session)) setLoading(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  return { loading, suggestion, suggestionSession, error, requestAnalysis, invalidate, overrideSelection };
}