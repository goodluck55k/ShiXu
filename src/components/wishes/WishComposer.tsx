"use client";

import { useState, type FormEvent } from "react";
import { PencilMark } from "./WishDecor";

/**
 * Wish writing strip. Round one is visual only: typing works, but submitting
 * never claims a save — it explains that persistence arrives in round two.
 */
export function WishComposer() {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(true);
  }

  return (
    <form className="wish-composer" onSubmit={onSubmit} aria-label="写愿望">
      <span className="wish-composer-tape" aria-hidden="true" />
      <PencilMark />
      <input
        type="text"
        className="wish-input"
        value={text}
        onChange={(event) => { setText(event.target.value); setNotice(false); }}
        placeholder="写下一个小小愿望…"
        aria-label="愿望内容"
        aria-describedby="wish-composer-hint"
      />
      <button type="submit" className="wish-submit" title="保存功能将在第二轮接入">
        <span className="wish-submit-spark" aria-hidden="true">✧</span>
        <span className="wish-submit-label">放进许愿杯</span>
        <span className="wish-submit-plus" aria-hidden="true">＋</span>
      </button>
      <p id="wish-composer-hint" className={notice ? "wish-composer-hint show" : "wish-composer-hint"} role="status">
        {notice
          ? "第一轮视觉预览：保存功能尚未接入，这段愿望先留在纸上，不会被保存。"
          : "第一轮视觉预览 · 愿望保存将在下一轮接入"}
      </p>
    </form>
  );
}