"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/application/AppProvider";
import type { Entry } from "@/domain/types";
import { formatDateTime } from "@/lib/format";
import {
  BookStack,
  Clover,
  DaisyCluster,
  LeafBranch,
  MemoryPenguin,
  Sprig,
} from "./MemoryDecorations";
import { MemoryDetail } from "./MemoryDetail";
import { MemoryMonthlySummary } from "./MemoryMonthlySummary";
import { MemoryNote } from "./MemoryNote";
import { MemoryPageControls } from "./MemoryPageControls";
import { MemorySidebar } from "./MemorySidebar";
import {
  adjacentEntries,
  emotionName,
  orderMemories,
  pageNoteWindow,
  summarizeMonth,
} from "./memoryPresentation";

// Fixed at client bundle load; the view is not expected to roll over at midnight.
const monthClock = typeof window === "undefined" ? 0 : Date.now();

export function MemoryScrapbook({ entries }: { entries: Entry[] }) {
  const { state, editEntryText, invalidatePending } = useApp();
  const ordered = useMemo(() => orderMemories(entries), [entries]);
  const summary = useMemo(() => summarizeMonth(entries, monthClock), [entries]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const bookRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLElement>(null);
  const firstPageRender = useRef(true);

  const selectedIndex = selectedId
    ? ordered.findIndex((entry) => entry.id === selectedId)
    : -1;
  const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const current = ordered[currentIndex] ?? null;
  const currentId = current?.id ?? null;
  const editingEntry = editingId
    ? ordered.find((entry) => entry.id === editingId) ?? null
    : null;
  const dirty = editingEntry !== null && draftText !== editingEntry.text;
  const notes = pageNoteWindow(ordered, currentIndex);
  const neighbors = adjacentEntries(ordered, currentIndex, 1);
  const remaining = current ? ordered.length - currentIndex - 1 : 0;

  useEffect(() => {
    if (!currentId) return;
    if (firstPageRender.current) {
      firstPageRender.current = false;
      return;
    }
    rightPageRef.current?.scrollTo({ top: 0 });
    if (!window.matchMedia("(max-width: 700px)").matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bookRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [currentId]);

  function goTo(index: number) {
    if (!current || index < 0 || index >= ordered.length || index === currentIndex) return;
    if (state.saving) {
      setNotice("正在保存，请稍候再翻页。");
      return;
    }
    if (dirty) {
      setNotice("正文还有未保存的修改，请先保存或取消编辑后再翻页。");
      return;
    }
    setNotice("");
    setMessage("");
    setEditingId(null);
    setDraftText("");
    setSelectedId(ordered[index].id);
  }

  function selectEntry(entryId: string) {
    if (entryId === current?.id) return;
    const index = ordered.findIndex((entry) => entry.id === entryId);
    goTo(index);
  }

  function beginEdit() {
    if (!current) return;
    setEditingId(current.id);
    setDraftText(current.text);
    setMessage("");
    setNotice("");
  }

  function cancelEdit() {
    invalidatePending();
    setEditingId(null);
    setDraftText("");
    setMessage("已取消编辑。");
    setNotice("");
  }

  async function saveEdit() {
    if (!current || editingId !== current.id) return;
    const saved = await editEntryText(current.id, current.revision, draftText);
    if (saved) {
      setEditingId(null);
      setDraftText("");
      setMessage("正文已保存。");
      setNotice("");
    } else {
      setMessage("未能保存，编辑内容仍在，请重试。");
      setNotice("");
    }
  }

  return (
    <div className="page memories-page memory-scrapbook-page">
      <MemorySidebar
        summary={summary}
        currentIndex={currentIndex}
        total={ordered.length}
      />

      <main className="scrapbook-main">
        <header className="scrapbook-header">
          <div className="scrapbook-mobile-brand">
            <Link href="/">
              <Clover className="scrapbook-mobile-clover" />
              <span>拾绪 <small>ShiXu</small></span>
            </Link>
            <LeafBranch className="scrapbook-mobile-branch" />
          </div>
          <p className="scrapbook-eyebrow">LITTLE MOMENTS, KEPT CLOSE</p>
          <h1>回忆碎片<span className="title-dot">.</span></h1>
          <p className="scrapbook-subtitle">那些被好好记录下来的心情，像一本慢慢写满的手账。</p>
          <LeafBranch className="scrapbook-header-branch" />
        </header>

        {current ? (
          <>
            <div className="scrapbook-book" ref={bookRef}>
              <div className="scrapbook-pages">
                <section className="scrapbook-page scrapbook-page-left" aria-label="回忆便签索引">
                  <Sprig className="scrapbook-left-sprig" />
                  <div className="scrapbook-left-title">
                    <span className="scrapbook-left-title-tape" aria-hidden="true" />
                    我的回忆碎片 <span aria-hidden="true">♡</span>
                  </div>
                  <div className="scrapbook-notes">
                    {notes.map((note) => (
                      <MemoryNote
                        key={note.id}
                        entry={note}
                        active={note.id === current.id}
                        index={ordered.findIndex((entry) => entry.id === note.id)}
                        onSelect={() => selectEntry(note.id)}
                      />
                    ))}
                  </div>
                  <div className="scrapbook-left-bottom">
                    <MemoryMonthlySummary summary={summary} className="scrapbook-left-summary" />
                    <div className="scrapbook-sticky" aria-hidden="true">
                      慢慢翻，<br />慢慢想起。<span>♧</span>
                    </div>
                  </div>
                  <DaisyCluster className="scrapbook-left-daisy" />
                </section>

                <section
                  className="scrapbook-page scrapbook-page-right"
                  aria-label="日记全文"
                  ref={rightPageRef}
                >
                  <MemoryDetail
                    key={current.id}
                    entry={current}
                    editing={editingId === current.id}
                    draftText={draftText}
                    message={message}
                    notice={notice}
                    onDraftChange={setDraftText}
                    onBeginEdit={beginEdit}
                    onCancelEdit={cancelEdit}
                    onSave={() => void saveEdit()}
                  />

                  <div className="scrapbook-mobile-extras">
                    {notes.length > 1 && (
                      <div className="scrapbook-mobile-neighbors" aria-label="相邻回忆">
                        <span>相邻回忆</span>
                        {neighbors
                          .filter((note) => note.id !== current.id)
                          .map((note) => (
                            <button
                              key={note.id}
                              type="button"
                              className="scrapbook-mobile-neighbor"
                              onClick={() => selectEntry(note.id)}
                            >
                              <time dateTime={new Date(note.createdAt).toISOString()}>
                                {formatDateTime(note.createdAt)}
                              </time>
                              <span className={`mood-pill emotion-${note.effectiveEmotion.label}`}>
                                {emotionName(note.effectiveEmotion.label)}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                    <MemoryMonthlySummary summary={summary} className="scrapbook-mobile-summary" />
                    <div className="scrapbook-sticky scrapbook-mobile-sticky" aria-hidden="true">
                      这个月的心情，<br />都收在这里了。<span>♧</span>
                    </div>
                    <div className="scrapbook-mobile-progress">
                      <strong>第 {currentIndex + 1} / {ordered.length} 页</strong>
                      <small>
                        {remaining > 0 ? `还有 ${remaining} 页待翻阅` : "已经翻到最后一页"}
                      </small>
                    </div>
                    <div className="scrapbook-mobile-decor" aria-hidden="true">
                      <BookStack className="scrapbook-mobile-books" />
                      <MemoryPenguin className="scrapbook-mobile-penguin" />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <MemoryPageControls
              currentIndex={currentIndex}
              total={ordered.length}
              onPrevious={() => goTo(currentIndex - 1)}
              onNext={() => goTo(currentIndex + 1)}
            />
          </>
        ) : (
          <section className="scrapbook-empty-book" aria-label="暂无回忆">
            <div className="scrapbook-empty-paper">
              <Clover className="scrapbook-empty-clover" />
              <p className="scrapbook-eyebrow">A PAGE WAITING FOR YOU</p>
              <h2>这里还留着一片空白</h2>
              <p>等你愿意写下的时候，回忆会在这里慢慢长成一本手账。</p>
              <Link className="scrapbook-empty-link" href="/diary">去写今天的日记</Link>
            </div>
          </section>
        )}

        <p className="scrapbook-footnote">✧ &nbsp; 每一页，都是被你认真收藏的日子</p>
      </main>
    </div>
  );
}
