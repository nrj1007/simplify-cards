import { loadingCopy } from "@/lib/loading-copy";

export function CompareSkeleton() {
  return (
    <main className="loading-page">
      <div className="loading-container">
        <section className="loading-panel">
          <div className="loading-panel-title">
            <span className="loading-spinner-badge" aria-hidden="true">
              <span />
            </span>
            <div>
              <h1>{loadingCopy.compare.title}</h1>
              <p>{loadingCopy.compare.subtitle}</p>
            </div>
          </div>
        </section>

        <section className="compare-loading-grid">
          <div className="loading-panel compare-loading-card">
            <div className="compare-loading-image" />
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
            <div className="compare-loading-image" />
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
