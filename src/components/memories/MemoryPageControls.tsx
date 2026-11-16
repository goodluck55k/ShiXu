export function MemoryPageControls({
  currentIndex,
  total,
  onPrevious,
  onNext,
}: {
  currentIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (total <= 0) return null;
  return (
    <nav className="scrapbook-controls" aria-label="回忆翻页">
      <button
        type="button"
        className="scrapbook-page-button"
        aria-label="上一条回忆"
        disabled={currentIndex <= 0}
        onClick={onPrevious}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m14.5 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="scrapbook-page-ribbon" aria-live="polite" aria-atomic="true">
        {currentIndex + 1} / {total}
      </span>
      <button
        type="button"
        className="scrapbook-page-button"
        aria-label="下一条回忆"
        disabled={currentIndex >= total - 1}
        onClick={onNext}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m9.5 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}
