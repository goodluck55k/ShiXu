"use client";
import { useState } from "react";
import { useApp } from "@/application/AppProvider";

// 功能性占位展示：只渲染应用层已成功提交的一次性问候；回答/跳过均为本地临时状态，不写日记/分数/存档。
export function ReunionPanel() {
  const { state, dismissReunion } = useApp();
  const [answer, setAnswer] = useState("");
  const prompt = state.reunionPrompt;
  if (!prompt) return null;
  const close = () => {
    setAnswer("");
    dismissReunion();
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
        <button type="button" onClick={close} disabled={answer.trim().length === 0}>
          回应
        </button>
        <button type="button" onClick={close}>
          跳过
        </button>
      </div>
      <p className="profile-note">这句话不会写入日记，也不会改变小人的性格。</p>
    </section>
  );
}
