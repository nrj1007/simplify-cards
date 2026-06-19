import { loadingCopy } from "@/lib/loading-copy";

export default function Loading() {
  return (
    <main className="loading-page">
      <div className="loading-container loading-stack">
        <section className="loading-panel">
          <div className="loading-panel-title">
            <span className="loading-spinner-badge" aria-hidden="true">
              <span />
            </span>
            <div>
              <h1>{loadingCopy.cards.title}</h1>
              <p>{loadingCopy.cards.subtitle}</p>
            </div>
          </div>
        </section>

        <section className="loading-panel">
          <div className="skeleton-line heading" />
          <div className="skeleton-line short" />
          <div className="button-skeleton-grid">
            <div className="skeleton-block button" />
            <div className="skeleton-block button muted" />
            <div className="skeleton-block button muted" />
          </div>
        </section>

        <section className="ask-loading-grid" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <article className="ask-loading-card" key={item}>
              <div className="ask-loading-card-image" />
              <div className="ask-loading-line wide" />
              <div className="ask-loading-line" />
              <div className="ask-loading-line short" />
              <div className="ask-loading-actions">
                <span />
                <span />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
