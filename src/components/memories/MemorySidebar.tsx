import Link from "next/link";
import { Clover, Sprig } from "./MemoryDecorations";
import { MemoryMonthlySummary } from "./MemoryMonthlySummary";
import {
  pageProgressPercent,
  type MonthlyMemorySummary as Summary,
} from "./memoryPresentation";

const links = [
  { href: "/", label: "企鹅小屋", icon: "home" },
  { href: "/diary", label: "心情日记", icon: "pencil" },
  { href: "/memories", label: "回忆碎片", icon: "book" },
] as const;

function NavIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.5 11.2 12 4l8.5 7.2v8.4a1.2 1.2 0 0 1-1.2 1.2H4.7a1.2 1.2 0 0 1-1.2-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.3 20.6v-6.2h5.4v6.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "pencil") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="m4.2 19.8 1-4.4L16.6 4a2.4 2.4 0 0 1 3.4 0l.1.1a2.4 2.4 0 0 1 0 3.4L8.7 18.9Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m14.6 5.9 3.5 3.5M5.2 15.4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4.2" y="3.8" width="15.6" height="16.4" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 8.1h7.6M8.2 11.7h7.6M8.2 15.3h4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M18.2 17.2v3.2H5.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MemorySidebar({
  summary,
  currentIndex,
  total,
}: {
  summary: Summary;
  currentIndex: number;
  total: number;
}) {
  const percent = pageProgressPercent(currentIndex, total);
  return (
    <aside className="scrapbook-sidebar" aria-label="回忆手账目录">
      <span className="scrapbook-sidebar-tape" aria-hidden="true" />
      <Link className="scrapbook-brand" href="/">
        <Clover className="scrapbook-brand-clover" />
        <span>拾绪 <small>ShiXu</small></span>
      </Link>
      <p className="scrapbook-brand-caption">little moments</p>
      <p className="scrapbook-brand-note">把日子轻轻收好，<br />让心情有处安放。</p>
      <span className="scrapbook-sidebar-rule" aria-hidden="true"><i /></span>

      <nav className="scrapbook-nav" aria-label="主导航">
        {links.map((link) => {
          const active = link.href === "/memories";
          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? "scrapbook-nav-link active" : "scrapbook-nav-link"}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon name={link.icon} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <MemoryMonthlySummary summary={summary} className="scrapbook-sidebar-summary" />

      <section className="scrapbook-progress" aria-label="手账进度">
        <div className="scrapbook-progress-heading">
          <h2>手账进度</h2>
          <span aria-hidden="true">▮</span>
        </div>
        <div
          className="scrapbook-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={total > 0 ? currentIndex + 1 : 0}
          aria-label="回忆翻阅进度"
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="scrapbook-progress-meta">
          <span>{total > 0 ? `第 ${currentIndex + 1} / ${total} 页` : "还没有可翻阅的页码"}</span>
          <strong>本月已记录 {summary.total} 条回忆</strong>
        </div>
      </section>

      <div className="scrapbook-sidebar-note">
        <Clover className="scrapbook-sidebar-clover" />
        <p>每一种心情<br />都值得被珍藏。</p>
        <Sprig className="scrapbook-sidebar-sprig" />
        <span className="scrapbook-sidebar-stamp" aria-hidden="true">♧</span>
      </div>
    </aside>
  );
}
