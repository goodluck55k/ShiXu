"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EMOTION_NAMES, type Entry } from "@/domain/types";

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "diary" | "memories" | "wishes";
}

export const APP_NAV: NavItem[] = [
  { href: "/", label: "企鹅小屋", icon: "home" },
  { href: "/diary", label: "心情日记", icon: "diary" },
  { href: "/memories", label: "回忆碎片", icon: "memories" },
  { href: "/wishes", label: "许愿屋", icon: "wishes" },
];

type ReadingProgress = { page: number; total: number };
type ReadingProgressStore = {
  progress: ReadingProgress | null;
  setProgress: (progress: ReadingProgress | null) => void;
};

const ReadingProgressContext = createContext<ReadingProgressStore | null>(null);

export function ReadingProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  return <ReadingProgressContext.Provider value={{ progress, setProgress }}>{children}</ReadingProgressContext.Provider>;
}

export function useReadingProgress(): ReadingProgress | null {
  return useContext(ReadingProgressContext)?.progress ?? null;
}

export function useReportReadingProgress(page: number, total: number) {
  const setProgress = useContext(ReadingProgressContext)?.setProgress;
  useEffect(() => {
    if (!setProgress || total <= 0) return;
    setProgress({ page, total });
  }, [page, setProgress, total]);
  useEffect(() => () => setProgress?.(null), [setProgress]);
}

/* ---------- 纯装饰 SVG：均为静态视觉元素，不承载任何功能 ---------- */

/** 手撕纸边：给纸签和便签的底纸做轻微的不规则边缘，文字本身不受影响。 */
function PaperEdgeDefs() {
  return <svg className="sidebar-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <filter id="shixu-paper-edge-a" x="-4%" y="-14%" width="108%" height="128%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.085" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.4" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="shixu-paper-edge-b" x="-4%" y="-14%" width="108%" height="128%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.075" numOctaves="2" seed="19" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.4" xChannelSelector="G" yChannelSelector="R" />
      </filter>
    </defs>
  </svg>;
}

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  if (icon === "home") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 11.3 12 4.2l8.2 7.1" /><path d="M6.1 9.7v9.1c0 .6.4 1 1 1h9.8c.6 0 1-.4 1-1V9.7" /><path d="M10.1 19.8v-4.5a1.9 1.9 0 0 1 3.8 0v4.5" /></svg>;
  }
  if (icon === "diary") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.6 19.4 1-4.5L15.9 4.6a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L9.1 18.4Z" /><path d="m14.1 6.4 3.5 3.5" /><path d="m5.6 14.9 3.5 3.5" /></svg>;
  }
  if (icon === "wishes") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 16.3l-4.8 2.5.9-5.3-3.9-3.8 5.4-.8Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 4.4h11.6c.6 0 1 .4 1 1v13.2c0 .6-.4 1-1 1H6.2c-.6 0-1-.4-1-1V5.4c0-.6.4-1 1-1Z" /><path d="M8.6 9h6.8M8.6 12h6.8M8.6 15h4.2" /></svg>;
}

const HEART_LEAF = "M0 0C-8.6-5.6-10.8-14.6-5.4-16.8-2-18.2 0-15.6 0-13.4 0-15.6 2-18.2 5.4-16.8 10.8-14.6 8.6-5.6 0 0Z";

function CloverMark() {
  return <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
    <path className="brand-mark-stem" d="M24 26c.4 6.4 1.6 11.6 4.6 16.4" />
    <g transform="translate(24 25)">
      <path d={HEART_LEAF} />
      <path d={HEART_LEAF} transform="rotate(118)" />
      <path d={HEART_LEAF} transform="rotate(-118)" />
    </g>
  </svg>;
}

function LeafDivider() {
  return <svg viewBox="0 0 44 16" aria-hidden="true">
    <path d="M4 12C14 11 28 8 40 3" fill="none" stroke="#9aa864" strokeWidth="1.1" strokeLinecap="round" />
    <g fill="#b9c684" stroke="#93a25c" strokeWidth=".6" strokeLinejoin="round">
      <path d="M12 10.6C10.6 7.4 12.2 4.6 15.4 3.6 16.4 6.6 15 9.6 12 10.6Z" />
      <path d="M20.6 9C20 5.6 22.2 3 25.6 2.6 26 5.8 24 8.4 20.6 9Z" />
      <path d="M16.4 10.2C18.2 12.8 21.2 13.6 24 12.2 22.4 9.6 19.2 9 16.4 10.2Z" />
      <path d="M26.2 7.6C28.4 9.8 31.4 10 33.8 8.2 31.8 6 28.8 5.8 26.2 7.6Z" />
    </g>
  </svg>;
}

