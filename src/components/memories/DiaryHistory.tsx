"use client";
import { useState } from "react";
import { useApp } from "@/application/AppProvider";
import { EntryEmotionCorrection } from "@/components/emotion/EntryEmotionCorrection";
import { EMOTION_NAMES, type Entry, type EmotionSource } from "@/domain/types";
import { PenguinFront } from "@/components/character/PenguinFront";
import { formatDateTime } from "@/lib/format";
const SOURCE_NAMES: Record<EmotionSource, string> = { ai: "AI 建议", manual: "手动选择", corrected: "手动纠正" };
function MemoryDetail({ entry }: { entry: Entry }) {
 const { state, editEntryText } = useApp();
 const [editing, setEditing] = useState(false);
 const [text, setText] = useState(entry.text);
 const [message, setMessage] = useState("");
 async function save() {
   const saved = await editEntryText(entry.id, entry.revision, text);
   if (saved) { setEditing(false); setMessage("正文已保存。"); }
   else setMessage("未能保存，编辑内容仍在，请重试。");
 }
 return <article className="memory-detail"><div className="memory-detail-heading"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDateTime(entry.createdAt)}</time><span>来源：{SOURCE_NAMES[entry.effectiveEmotion.source]}</span></div><span className={`mood-pill emotion-${entry.effectiveEmotion.label}`}>{EMOTION_NAMES[entry.effectiveEmotion.label]}</span>
 {editing ? <><label htmlFor="edit-memory">编辑日记正文</label><textarea id="edit-memory" className="diary-input" value={text} onChange={e => setText(e.target.value)}/><div className="memory-actions"><button type="button" disabled={state.saving || state.tabConflict || !text.trim()} onClick={() => void save()}>保存正文</button><button type="button" onClick={() => { setText(entry.text); setEditing(false); }}>取消</button></div></> : <><p className="memory-full-text">{entry.text}</p><button type="button" className="text-button memory-edit" onClick={() => { setText(entry.text); setEditing(true); }}>✎ 编辑正文</button></>}
 {message && <p role="status">{message}</p>}{state.saveError && <p role="alert" className="save-error">{state.saveError}</p>}
 <details className="correction"><summary>✧ 纠正心情</summary><EntryEmotionCorrection entry={entry}/></details></article>;
}
function Sprig({ className = "" }: { className?: string }) {
 return <svg className={className} viewBox="0 0 120 160" aria-hidden="true"><path d="M15 150 Q45 75 102 12 M37 108 Q18 95 20 70 M52 79 Q38 57 42 37 M69 58 Q88 56 99 38" fill="none" stroke="#8c8f48" strokeWidth="2.5"/><g fill="#a6ae65" stroke="#858d47" strokeWidth="1"><path d="M36 105 Q7 100 20 70 Q41 76 36 105Z"/><path d="M52 80 Q27 69 42 37 Q61 48 52 80Z"/><path d="M69 58 Q73 35 99 38 Q92 59 69 58Z"/><path d="M79 43 Q76 20 101 12 Q105 29 79 43Z"/><path d="M28 125 Q43 103 62 110 Q53 130 28 125Z"/></g><g fill="#fff8e6" stroke="#e9d7ad"><circle cx="21" cy="69" r="7"/><circle cx="42" cy="36" r="7"/><circle cx="100" cy="37" r="7"/></g><g fill="#e9b451"><circle cx="21" cy="69" r="3"/><circle cx="42" cy="36" r="3"/><circle cx="100" cy="37" r="3"/></g></svg>;
}
function MonthNotes({ entries }: { entries: Entry[] }) {
 const now = new Date();
 const month = entries.filter(entry => { const date = new Date(entry.createdAt); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); });
 const counts = Object.entries(EMOTION_NAMES).map(([label, name]) => ({ label, name, count: month.filter(entry => entry.effectiveEmotion.label === label).length })).filter(item => item.count > 0);
 return <div className="scrap-stats"><h3>本月心情小记 ♡</h3>{counts.length ? <div className="scrap-counts">{counts.map(item => <div key={item.label}><i className={`emotion-${item.label}`}/><span>{item.name}</span><strong>{item.count}</strong></div>)}</div> : <p>这个月还没有记录</p>}<small>本月共 {month.length} 篇回忆</small></div>;
}
export function DiaryHistory({ entries }: { entries: Entry[] }) {
 const ordered = [...entries].sort((a,b) => b.createdAt-a.createdAt);
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const selected = ordered.find(entry => entry.id === selectedId) ?? ordered[0];
 return <section aria-label="日记历史" className="scrapbook-wrap">
  <aside className="scrap-sidebar-extra"><MonthNotes entries={entries}/><div className="scrap-progress"><b>▤　手账进度</b><p>已珍藏 {ordered.length} 篇回忆</p><div className="progress-line"/></div><p className="scrap-quote">每一种心情<br/>都值得被珍藏。 ♡</p><Sprig className="side-sprig"/></aside>
  <div className="scrapbook"><div className="book-ribbon" aria-hidden="true"/><div className="scrapbook-pages">
   <div className="scrap-left"><div className="scrap-title">我的回忆碎片 ♡</div><Sprig className="title-sprig"/>
    <div className="memory-list-pane"><div className="list-heading"><span>全部记录</span><span>{ordered.length} 篇回忆</span></div><ul>{ordered.map(entry => <li key={entry.id}><button type="button" className="memory-list-item" aria-pressed={selected?.id === entry.id} onClick={() => setSelectedId(entry.id)}><span className="memory-item-top"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDateTime(entry.createdAt)}</time><span className={`mood-pill emotion-${entry.effectiveEmotion.label}`}>{EMOTION_NAMES[entry.effectiveEmotion.label]}</span></span><span className="memory-preview">{entry.text}</span><small>{SOURCE_NAMES[entry.effectiveEmotion.source]}</small></button></li>)}</ul></div>
    <div className="left-bottom"><MonthNotes entries={entries}/><div className="little-note">把每一个<br/>小小的瞬间<br/>轻轻收好 ♡</div></div><Sprig className="bottom-sprig"/>
   </div>
   <div className="scrap-right"><div className="mobile-scrap-title">我的回忆碎片 ♡</div><Sprig className="right-sprig"/>{selected ? <MemoryDetail key={selected.id} entry={selected}/> : <section className="empty-memory"><span aria-hidden="true">✿</span><h2>这里还留着一片空白</h2><p>等你愿意写下的时候，回忆会在这里慢慢生长。</p></section>}
    <div className="mobile-stats"><MonthNotes entries={entries}/><div className="little-note">把每一个<br/>小小的瞬间<br/>轻轻收好 ♡</div></div>
    <div className="scrap-illustration" aria-hidden="true"><div className="book-stack"><i/><i/><i/></div><div className="penguin-sticker"><PenguinFront size={150} expression="joy"/></div><span className="paper-cup">♨</span></div>
   </div>
  </div></div><div className="page-controls" aria-label="翻页功能尚未接线"><button type="button" disabled aria-label="上一页，尚未接线">‹</button><span>翻页功能待接线</span><button type="button" disabled aria-label="下一页，尚未接线">›</button></div>
 </section>;
}
