"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useApp } from "@/application/AppProvider";
import { EntryEmotionCorrection } from "@/components/emotion/EntryEmotionCorrection";
import { useReportReadingProgress } from "@/components/AppSidebar";
import { EMOTION_NAMES, type Entry, type EmotionSource } from "@/domain/types";
import { PenguinFront } from "@/components/character/PenguinFront";
import { formatDateTime } from "@/lib/format";

const SOURCE_NAMES: Record<EmotionSource, string> = { ai: "AI 建议", manual: "手动选择", corrected: "手动纠正" };
const LEAVE_CONFIRM = "正文还有未保存的修改，确定要离开吗？离开后这次修改会丢失。";
const LEAVE_UNLOAD = "正文还有未保存的修改，离开后这次修改会丢失。";
type FlipDirection = "prev" | "next";
type FlipState = { direction: FlipDirection; from: Entry; to: Entry; duration: number; settling: boolean };
const FLIP_SETTLE = 150;

function flipTiming(): { duration: number } | null {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return { duration: window.matchMedia("(max-width: 700px)").matches ? 640 : 780 };
}

// 未保存草稿：App Router 的浏览器后退/前进是客户端历史导航，不触发 beforeunload，也没有可安全取消的路由守卫。
// 不劫持 History API（会产生重复历史条目或导航循环），改为把同一标签页内的未保存草稿按条目暂存于内存，
// 返回回忆页时恢复编辑，避免静默丢失。
type UnfinishedDraft = { text: string; revision: number };
const unfinishedDrafts = new Map<string, UnfinishedDraft>();
let lastDraftEntryId: string | null = null;

function MemoryDetail({ entry, onDirtyChange }: { entry: Entry; onDirtyChange: (dirty: boolean) => void }) {
 const { state, editEntryText } = useApp();
 const stored = unfinishedDrafts.get(entry.id);
 const restored = stored && stored.revision === entry.revision && stored.text !== entry.text ? stored.text : null;
 const [editing, setEditing] = useState(restored !== null);
 const [text, setText] = useState(restored ?? entry.text);
 const [message, setMessage] = useState(restored !== null ? "已恢复上次未保存的修改，尚未保存。" : "");
 const dirty = editing && text !== entry.text;
 useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
 useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
 useEffect(() => {
  if (dirty) { unfinishedDrafts.set(entry.id, { text, revision: entry.revision }); lastDraftEntryId = entry.id; }
  else unfinishedDrafts.delete(entry.id);
 }, [dirty, entry.id, entry.revision, text]);
 async function save() {
   const saved = await editEntryText(entry.id, entry.revision, text);
   if (saved) { setEditing(false); setMessage("正文已保存。"); }
   else setMessage("未能保存，编辑内容仍在，请重试。");
 }
 return <article className="memory-detail"><div className="memory-detail-heading"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDateTime(entry.createdAt)}</time><span>来源：{SOURCE_NAMES[entry.effectiveEmotion.source]}</span></div><span className={`mood-pill emotion-${entry.effectiveEmotion.label}`}>{EMOTION_NAMES[entry.effectiveEmotion.label]}</span>
 {editing ? <><label htmlFor="edit-memory">编辑日记正文</label><textarea id="edit-memory" className="diary-input" value={text} onChange={e => setText(e.target.value)}/><div className="memory-actions"><button type="button" disabled={state.saving || state.tabConflict || !text.trim()} onClick={() => void save()}>保存正文</button><button type="button" onClick={() => { setText(entry.text); setEditing(false); setMessage(""); }}>取消</button></div></> : <><p className="memory-full-text" tabIndex={0}>{entry.text}</p><button type="button" className="text-button memory-edit" onClick={() => { setText(entry.text); setEditing(true); }}>✎ 编辑正文</button></>}
 {message && <p role="status">{message}</p>}{state.saveError && <p role="alert" className="save-error">{state.saveError}</p>}
 <details className="correction"><summary>✧ 纠正心情</summary><EntryEmotionCorrection entry={entry}/></details></article>;
}

