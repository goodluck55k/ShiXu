"use client";
import { useState } from "react";
import { useApp } from "@/application/AppProvider";
import { EntryEmotionCorrection } from "@/components/emotion/EntryEmotionCorrection";
import { EMOTION_NAMES, type Entry, type EmotionSource } from "@/domain/types";
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
 {editing ? <><label htmlFor="edit-memory">编辑日记正文</label><textarea id="edit-memory" className="diary-input" value={text} onChange={e => setText(e.target.value)}/><div className="memory-actions"><button type="button" disabled={state.saving || state.tabConflict || !text.trim()} onClick={() => void save()}>保存正文</button><button type="button" onClick={() => { setText(entry.text); setEditing(false); }}>取消</button></div></> : <><p className="memory-full-text">{entry.text}</p><button type="button" className="text-button" onClick={() => { setText(entry.text); setEditing(true); }}>编辑正文</button></>}
 {message && <p role="status">{message}</p>}{state.saveError && <p role="alert" className="save-error">{state.saveError}</p>}
 <details className="correction"><summary>纠正心情</summary><EntryEmotionCorrection entry={entry}/></details></article>;
}
export function DiaryHistory({ entries }: { entries: Entry[] }) {
 const ordered = [...entries].sort((a,b) => b.createdAt-a.createdAt);
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const selected = ordered.find(entry => entry.id === selectedId) ?? ordered[0];
 if (!selected) return <section className="empty-memory"><span aria-hidden="true">✿</span><h2>这里还留着一片空白</h2><p>等你愿意写下的时候，回忆会在这里慢慢生长。</p></section>;
 return <section aria-label="日记历史" className="memory-layout"><div className="memory-list-pane"><div className="list-heading"><span>全部记录</span><span>{ordered.length} 篇回忆</span></div><ul>{ordered.map(entry => <li key={entry.id}><button type="button" className="memory-list-item" aria-pressed={selected.id === entry.id} onClick={() => setSelectedId(entry.id)}><span className="memory-item-top"><time dateTime={new Date(entry.createdAt).toISOString()}>{formatDateTime(entry.createdAt)}</time><span className={`mood-pill emotion-${entry.effectiveEmotion.label}`}>{EMOTION_NAMES[entry.effectiveEmotion.label]}</span></span><span className="memory-preview">{entry.text}</span><small>{SOURCE_NAMES[entry.effectiveEmotion.source]}</small></button></li>)}</ul></div><MemoryDetail key={selected.id} entry={selected}/></section>;
}
