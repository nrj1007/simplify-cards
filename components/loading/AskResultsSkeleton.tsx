import { loadingCopy } from "@/lib/loading-copy";

type AskResultsSkeletonProps = {
  variant?: "page" | "inline";
};

export function AskResultsSkeleton({ variant = "page" }: AskResultsSkeletonProps) {
  const resultCards = [
    ["wide", "", "short"],
    ["", "wide", "tiny"],
    ["wide", "", "short"]
  ];

  const content = (
    <div className="loading-stack">
      <section className="loading-panel ask-results-loading-panel" aria-busy="true" aria-live="polite">
        <div className="answer-head">
          <div className="loading-panel-title">
            <span className="loading-spinner-badge" aria-hidden="true">
              <span />
            </span>
            <div>
              <h2>{loadingCopy.ask.title}</h2>
              <p>{loadingCopy.ask.subtitle}</p>
            </div>
          </div>
        </div>
        <div className="panel-body ask-loading-body">
          <div className="skeleton-lines">
            <div className="ask-loading-line teal wide" />
            <div className="ask-loading-line extra-wide" />
            <div className="ask-loading-line short" />
          </div>
          <div className="ask-loading-grid">
            {resultCards.map((lines, index) => (
              <article className="ask-loading-card" key={index}>
                <div className="ask-loading-card-image" />
                <div className={`ask-loading-line ${lines[0]}`} />
                <div className={`ask-loading-line ${lines[1]}`} />
                <div className={`ask-loading-line ${lines[2]}`} />
                <div className="ask-loading-actions">
                  <span />
                  <span />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  if (variant === "inline") return content;

  return (
    <main className="loading-page loading-page-ask">
      <section className="loading-hero">
        <div className="loading-pill" />
        <div className="loading-title" />
        <div className="loading-subtitle" />
        <div className="loading-search" />
      </section>
      <div className="loading-container loading-grid-with-sidebar">
        {content}
        <aside className="loading-side-panel">
          <div className="loading-card-image" />
          <div className="skeleton-line short" />
          <div className="skeleton-block button" />
          <div className="skeleton-block button muted" />
        </aside>
      </div>
    </main>
  );
}