function PageFace({ entry }: { entry: Entry }) {
  return <div className="flip-page">
    <div className="flip-page-head"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDateTime(entry.createdAt)}</time><span>来源：{SOURCE_NAMES[entry.effectiveEmotion.source]}</span></div>
    <span className={`mood-pill emotion-${entry.effectiveEmotion.label}`}>{EMOTION_NAMES[entry.effectiveEmotion.label]}</span>
    <p className="flip-page-text">{entry.text}</p>
  </div>;
}

function Sprig({ className = "" }: { className?: string }) {
 return <svg className={className} viewBox="0 0 120 160" aria-hidden="true"><path d="M15 150 Q45 75 102 12 M37 108 Q18 95 20 70 M52 79 Q38 57 42 37 M69 58 Q88 56 99 38" fill="none" stroke="#8c8f48" strokeWidth="2.5"/><g fill="#a6ae65" stroke="#858d47" strokeWidth="1"><path d="M36 105 Q7 100 20 70 Q41 76 36 105Z"/><path d="M52 80 Q27 69 42 37 Q61 48 52 80Z"/><path d="M69 58 Q73 35 99 38 Q92 59 69 58Z"/><path d="M79 43 Q76 20 101 12 Q105 29 79 43Z"/><path d="M28 125 Q43 103 62 110 Q53 130 28 125Z"/></g><g fill="#fff8e6" stroke="#e9d7ad" strokeWidth=".7"><path d="M21 69 C8 64 13 55 21 64 C24 53 32 58 26 67 C36 68 31 77 23 73 C19 82 11 75 17 70Z"/><path d="M42 36 C29 31 34 22 42 31 C45 20 53 25 47 34 C57 35 52 44 44 40 C40 49 32 42 38 37Z"/><path d="M100 37 C87 32 92 23 100 32 C103 21 111 26 105 35 C115 36 110 45 102 41 C98 50 90 43 96 38Z"/></g><g fill="#e9b451"><circle cx="21" cy="69" r="3"/><circle cx="42" cy="36" r="3"/><circle cx="100" cy="37" r="3"/></g></svg>;
}
function ReadingScene() {
 return <div className="scrap-illustration reading-scene" aria-hidden="true">
  <svg className="reading-background" viewBox="0 0 310 170"><defs><pattern id="cushion-check" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="22" height="22" fill="#f5d5a7"/><path d="M0 4H22 M0 15H22 M4 0V22 M15 0V22" stroke="#fff5db" strokeWidth="6" opacity=".62"/></pattern></defs><ellipse cx="190" cy="157" rx="116" ry="8" fill="#b98b6750"/><path d="M214 65 Q247 32 278 52 Q301 70 294 124 Q291 150 269 154 L224 151Z" fill="url(#cushion-check)" stroke="#d7ae79" strokeWidth="2"/><path d="M19 143 Q58 136 112 143 L112 153 Q66 159 20 153Z" fill="#ddaa58" stroke="#a86d36" strokeWidth="2"/><path d="M24 143 Q60 146 109 143 M24 149 Q60 152 109 149" fill="none" stroke="#fff0cb" strokeWidth="2"/><path d="M25 130 Q62 124 105 130 L105 141 Q63 146 25 141Z" fill="#9eac67" stroke="#798747" strokeWidth="2"/><path d="M30 132 Q67 135 101 132 M30 138 Q67 141 101 138" fill="none" stroke="#f8e7ba" strokeWidth="2"/><path d="M57 91 Q52 82 59 77 Q66 72 61 65 M65 93 Q70 86 66 81" fill="none" stroke="#d99255" strokeWidth="2" strokeLinecap="round"/><path d="M48 96 Q46 112 54 116 L75 116 Q82 112 80 96Z" fill="#f8dfad" stroke="#b87e42" strokeWidth="2"/><path d="M80 99 Q91 96 89 105 Q88 111 80 110" fill="none" stroke="#b87e42" strokeWidth="3"/><path d="M53 97 Q64 100 77 97" fill="none" stroke="#ce9e69"/><path d="M62 104 q-5-4-5 0 q0 4 5 5 q5-1 5-5 q0-4-5 0" fill="#a5ac69"/></svg>
  <div className="reading-penguin"><PenguinFront size={150} expression="happy"/><svg className="reading-book" viewBox="0 0 140 95"><path d="M6 17 Q35 10 70 26 Q103 10 134 17 L129 72 Q99 68 70 82 Q40 68 11 72Z" fill="#728d3f" stroke="#465828" strokeWidth="3" strokeLinejoin="round"/><path d="M11 12 Q39 7 70 23 Q101 7 129 12 L130 18 Q99 14 70 29 Q39 14 10 18Z" fill="#fff1cc" stroke="#728143" strokeWidth="2"/><path d="M70 25 V80" stroke="#c7d39d" strokeWidth="2"/><path d="M98 45 q-5-12-9-3 q-9-4-6 5 q-8 6 2 8 q1 9 8 3 q8 5 8-4 q9-3 1-8 q2-7-4-1Z" fill="#f7ebbc"/><circle cx="93" cy="50" r="3" fill="#d2b15c"/></svg></div>
 </div>;
}
function MonthNotes({ entries }: { entries: Entry[] }) {
 const now = new Date();
 const month = entries.filter(entry => { const date = new Date(entry.createdAt); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); });
 const counts = Object.entries(EMOTION_NAMES).map(([label, name]) => ({ label, name, count: month.filter(entry => entry.effectiveEmotion.label === label).length })).filter(item => item.count > 0);
 return <div className="scrap-stats"><h3>本月心情小记 ♡</h3>{counts.length ? <div className="scrap-counts">{counts.map(item => <div key={item.label}><i className={`emotion-${item.label}`}/><span>{item.name}</span><strong>{item.count}</strong></div>)}</div> : <p>这个月还没有记录</p>}<small>本月共 {month.length} 篇回忆</small></div>;
}
interface PagerProps {
  page: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  notice: string;
  variant: "top" | "bottom";
}
function Pager({ page, total, onPrev, onNext, notice, variant }: PagerProps) {
 const canPrev = page > 1;
 const canNext = page < total;
 return <div className={`page-controls${variant === "top" ? " mobile-page-pager" : ""}`} role="group" aria-label="回忆翻页">
  <button type="button" onClick={onPrev} disabled={!canPrev} aria-label={canPrev ? "上一页" : "上一页，已经是第一页"}>‹</button>
  <span className="pager-count" aria-live={variant === "bottom" ? "polite" : undefined} aria-atomic="true" aria-label={`第 ${page} 页，共 ${total} 页`}>{page} / {total}</span>
  <button type="button" onClick={onNext} disabled={!canNext} aria-label={canNext ? "下一页" : "下一页，已经是最后一页"}>›</button>
  {notice && <p className="pager-notice" role={variant === "bottom" ? "alert" : undefined} aria-hidden={variant === "top" ? true : undefined}>{notice}</p>}
 </div>;
}
export function DiaryHistory({ entries }: { entries: Entry[] }) {
 const ordered = useMemo(() => [...entries].sort((a,b) => b.createdAt-a.createdAt), [entries]);
 const [selectedId, setSelectedId] = useState<string | null>(() => lastDraftEntryId && unfinishedDrafts.has(lastDraftEntryId) ? lastDraftEntryId : null);
 const [draftDirty, setDraftDirty] = useState(false);
 const [flip, setFlip] = useState<FlipState | null>(null);
 const [notice, setNotice] = useState("");
 const selected = ordered.find(entry => entry.id === selectedId) ?? ordered[0] ?? null;
 const selectedIndex = selected ? ordered.findIndex(entry => entry.id === selected.id) : -1;
 const page = selectedIndex >= 0 ? selectedIndex + 1 : 0;
 const total = ordered.length;
 const visibleEntries = selectedIndex >= 0 ? ordered.slice(Math.max(0, selectedIndex - 1), selectedIndex + 2) : [];
 useReportReadingProgress(page, total);
 const lockRef = useRef(false);
 const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
 const bookRef = useRef<HTMLDivElement>(null);
 const previousIdRef = useRef<string | null>(null);
 const flipRef = useRef<FlipState | null>(null);
 const clearTimers = useCallback(() => { for (const timer of timersRef.current) clearTimeout(timer); timersRef.current = []; }, []);
 const handleDirtyChange = useCallback((dirty: boolean) => { setDraftDirty(dirty); if (!dirty) setNotice(""); }, []);
 const finishFlipNow = useCallback(() => {
   const current = flipRef.current;
   if (!current) return;
   clearTimers();
   setSelectedId(current.to.id);
   setFlip(null);
   flipRef.current = null;
   lockRef.current = false;
 }, [clearTimers]);
 useEffect(() => {
   const onVisibility = () => { if (document.hidden) finishFlipNow(); };
   document.addEventListener("visibilitychange", onVisibility);
   window.addEventListener("pagehide", finishFlipNow);
   return () => {
     document.removeEventListener("visibilitychange", onVisibility);
     window.removeEventListener("pagehide", finishFlipNow);
     clearTimers();
     flipRef.current = null;
     lockRef.current = false;
   };
 }, [clearTimers, finishFlipNow]);
 // 未保存正文：刷新或关闭页面时走浏览器原生离开提醒（提示文案由浏览器控制）。
 const skipUnloadRef = useRef(false);
 useEffect(() => {
  if (!draftDirty) return;
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (skipUnloadRef.current) return;
    event.preventDefault();
    event.returnValue = LEAVE_UNLOAD;
    return LEAVE_UNLOAD;
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  return () => window.removeEventListener("beforeunload", onBeforeUnload);
 }, [draftDirty]);
 // 未保存正文：拦截应用内链接导航，确认放弃才离开；取消则保留草稿和当前页。
 useEffect(() => {
  if (!draftDirty) return;
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    let destination: URL;
    try { destination = new URL(href, window.location.href); } catch { return; }
    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(LEAVE_CONFIRM)) return;
    if (selected) unfinishedDrafts.delete(selected.id);
    skipUnloadRef.current = true;
    window.location.assign(destination.href);
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
 }, [draftDirty, selected]);
 useEffect(() => {
   if (!selected) return;
   if (previousIdRef.current === null) { previousIdRef.current = selected.id; return; }
   if (previousIdRef.current === selected.id) return;
   previousIdRef.current = selected.id;
   if (typeof window === "undefined" || !window.matchMedia("(max-width: 700px)").matches) return;
   bookRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
 }, [selected]);
 function navigateTo(index: number) {
   if (lockRef.current) return;
   const target = ordered[index];
   if (!target || !selected || target.id === selected.id) return;
   if (draftDirty) { setNotice("正文还有未保存的修改，请先保存或取消编辑，再翻页。"); return; }
   setNotice("");
   const timing = flipTiming();
   if (!timing) { setSelectedId(target.id); return; }
   lockRef.current = true;
   const direction: FlipDirection = index > selectedIndex ? "next" : "prev";
   const nextState: FlipState = { direction, from: selected, to: target, duration: timing.duration, settling: false };
   flipRef.current = nextState;
   setFlip(nextState);
   const swapAt = direction === "prev" ? timing.duration * 0.94 : timing.duration / 2;
   timersRef.current.push(setTimeout(() => setSelectedId(target.id), swapAt));
   timersRef.current.push(setTimeout(() => {
     const settled: FlipState = { ...nextState, settling: true };
     flipRef.current = settled;
     setFlip(settled);
     timersRef.current.push(setTimeout(() => {
       setFlip(null);
       flipRef.current = null;
       lockRef.current = false;
       timersRef.current = [];
     }, FLIP_SETTLE));
   }, timing.duration));
 }
 const goPrev = () => navigateTo(selectedIndex - 1);
 const goNext = () => navigateTo(selectedIndex + 1);
 return <section aria-label="日记历史" className="scrapbook-wrap" aria-busy={flip !== null}>
  <div className={`scrapbook${flip ? " is-flipping" : ""}`} ref={bookRef}><div className="book-ribbon" aria-hidden="true"/><div className="scrapbook-pages">
   <div className="scrap-left"><div className="scrap-title">我的回忆碎片 ♡</div><Sprig className="title-sprig"/>
    <div className="memory-list-pane"><div className="list-heading"><span>回忆索引 · 当前与相邻</span><span>{total ? `第 ${page} / ${total} 页` : "暂无回忆"}</span></div><ul>{visibleEntries.map(entry => <li key={entry.id}><button type="button" className="memory-list-item" aria-pressed={selected?.id === entry.id} aria-current={selected?.id === entry.id ? "page" : undefined} onClick={() => navigateTo(ordered.findIndex(item => item.id === entry.id))}><span className="memory-item-top"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDateTime(entry.createdAt)}</time><span className={`mood-pill emotion-${entry.effectiveEmotion.label}`}>{EMOTION_NAMES[entry.effectiveEmotion.label]}</span></span><span className="memory-preview">{entry.text}</span><small>{SOURCE_NAMES[entry.effectiveEmotion.source]}</small></button></li>)}</ul></div>
    <div className="left-bottom"><MonthNotes entries={entries}/><div className="little-note">把每一个<br/>小小的瞬间<br/>轻轻收好 ♡</div><svg className="scrap-clover" viewBox="0 0 60 70" aria-hidden="true"><path d="M30 43 Q32 59 23 67" fill="none" stroke="#7d8c42" strokeWidth="3"/><g fill="#a9b75d" stroke="#7d8c42" strokeWidth="1.5"><path d="M30 34 C7 31 9 12 21 14 Q29 15 30 24 Q32 13 40 14 C53 13 54 30 30 34Z"/><path d="M30 34 C8 28 6 45 18 49 Q26 51 30 40 Q34 51 42 49 C54 46 52 30 30 34Z"/></g><circle cx="30" cy="34" r="3" fill="#d6d995"/></svg></div><Sprig className="bottom-sprig"/>
   </div>
   <div className="scrap-right"><div className="mobile-scrap-title">我的回忆碎片 ♡</div><Sprig className="right-sprig"/>{total > 0 && <Pager page={page} total={total} onPrev={goPrev} onNext={goNext} notice={notice} variant="top"/>}
    <div className="page-leaf" key={selected?.id ?? "empty"} aria-busy={flip !== null} inert={flip ? true : undefined}>{selected ? <MemoryDetail entry={selected} onDirtyChange={handleDirtyChange}/> : <section className="empty-memory"><span aria-hidden="true">✿</span><h2>这里还留着一片空白</h2><p>等你愿意写下的时候，回忆会在这里慢慢生长。</p></section>}</div>
    <div className="mobile-stats"><MonthNotes entries={entries}/><div className="little-note">把每一个<br/>小小的瞬间<br/>轻轻收好 ♡</div></div>
    <ReadingScene/>
    {flip && <div className={`flip-stage flip-${flip.direction}${flip.settling ? " is-settling" : ""}`} aria-hidden="true" style={{ "--flip-duration": `${flip.duration}ms` } as CSSProperties}>
      <div className="flip-leaf" style={{ animationDuration: `${flip.duration}ms` }}>
        <div className="flip-face flip-front"><PageFace entry={flip.direction === "next" ? flip.from : flip.to}/><span className="flip-edge"/><span className="flip-curl"/></div>
        <div className="flip-face flip-back"><span className="flip-back-mark">♧</span><span className="flip-edge"/><span className="flip-curl"/></div>
      </div>
    </div>}
   </div>
  </div></div>{total > 0 && <Pager page={page} total={total} onPrev={goPrev} onNext={goNext} notice={notice} variant="bottom"/>}
 </section>;
}