import { loadingCopy } from "@/lib/loading-copy";

export function RecommendSkeleton() {
  return (
    <main className="loading-page">
      <div className="loading-container loading-grid-with-sidebar">
        <section className="loading-stack">
          <div className="loading-panel">
            <div className="loading-panel-title">
              <span className="loading-spinner-badge" aria-hidden="true">
                <span />
              </span>
              <div>
                <h1>{loadingCopy.recommend.title}</h1>
                <p>{loadingCopy.recommend.subtitle}</p>
              </div>
            </div>
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
                <div className="recommend-loading-action" />
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
