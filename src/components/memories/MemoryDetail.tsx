"use client";

import { useState } from "react";
import { useApp } from "@/application/AppProvider";
import { EntryEmotionCorrection } from "@/components/emotion/EntryEmotionCorrection";
import { formatDateTime } from "@/lib/format";
import type { Entry } from "@/domain/types";
import { BookStack, MemoryPenguin } from "./MemoryDecorations";
import { emotionName, sourceName } from "./memoryPresentation";

export function MemoryDetail({
  entry,
  editing,
  draftText,
  message,
  notice,
  onDraftChange,
  onBeginEdit,
  onCancelEdit,
  onSave,
}: {
  entry: Entry;
  editing: boolean;
  draftText: string;
  message: string;
  notice: string;
  onDraftChange: (text: string) => void;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
}) {
  const { state } = useApp();
  const [correctionOpen, setCorrectionOpen] = useState(false);

  return (
    <article className="scrapbook-detail" aria-label="当前回忆详情">
      <header className="scrapbook-detail-heading">
        <time dateTime={new Date(entry.createdAt).toISOString()}>
          {formatDateTime(entry.createdAt)}
        </time>
        <span>来源：{sourceName(entry.effectiveEmotion.source)}</span>
      </header>
      <span className={`mood-pill scrapbook-detail-mood emotion-${entry.effectiveEmotion.label}`}>
        {emotionName(entry.effectiveEmotion.label)}
      </span>

      {editing ? (
        <div className="scrapbook-editor">
          <label htmlFor={`scrapbook-edit-${entry.id}`}>编辑日记正文</label>
          <textarea
            id={`scrapbook-edit-${entry.id}`}
            className="diary-input scrapbook-editor-input"
            value={draftText}
            onChange={(event) => onDraftChange(event.target.value)}
          />
          <div className="scrapbook-editor-actions">
            <button
              type="button"
              className="scrapbook-action primary"
              disabled={state.saving || state.tabConflict || !draftText.trim()}
              onClick={onSave}
            >
              {state.saving ? "保存中…" : "保存正文"}
            </button>
            <button
              type="button"
              className="scrapbook-action"
              disabled={state.saving}
              onClick={onCancelEdit}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="scrapbook-detail-text">{entry.text}</p>
      )}

      {notice && <p className="scrapbook-message" role="status">{notice}</p>}
      {message && <p className="scrapbook-message" role="status">{message}</p>}
      {state.saveError && <p className="save-error" role="alert">{state.saveError}</p>}

      {!editing && (
        <div className="scrapbook-actions">
          <button type="button" className="scrapbook-action" onClick={onBeginEdit}>
            <span aria-hidden="true">✎</span> 编辑正文
          </button>
          <button
            type="button"
            className="scrapbook-action"
            aria-expanded={correctionOpen}
            onClick={() => setCorrectionOpen((open) => !open)}
          >
            <span aria-hidden="true">♧</span> 纠正心情
          </button>
        </div>
      )}

      {correctionOpen && !editing && (
        <div className="scrapbook-correction-panel">
          <EntryEmotionCorrection entry={entry} />
        </div>
      )}

      <div className="scrapbook-detail-footer" aria-hidden="true">
        <BookStack className="scrapbook-detail-books" />
        <span className="scrapbook-teacup" />
        <MemoryPenguin className="scrapbook-detail-penguin" />
      </div>
    </article>
  );
}
