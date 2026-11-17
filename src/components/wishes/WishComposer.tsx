"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { WishActionResult } from "@/application/wishTypes";
import { PencilMark } from "./WishDecor";

type ComposerNotice = { kind: "success" | "error"; message: string };

export function WishComposer({
  preview,
  saving,
  canWrite,
  blockedReason,
  onCreate,
}: {
  preview: boolean;
  saving: boolean;
  canWrite: boolean;
  blockedReason: string | null;
  onCreate: (text: string) => Promise<WishActionResult>;
}) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<ComposerNotice | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || submittingRef.current) return;
    submittingRef.current = true;
    try {
      const submitted = text;
      if (submitted.trim().length === 0) {
        setNotice({ kind: "error", message: "先写下一个愿望，再放进许愿杯吧。" });
        return;
      }
      if (!canWrite) {
        setNotice({ kind: "error", message: blockedReason ?? "愿望暂时无法保存。" });
        return;
      }
      setNotice(null);
      const result = await onCreate(submitted);
      if (result.ok) {
        // 保存期间如果用户又输入了新内容，不要把它一并清空。
        setText((current) => (current === submitted ? "" : current));
        setNotice({ kind: "success", message: "愿望已经放进许愿杯里啦。" });
      } else {
        setNotice({ kind: "error", message: result.reason });
      }
    } finally {
      submittingRef.current = false;
    }
  }

  const hint = notice
    ? notice.message
    : preview
      ? "开发预览模式 · 愿望只存在于当前页面，不会写入真实存档。"
      : saving
        ? "正在把愿望放进许愿杯…"
        : !canWrite && blockedReason
          ? blockedReason
          : "愿望只保存在这台设备的浏览器里，不会上传。";
  const hintClass = [
    "wish-composer-hint",
    notice || (!canWrite && blockedReason) ? "show" : "",
    notice?.kind === "error" ? "error" : "",
    notice?.kind === "success" ? "success" : "",
  ].filter(Boolean).join(" ");

  return (
    <form className="wish-composer" onSubmit={onSubmit} aria-label="写愿望">
      <span className="wish-composer-tape" aria-hidden="true" />
      <PencilMark />
      <input
        type="text"
        className="wish-input"
        value={text}
        onChange={(event) => { setText(event.target.value); setNotice(null); }}
        placeholder="写下一个小小愿望…"
        aria-label="愿望内容"
        aria-describedby="wish-composer-hint"
      />
      <button
        type="submit"
        className="wish-submit"
        title="把愿望放进许愿杯"
        disabled={saving || !canWrite}
        aria-busy={saving}
      >
        <span className="wish-submit-spark" aria-hidden="true">✧</span>
        <span className="wish-submit-label">{saving ? "正在放进…" : "放进许愿杯"}</span>
        <span className="wish-submit-plus" aria-hidden="true">{saving ? "…" : "＋"}</span>
      </button>
      <p id="wish-composer-hint" className={hintClass} role="status" aria-live="polite">
        {hint}
      </p>
    </form>
  );
}