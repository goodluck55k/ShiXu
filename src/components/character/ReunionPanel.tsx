"use client";
import { useState } from "react";
import { useApp } from "@/application/AppProvider";

// 功能性占位展示：只渲染正式存档中待处理的问候；回应/跳过必须成功持久化后才清除，失败保留并允许重试。
export function ReunionPanel() {
  const { state, dismissReunion } = useApp();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompt = state.snapshot?.reunion.pending ?? null;
  if (!prompt) return null;
  const close = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const ok = await dismissReunion();
    setSubmitting(false);
    if (!ok) {
      setError("处理结果还没有保存成功，问候会保留在这里，请稍后再试。");
      return;
    }
    setAnswer("");
  };
  return (
    <section className="companion-profile reunion-panel" aria-label="久别重逢">
      <div className="section-heading">
        <div>
          <span className="section-kicker">A GENTLE HELLO</span>
          <h2>小白人想和你说说话</h2>
        </div>
        <span aria-hidden="true">✾</span>
      </div>
      <p className="reunion-message">{prompt.message}</p>
      <p className="reunion-question">{prompt.question}</p>
      <label className="reunion-answer-label" htmlFor="reunion-answer">
        想说的话（只留在这一刻）
      </label>
      <textarea
        id="reunion-answer"
        className="reunion-answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        rows={2}
      />
      <div className="reunion-actions">
        <button
          type="button"
          onClick={() => void close()}
          disabled={submitting || answer.trim().length === 0}
        >
          回应
        </button>
        <button type="button" onClick={() => void close()} disabled={submitting}>
          跳过
        </button>
      </div>
      <p className="profile-note">这句话不会写入日记，也不会改变小人的性格。</p>
      {error && (
        <p role="alert" className="profile-note">
          {error}
        </p>
      )}
    </section>
  );
}