function CloverSticker() {
  const leaves = [0, 90, 180, 270].map((angle) => <path key={angle} d={HEART_LEAF} transform={`rotate(${angle}) scale(.62)`} />);
  return <svg className="nav-sticker" viewBox="0 0 34 34" aria-hidden="true">
    <g transform="translate(16 15) rotate(-14)">
      <g className="nav-sticker-edge"><path d="M0 0C2 5 4 9 8 12" />{leaves}</g>
      <path className="nav-sticker-stem" d="M0 0C2 5 4 9 8 12" />
      <g className="nav-sticker-leaf">{leaves}</g>
    </g>
  </svg>;
}

function PaperClip() {
  return <svg className="sidebar-clip" viewBox="0 0 18 40" aria-hidden="true">
    <path d="M12.6 12.4v17.2a4.6 4.6 0 0 1-9.2 0V8.8a5.6 5.6 0 0 1 11.2 0v19.6" />
  </svg>;
}

function BookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3C9.9 5.8 7.4 5.4 4.2 5.9v11.9c3.2-.5 5.7-.1 7.8 1.4 2.1-1.5 4.6-1.9 7.8-1.4V5.9c-3.2-.5-5.7-.1-7.8 1.4Z" /><path d="M12 7.3v11.9" /></svg>;
}

function CloverStamp() {
  return <svg className="sidebar-stamp" viewBox="0 0 62 72" aria-hidden="true">
    <g className="sidebar-postmark"><path d="M2 56c5-4 9 4 14 0s9 4 14 0" /><path d="M0 63c5-4 9 4 14 0s9 4 14 0 9 4 14 0" /><path d="M6 70c5-4 9 4 14 0s9 4 14 0" /></g>
    <g className="sidebar-stamp-body" transform="rotate(9 38 26)">
      <rect className="sidebar-stamp-paper" x="16" y="2" width="42" height="48" rx="1.5" />
      <rect className="sidebar-stamp-teeth" x="16" y="2" width="42" height="48" rx="1.5" />
      <rect className="sidebar-stamp-frame" x="21.5" y="7.5" width="31" height="37" rx="1" />
      <g transform="translate(37 25)">
        <path className="sidebar-stamp-stem" d="M0 0C1.6 4 3 7 5.6 10" />
        <g className="sidebar-stamp-leaf">{[0, 90, 180, 270].map((angle) => <path key={angle} d={HEART_LEAF} transform={`rotate(${angle}) scale(.6)`} />)}</g>
      </g>
    </g>
  </svg>;
}

