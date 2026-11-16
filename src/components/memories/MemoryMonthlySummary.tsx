import { emotionName, type MonthlyMemorySummary } from "./memoryPresentation";

export function MemoryMonthlySummary({
  summary,
  className,
}: {
  summary: MonthlyMemorySummary;
  className?: string;
}) {
  return (
    <section
      className={`scrapbook-monthly ${className ?? ""}`}
      aria-label={`${summary.monthLabel}心情小记`}
    >
      <div className="scrapbook-monthly-heading">
        <h2>本月心情小记</h2>
        <span aria-hidden="true">♡</span>
      </div>
      {summary.total === 0 ? (
        <p className="scrapbook-monthly-empty">这个月还没有留下心情记录。</p>
      ) : (
        <div className="scrapbook-monthly-grid">
          {summary.top.map((tally) => (
            <div className="scrapbook-monthly-item" key={tally.label}>
              <span
                className={`scrapbook-monthly-dot emotion-${tally.label}`}
                aria-hidden="true"
              />
              <span>{emotionName(tally.label)}</span>
              <strong>{tally.count}</strong>
            </div>
          ))}
          <div className="scrapbook-monthly-item">
            <span className="scrapbook-monthly-dot scrapbook-other-dot" aria-hidden="true" />
            <span>其他</span>
            <strong>{summary.otherCount}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
