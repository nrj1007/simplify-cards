export function CompareSkeleton() {
  return (
    <main className="loading-page">
      <div className="loading-container">
        <section className="loading-hero compact">
          <div className="loading-pill" />
          <h1>Comparing fees, rewards and exclusions...</h1>
          <p>Highlighting the trade-offs that matter.</p>
        </section>

        <section className="compare-loading-grid">
          <div className="loading-panel compare-loading-card">
            <div className="skeleton-line heading" />
            <div className="skeleton-line short" />
            <div className="loading-mini-grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="loading-panel compare-loading-card">
            <div className="skeleton-line heading" />
            <div className="skeleton-line short" />
            <div className="loading-mini-grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <section className="loading-panel">
          <div className="skeleton-line heading" />
          <div className="compare-loading-rows">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    </main>
  );
}
