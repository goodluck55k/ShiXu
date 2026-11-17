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

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  if (icon === "home") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9.6 10 3.4l7 6.2V17h-4.7v-5H7.7v5H3Z" /></svg>;
  }
  if (icon === "diary") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.2 16.1 5.3 11.7l8.2-8.2 3 3-8.2 8.2Z" /><path d="m12.4 4.6 3 3" /></svg>;
  }
  if (icon === "wishes") {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.9l2.2 4.4 4.9.7-3.5 3.4.8 4.8L10 14l-4.4 2.2.8-4.8L2.9 8l4.9-.7Z" /></svg>;
  }
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.4C8 4.1 6.6 4.7 5.4 5.6v10c1.2-.9 2.6-1.5 4.6-1.2" /><path d="M10 4.4c2-.3 3.4.3 4.6 1.2v10c-1.2-.9-2.6-1.5-4.6-1.2" /><path d="M10 4.4v10" /></svg>;
}

function CloverMark() {
  return <svg className="brand-mark" viewBox="0 0 48 52" aria-hidden="true">
    <path d="M24 23.5c-2.4-9.8-11.9-11.4-13.3-5.4-1.3 5.4 5.4 8.1 13.3 5.4Z" />
    <path d="M24 23.5c9.8-2.4 11.4-11.9 5.4-13.3-5.4-1.3-8.1 5.4-5.4 13.3Z" />
    <path d="M24 23.5c2.4 9.8 11.9 11.4 13.3 5.4 1.3-5.4-5.4-8.1-13.3-5.4Z" />
    <path d="M24 23.5c-9.8 2.4-11.4 11.9-5.4 13.3 5.4 1.3 8.1-5.4 5.4-13.3Z" />
    <path d="M24 26.5v14.2" />
  </svg>;
}

function SidebarSprig() {
  return <svg className="sidebar-sprig" viewBox="0 0 110 120" aria-hidden="true">
    <path d="M20 114Q46 66 96 14M38 78Q22 68 24 48M54 54Q42 40 46 22M70 38Q82 38 92 24" fill="none" stroke="#8c8f48" strokeWidth="2.2" />
    <g fill="#a6ae65" stroke="#858d47" strokeWidth="1">
      <path d="M37 76Q13 72 23 49Q41 54 37 76Z" />
      <path d="M54 55Q34 46 46 22Q62 31 54 55Z" />
      <path d="M70 38Q74 20 92 24Q86 40 70 38Z" />
      <path d="M31 94Q43 76 58 82Q51 97 31 94Z" />
    </g>
    <g fill="#fff8e6" stroke="#e9d7ad" strokeWidth=".7">
      <path d="M24 48c-9-3-5-10 1-4 2-8 8-5 4 1 7 1 3 8-3 5-3 6-9 2-4-2Z" />
      <path d="M46 21c-9-3-5-10 1-4 2-8 8-5 4 1 7 1 3 8-3 5-3 6-9 2-4-2Z" />
    </g>
    <g fill="#e9b451"><circle cx="24" cy="48" r="2.4" /><circle cx="46" cy="21" r="2.4" /></g>
  </svg>;
}

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
  return <section className="scrap-stats sidebar-stats" aria-label="本月心情小记">
    <h3>本月心情小记 <span aria-hidden="true">♡</span></h3>
    {counts.length
      ? <div className="scrap-counts">{counts.map((item) => <div key={item.label}><i className={`emotion-${item.label}`} aria-hidden="true" /><span>{item.name}</span><strong>{item.count}</strong></div>)}</div>
      : <p>这个月还没有记录</p>}
    <small>本月共 {total} 篇回忆</small>
  </section>;
}

function ProgressCard({ total, progress, onMemoriesPage }: { total: number; progress: ReadingProgress | null; onMemoriesPage: boolean }) {
  const reading = onMemoriesPage && progress && progress.total === total ? progress : null;
  const percent = reading && total ? Math.round((reading.page / total) * 100) : 0;
  return <section className="scrap-progress sidebar-progress" aria-label="手账进度">
    <b>▤　手账进度</b>
    <p>已珍藏 {total} 篇回忆</p>
    {reading
      ? <>
          <div className="progress-line" role="progressbar" aria-label="翻阅进度" aria-valuemin={0} aria-valuemax={total} aria-valuenow={reading.page}><i style={{ width: `${percent}%` }} /></div>
          <small>第 {reading.page} / {total} 页 · {percent}%</small>
        </>
      : <>
          <div className="progress-line" aria-hidden="true"><i style={{ width: "0%" }} /></div>
          <small>{total > 0 ? <Link className="sidebar-progress-link" href="/memories">到回忆碎片慢慢翻阅 →</Link> : "从第一篇回忆开始记录吧"}</small>
        </>}
  </section>;
}

export function AppSidebar({ pathname, entries }: { pathname: string; entries: Entry[] }) {
  const progress = useReadingProgress();
  return <aside className="sidebar" aria-label="站点目录">
    <span className="sidebar-tape" aria-hidden="true" />
    <div className="sidebar-scroll">
    <Link className="brand" href="/" aria-label="拾绪 ShiXu · 返回企鹅小屋">
      <CloverMark />
      <span className="brand-name">拾绪 <small>ShiXu</small></span>
    </Link>
    <p className="brand-caption"><span>little moments</span><span>把日子轻轻收好</span></p>
    <nav aria-label="主导航" className="nav-list">
      {APP_NAV.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={pathname === link.href ? "nav-link active" : "nav-link"}>
        <span className="nav-icon" aria-hidden="true"><NavIcon icon={link.icon} /></span>
        <span>{link.label}</span>
      </Link>)}
    </nav>
    <div className="sidebar-extras">
      <MonthNotes entries={entries} />
      <ProgressCard total={entries.length} progress={progress} onMemoriesPage={pathname === "/memories"} />
      <div className="sidebar-note">
        <SidebarSprig />
        <p>每一种心情<br />都值得被珍藏。 <span aria-hidden="true">♡</span></p>
      </div>
    </div>
    </div>
  </aside>;
}