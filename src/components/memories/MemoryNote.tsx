import {
  formatDateTime,
} from "@/lib/format";
import { emotionName, noteExcerpt, sourceName } from "./memoryPresentation";
import type { Entry } from "@/domain/types";

export function MemoryNote({
  entry,
  active,
  onSelect,
  index,
}: {
  entry: Entry;
  active: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <button
      type="button"
      className={`scrapbook-note scrapbook-note-tilt-${index % 3}${active ? " is-active" : ""}`}
      aria-pressed={active}
      aria-label={`${formatDateTime(entry.createdAt)}，${emotionName(entry.effectiveEmotion.label)}，${sourceName(entry.effectiveEmotion.source)}`}
      onClick={onSelect}
    >
      <span className="scrapbook-note-tape" aria-hidden="true" />
      <span className="scrapbook-note-head">
        <time dateTime={new Date(entry.createdAt).toISOString()}>
          {formatDateTime(entry.createdAt)}
        </time>
        <span className={`mood-pill emotion-${entry.effectiveEmotion.label}`}>
          {emotionName(entry.effectiveEmotion.label)}
        </span>
      </span>
      <span className="scrapbook-note-text">{noteExcerpt(entry.text)}</span>
      <span className="scrapbook-note-foot">
        <span>{sourceName(entry.effectiveEmotion.source)}</span>
        {active && <span className="scrapbook-note-current">正在阅读</span>}
      </span>
      <span className="scrapbook-note-clover" aria-hidden="true">♧</span>
    </button>
  );
}