function Blossom({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <g className="sidebar-sprig-petal">{[0, 72, 144, 216, 288].map((angle) => <ellipse key={angle} cx="0" cy="-4.3" rx="3.2" ry="4" transform={`rotate(${angle})`} />)}</g>
    <circle className="sidebar-sprig-heart" r="2.1" />
  </g>;
}

function SidebarSprig() {
  return <svg className="sidebar-sprig" viewBox="0 0 124 92" aria-hidden="true">
    <g className="sidebar-sprig-stem">
      <path d="M9 91C16 70 22 48 23 22" />
      <path d="M12 91C22 82 32 74 44 67" />
      <path d="M14 91C44 90 76 86 105 77" />
      <path d="M52 88C54 83 57 79 61 76" />
    </g>
    <g className="sidebar-sprig-leaf">
      <path d="M23 22C16 18 14 10 18 3 26 7 28 16 23 22Z" />
      <path d="M20 44C11 44 5 38 6 29 15 30 21 36 20 44Z" />
      <path d="M21 42C24 36 30 34 35 37 32 43 26 46 21 42Z" />
      <path d="M15 66C7 67 1 62 1 54 9 54 15 58 15 66Z" />
      <path d="M44 67C46 60 52 57 58 59 57 66 51 69 44 67Z" />
      <path d="M30 90C32 84 38 81 44 83 42 89 36 92 30 90Z" />
      <path d="M72 85C75 79 82 77 88 80 85 86 78 89 72 85Z" />
    </g>
    <Blossom x={63} y={73} />
    <Blossom x={107} y={75} size={0.86} />
  </svg>;
}

/* ---------- 真实数据：只读取已保存的日记，不写入任何状态 ---------- */

function monthEmotionCounts(entries: Entry[]) {
  const now = new Date();
  const monthEntries = entries.filter((entry) => {
    const date = new Date(entry.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const counts = (Object.entries(EMOTION_NAMES) as Array<[keyof typeof EMOTION_NAMES, string]>)
    .map(([label, name]) => ({ label, name, count: monthEntries.filter((entry) => entry.effectiveEmotion.label === label).length }))
    .filter((item) => item.count > 0);
  return { counts, total: monthEntries.length };
}

function MonthNotes({ entries }: { entries: Entry[] }) {
  const { counts, total } = monthEmotionCounts(entries);
  return <section className="sidebar-stats" aria-label="本月心情小记">
    <PaperClip />
    <h3>本月心情小记 <span aria-hidden="true">♡</span></h3>
    {counts.length
      ? <div className="sidebar-counts">{counts.map((item) => <div key={item.label}><i className={`emotion-${item.label}`} aria-hidden="true" /><span>{item.name}</span><strong>{item.count}</strong></div>)}</div>
      : <p>这个月还没有记录</p>}
    <small>本月共 {total} 篇回忆</small>
  </section>;
}

function ProgressCard({ total, progress, onMemoriesPage }: { total: number; progress: ReadingProgress | null; onMemoriesPage: boolean }) {
  const reading = onMemoriesPage && progress && progress.total === total ? progress : null;
  const percent = reading && total ? Math.round((reading.page / total) * 100) : 0;
  return <section className="sidebar-progress" aria-label="手账进度">
    <span className="sidebar-ribbon" aria-hidden="true" />
    <h3><BookIcon />手账进度</h3>
    {reading
      ? <>
          <div className="sidebar-progress-row">
            <div className="sidebar-progress-bar" role="progressbar" aria-label="翻阅进度" aria-valuemin={0} aria-valuemax={total} aria-valuenow={reading.page}><i style={{ width: `${percent}%` }} /></div>
            <span className="sidebar-progress-page" aria-label={`第 ${reading.page} 页，共 ${total} 页`}>{reading.page} / {total}</span>
          </div>
          <p>已珍藏 {total} 篇回忆 · 读到 {percent}%</p>
        </>
      : <>
          <div className="sidebar-progress-row"><div className="sidebar-progress-bar" aria-hidden="true"><i style={{ width: "0%" }} /></div></div>
          <p>已珍藏 {total} 篇回忆</p>
          <small>{total > 0 ? <Link className="sidebar-progress-link" href="/memories">到回忆碎片慢慢翻阅 →</Link> : "从第一篇回忆开始记录吧"}</small>
        </>}
  </section>;
}

export function AppSidebar({ pathname, entries }: { pathname: string; entries: Entry[] }) {
  const progress = useReadingProgress();
  return <aside className="sidebar" aria-label="站点目录">
    <PaperEdgeDefs />
    <span className="sidebar-tape" aria-hidden="true" />
    <div className="sidebar-scroll">
      <div className="sidebar-brand">
        <Link className="brand" href="/" aria-label="拾绪 ShiXu · 返回企鹅小屋">
          <CloverMark />
          <span className="brand-name">拾绪 <small>ShiXu</small></span>
        </Link>
        <p className="brand-tagline">little moments</p>
        <p className="brand-caption">把日子轻轻收好，<br />让心情有处安放。</p>
        <span className="brand-divider" aria-hidden="true"><LeafDivider /></span>
      </div>
      <nav aria-label="主导航" className="nav-list">
        {APP_NAV.map((link) => {
          const active = pathname === link.href;
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={active ? "nav-link active" : "nav-link"}>
            <span className="nav-icon" aria-hidden="true"><NavIcon icon={link.icon} /></span>
            <span className="nav-label">{link.label}</span>
            {active && <CloverSticker />}
          </Link>;
        })}
      </nav>
      <div className="sidebar-extras">
        <MonthNotes entries={entries} />
        <ProgressCard total={entries.length} progress={progress} onMemoriesPage={pathname === "/memories"} />
      </div>
      <div className="sidebar-note">
        <CloverStamp />
        <p>每一种心情<br />都值得被珍藏。</p>
        <SidebarSprig />
      </div>
    </div>
  </aside>;
}
