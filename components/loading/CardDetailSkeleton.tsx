export function CardDetailSkeleton() {
  return (
    <main className="loading-page card-detail-reference-loading">
      <div className="loading-container">
        <section className="card-detail-reference-loading-hero">
          <div className="loading-copy-block" aria-hidden="true">
            <div className="loading-subtitle short" />
            <div className="loading-title wide" />
          </div>
          <div className="loading-panel card-detail-reference-loading-product">
            <div className="loading-card-image" />
            <div className="loading-mini-grid"><span /><span /></div>
          </div>
        </section>
        <div className="loading-mini-grid card-detail-reference-loading-metrics">
          <span /><span /><span /><span />
        </div>
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
