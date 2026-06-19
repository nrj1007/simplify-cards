type AskResultsSkeletonProps = {
  variant?: "page" | "inline";
};

export function AskResultsSkeleton({ variant = "page" }: AskResultsSkeletonProps) {
  const content = (
    <div className="loading-stack">
      <section className="loading-panel ask-results-loading-panel" aria-busy="true" aria-live="polite">
        <div className="answer-head">
          <div>
            <span className="ask-loading-kicker">Finding cards</span>
            <h2>Finding the right cards...</h2>
            <p>Checking rewards, fees, caps and exclusions.</p>
          </div>
          <div className="ask-loading-orbit" aria-hidden="true">
            <span />
          </div>
        </div>
        <div className="panel-body ask-loading-body">
          <div className="ask-loading-line wide" />
          <div className="ask-loading-line" />
          <div className="ask-loading-grid">
            <div className="ask-loading-card" />
            <div className="ask-loading-card" />
            <div className="ask-loading-card" />
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
          <div className="skeleton-line short" />
          <div className="skeleton-block button" />
          <div className="skeleton-block button muted" />
        </aside>
      </div>
    </main>
  );
}
