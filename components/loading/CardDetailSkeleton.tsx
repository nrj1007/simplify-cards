export function CardDetailSkeleton() {
  return (
    <main className="loading-page">
      <div className="loading-container card-detail-loading-grid">
        <section className="loading-panel card-detail-loading-hero">
          <div>
            <div className="loading-pill" />
            <div className="loading-title wide" />
            <div className="loading-subtitle" />
            <div className="loading-subtitle short" />
            <div className="loading-chip-row">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="loading-card-face">
            <div className="loading-card-image" />
            <div className="loading-mini-grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <aside className="loading-panel card-detail-loading-side">
          <div className="loading-card-image" />
          <div className="skeleton-line short" />
          <div className="skeleton-block button" />
          <div className="skeleton-block button muted" />
          <div className="skeleton-block button muted" />
        </aside>

        <section className="loading-panel loading-wide-panel">
          <div className="skeleton-line heading" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </section>

        <section className="loading-panel loading-wide-panel">
          <div className="skeleton-line heading" />
          <div className="skeleton-table" />
        </section>
      </div>
    </main>
  );
}
