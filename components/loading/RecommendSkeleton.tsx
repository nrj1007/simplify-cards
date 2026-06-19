export function RecommendSkeleton() {
  return (
    <main className="loading-page">
      <div className="loading-container loading-grid-with-sidebar">
        <section className="loading-stack">
          <div className="loading-hero compact">
            <div className="loading-pill" />
            <h1>Building your shortlist...</h1>
            <p>Ranking cards based on fit, fees and benefits.</p>
          </div>

          <div className="recommend-loading-results">
            {[1, 2, 3].map((item) => (
              <article className="loading-panel recommend-loading-card" key={item}>
                <div className="loading-rank" />
                <div>
                  <div className="skeleton-line heading" />
                  <div className="skeleton-line" />
                  <div className="loading-chip-row">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="loading-side-panel">
          <div className="skeleton-line heading" />
          <div className="skeleton-block tall" />
          <div className="skeleton-block button" />
          <div className="skeleton-block button muted" />
        </aside>
      </div>
    </main>
  );
}
