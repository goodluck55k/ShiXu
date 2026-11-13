"use client";
import type { Snapshot } from "@/domain/types";

// 最小离线生活呈现：只渲染已成功保存的快照事件；本次回来与更早片段分开；不写日记/回忆，不显示分数。
export function OfflineLifePanel({ snapshot }: { snapshot: Snapshot }) {
  const { events, lastWindowStart } = snapshot.offlineLife;
  if (events.length === 0) return null;
  const current = events.filter((item) => item.windowStart === lastWindowStart);
  const history = events.filter((item) => item.windowStart !== lastWindowStart);
  return (
    <section className="companion-profile" aria-label="小人的离线生活">
      <div className="section-heading">
        <div>
          <span className="section-kicker">WHILE YOU WERE AWAY</span>
          <h2>你不在的时候</h2>
        </div>
        <span aria-hidden="true">✾</span>
      </div>
      {current.length > 0 ? (
        <ul className="profile-list">
          {current.map((item) => (
            <li key={item.id}>{item.text}</li>
          ))}
        </ul>
      ) : (
        <p className="profile-note">这次回来，没有需要补记的离线生活。</p>
      )}
      {history.length > 0 && (
        <details>
          <summary>更早的生活片段（{history.length}）</summary>
          <ul className="profile-list">
            {history.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ul>
        </details>
      )}
      <p className="profile-note">这些只是小人打发时间的小动作，不影响性格，也不是日记。</p>
    </section>
  );
}