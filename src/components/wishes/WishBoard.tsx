"use client";

import { useState } from "react";
import type { WishDecorIcon, WishStatus, WishView } from "./wishView";
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

/** Hand-journal wish board. Displays the wishes it is given; completion actions arrive in round two. */
export function WishBoard({ wishes }: { wishes: WishView[] }) {
  const [tab, setTab] = useState<WishStatus>("pending");
  const pending = wishes.filter((w) => w.status === "pending");
  const completed = wishes.filter((w) => w.status === "completed");
  const list = tab === "pending" ? pending : completed;
  return (
    <section className="wish-board" aria-label="愿望面板">
      <span className="wish-board-clip" aria-hidden="true">
        <svg viewBox="0 0 44 52"><path d="M14 10c0-5 4-8 8-8s8 3 8 8v6h6c2 0 4 2 4 4v26c0 2-2 4-4 4H8c-2 0-4-2-4-4V20c0-2 2-4 4-4h6Z" fill="#c98d5a" stroke="#8f5c30" strokeWidth="2" /><circle cx="22" cy="10" r="4" fill="#f6e3c2" stroke="#8f5c30" strokeWidth="2" /><rect x="10" y="24" width="24" height="5" rx="2.5" fill="#e8b87b" /></svg>
      </span>
      <div className="wish-board-paper">
        <div className="wish-tabs" role="tablist" aria-label="愿望状态">
          <button type="button" role="tab" id="wish-tab-pending" aria-selected={tab === "pending"} aria-controls="wish-list" className={tab === "pending" ? "wish-tab active" : "wish-tab"} onClick={() => setTab("pending")}>待完成（{pending.length}）</button>
          <button type="button" role="tab" id="wish-tab-completed" aria-selected={tab === "completed"} aria-controls="wish-list" className={tab === "completed" ? "wish-tab active" : "wish-tab"} onClick={() => setTab("completed")}>已完成（{completed.length}）</button>
        </div>
        <div className="wish-list-wrap" id="wish-list" role="tabpanel" tabIndex={0} aria-labelledby={tab === "pending" ? "wish-tab-pending" : "wish-tab-completed"}>
          {list.length > 0 ? (
            <ul className="wish-list">
              {list.map((wish) => (
                <li key={wish.id} className={wish.status === "completed" ? "wish-item done" : "wish-item"}>
                  <span className="wish-status" aria-hidden="true">
                    {wish.status === "completed"
                      ? <svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="9.4" fill="#dbe39e" stroke="#8b9c50" strokeWidth="1.6" /><path d="m6.6 11.4 3 3 5.8-6.4" fill="none" stroke="#52612c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      : <svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="9.4" fill="#fffdf4" stroke="#c9a25e" strokeWidth="1.8" /></svg>}
                  </span>
                  <span className="wish-text">{wish.text}</span>
                  <span className="wish-heart" aria-hidden="true">♡</span>
                  <WishIcon icon={wish.icon} />
                  <span className="wish-sr">{wish.status === "completed" ? "已完成" : "待完成"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="wish-empty">
              <span aria-hidden="true">✧</span>
              <p>{tab === "pending" ? "还没有写下愿望。" : "还没有完成的愿望。"}</p>
              <small>{tab === "pending" ? "在下方写下第一个小小愿望吧。" : "慢慢来，每一个愿望都值得等待。"}</small>
            </div>
          )}
        </div>
        <span className="wish-board-sprig" aria-hidden="true"><BoardSprig /></span>
      </div>
    </section>
  );
}
