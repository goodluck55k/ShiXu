"use client";

import { useEffect, useRef, useState } from "react";
import type { WishActionResult } from "@/application/wishTypes";
import type { WishCompletionNotice } from "@/application/useWishHouse";
import type { WishDecorIcon, WishStatus, WishView } from "./wishView";
import { formatWishCompletedAt } from "./wishView";
import { BoardSprig } from "./WishDecor";

function WishIcon({ icon }: { icon?: WishDecorIcon }) {
  const stroke = { fill: "none", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (icon) {
    case "shoe":
      return <svg viewBox="0 0 28 28" aria-hidden="true" className="wish-item-icon" style={{ color: "#7d9c50" }}><path d="M4 18c0-2 1-6 2-8l4 2c2 1 4 1 6 3 3 2 8 2 8 5v2H4Z" {...stroke} stroke="currentColor" /><path d="M4 20h20M12 14l1.5-2M15 15.5l1.5-2" {...stroke} stroke="currentColor" /></svg>;
    case "book":
      return <svg viewBox="0 0 28 28" aria-hidden="true" className="wish-item-icon" style={{ color: "#d99a38" }}><path d="M14 7c-2.5-1.6-5.5-2-8-1.4V21c2.5-.6 5.5-.2 8 1.4 2.5-1.6 5.5-2 8-1.4V5.6C19.5 5 16.5 5.4 14 7Z" {...stroke} stroke="currentColor" /><path d="M14 7v15.4" {...stroke} stroke="currentColor" /></svg>;
    case "trip":
      return <svg viewBox="0 0 28 28" aria-hidden="true" className="wish-item-icon" style={{ color: "#d99a38" }}><path d="M3 21 10 9l4 6 3-4 8 10Z" {...stroke} stroke="currentColor" /><circle cx="20" cy="7" r="2.4" {...stroke} stroke="currentColor" /></svg>;
    case "phone":
      return <svg viewBox="0 0 28 28" aria-hidden="true" className="wish-item-icon" style={{ color: "#7d9c50" }}><path d="M7 4h5l1.5 5-3 2c1 3 3.5 5.5 6.5 6.5l2-3 5 1.5v5c0 1-1 2-2 2C12 23 5 16 5 6c0-1 1-2 2-2Z" {...stroke} stroke="currentColor" /></svg>;
    case "dish":
      return <svg viewBox="0 0 28 28" aria-hidden="true" className="wish-item-icon" style={{ color: "#d99a38" }}><path d="M4 16h20c0 4-4 7-10 7S4 20 4 16Z" {...stroke} stroke="currentColor" /><path d="M8 16c0-5 3-9 6-9s6 4 6 9M14 7V4" {...stroke} stroke="currentColor" /></svg>;
    default:
      return <svg viewBox="0 0 28 28" aria-hidden="true" className="wish-item-icon" style={{ color: "#7d9c50" }}><path d="M14 24V12M14 14c-1-5-5-8-10-7 1 5 5 8 10 7ZM14 12c1-5 5-8 10-7-1 5-5 8-10 7Z" {...stroke} stroke="currentColor" /></svg>;
  }
}

function shorten(text: string, max = 24): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function WishBoard({
  wishes,
  loading,
  readable,
  canWrite,
  saving,
  busyWishId,
  completionNotice,
  onComplete,
}: {
  wishes: WishView[];
  loading: boolean;
  readable: boolean;
  canWrite: boolean;
  saving: boolean;
  busyWishId: string | null;
  completionNotice: WishCompletionNotice | null;
  onComplete: (wishId: string) => Promise<WishActionResult>;
}) {
  const [tab, setTab] = useState<WishStatus>("pending");
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [dismissedNonce, setDismissedNonce] = useState(0);
  const submittingRef = useRef(false);
  const pending = wishes.filter((wish) => wish.status === "pending");
  const completed = wishes.filter((wish) => wish.status === "completed");
  const list = tab === "pending" ? pending : completed;

  useEffect(() => {
    if (!completionNotice) return;
    const timer = window.setTimeout(() => setDismissedNonce(completionNotice.nonce), 6000);
    return () => window.clearTimeout(timer);
  }, [completionNotice]);

  async function handleComplete(wish: WishView) {
    if (saving || !canWrite || submittingRef.current) return;
    submittingRef.current = true;
    setCompleteError(null);
    if (completionNotice) setDismissedNonce(completionNotice.nonce);
    try {
      const result = await onComplete(wish.id);
      if (!result.ok) setCompleteError(result.reason);
    } finally {
      submittingRef.current = false;
    }
  }

  const visibleCompletion = completionNotice && completionNotice.nonce !== dismissedNonce ? completionNotice : null;
  const feedback = completeError ?? (
    visibleCompletion ? `「${shorten(visibleCompletion.text)}」已经完成，变成了一颗星星。` : null
  );

  return (
    <section className="wish-board" aria-label="愿望面板">
      <span className="wish-board-clip" aria-hidden="true">
        <svg viewBox="0 0 56 54">
          <defs>
            <linearGradient id="wish-clip-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e2aa73" />
              <stop offset=".55" stopColor="#c7874f" />
              <stop offset="1" stopColor="#a36434" />
            </linearGradient>
          </defs>
          <path d="M18 11c0-6 4.5-9.5 10-9.5s10 3.5 10 9.5v5.5h8.5c2.8 0 5 2.2 5 5V44c0 2.8-2.2 5-5 5H9.5c-2.8 0-5-2.2-5-5V21.5c0-2.8 2.2-5 5-5H18Z" fill="url(#wish-clip-metal)" stroke="#844e26" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="28" cy="10.5" r="4.2" fill="#fbf0dc" stroke="#844e26" strokeWidth="1.8" />
          <rect x="11" y="25" width="34" height="5.5" rx="2.75" fill="#f3c894" opacity=".88" />
          <path d="M11 21h34" stroke="#f8dcb2" strokeWidth="1.6" strokeLinecap="round" opacity=".65" />
        </svg>
      </span>
      <div className="wish-board-paper">
        <div className="wish-tabs" role="tablist" aria-label="愿望状态">
          <button type="button" role="tab" id="wish-tab-pending" aria-selected={tab === "pending"} aria-controls="wish-list" className={tab === "pending" ? "wish-tab active" : "wish-tab"} onClick={() => setTab("pending")}>待完成（{pending.length}）</button>
          <button type="button" role="tab" id="wish-tab-completed" aria-selected={tab === "completed"} aria-controls="wish-list" className={tab === "completed" ? "wish-tab active" : "wish-tab"} onClick={() => setTab("completed")}>已完成（{completed.length}）</button>
        </div>
        <div className="wish-board-feedback" role="status" aria-live="polite">
          {feedback && (
            <p className={completeError ? "wish-board-notice error" : "wish-board-notice success"} role={completeError ? "alert" : undefined}>
              {feedback}
            </p>
          )}
        </div>
        <div className="wish-list-wrap" id="wish-list" role="tabpanel" tabIndex={0} aria-labelledby={tab === "pending" ? "wish-tab-pending" : "wish-tab-completed"}>
          {loading ? (
            <div className="wish-empty">
              <span aria-hidden="true">✧</span>
              <p>正在打开许愿杯…</p>
              <small>愿望只保存在这台设备里。</small>
            </div>
          ) : !readable ? (
            <div className="wish-empty">
              <span aria-hidden="true">✧</span>
              <p>愿望暂时无法显示。</p>
              <small>请查看上方的恢复提示。</small>
            </div>
          ) : list.length > 0 ? (
            <ul className="wish-list">
              {list.map((wish) => {
                const completedAt = wish.status === "completed" ? formatWishCompletedAt(wish.completedAt) : null;
                const busy = busyWishId === wish.id;
                return (
                  <li key={wish.id} data-wish-id={wish.id} className={wish.status === "completed" ? "wish-item done" : "wish-item"}>
                    <span className="wish-status" aria-hidden="true">
                      {wish.status === "completed"
                        ? <svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="9.4" fill="#dbe39e" stroke="#8b9c50" strokeWidth="1.6" /><path d="m6.6 11.4 3 3 5.8-6.4" fill="none" stroke="#52612c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="9.4" fill="#fffdf4" stroke="#c9a25e" strokeWidth="1.8" /></svg>}
                    </span>
                    <span className="wish-text">
                      <span className="wish-text-body">{wish.text}</span>
                      {completedAt && <time className="wish-time" dateTime={completedAt.dateTime}>{completedAt.label}</time>}
                    </span>
                    {wish.icon && <WishIcon icon={wish.icon} />}
                    <span className="wish-heart" aria-hidden="true">♡</span>
                    {wish.status === "pending" && (
                      <button
                        type="button"
                        className="wish-done"
                        data-wish-id={wish.id}
                        disabled={!canWrite || saving}
                        aria-busy={busy}
                        aria-label={`标记愿望「${wish.text}」为已完成`}
                        onClick={() => void handleComplete(wish)}
                      >
                        {busy ? "完成中…" : "完成"}
                      </button>
                    )}
                    <span className="wish-sr">{wish.status === "completed" ? "已完成" : "待完成"}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="wish-empty">
              <span aria-hidden="true">✧</span>
              <p>{tab === "pending" ? (completed.length > 0 ? "待完成的小愿望都完成啦。" : "还没有写下愿望。") : "还没有完成的愿望。"}</p>
              <small>{tab === "pending" ? (completed.length > 0 ? "新的小愿望也可以放进许愿杯里。" : "在下方写下第一个小小愿望吧。") : "慢慢来，每一个愿望都值得等待。"}</small>
            </div>
          )}
        </div>
        <span className="wish-board-sprig" aria-hidden="true"><BoardSprig /></span>
      </div>
    </section>
  );
}