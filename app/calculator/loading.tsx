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
              <h1>{loadingCopy.calculator.title}</h1>
              <p>{loadingCopy.calculator.subtitle}</p>
            </div>
          </div>
        </section>

        <section className="loading-panel">
          <div className="skeleton-line heading" />
          <div className="skeleton-line" />
          <div className="loading-mini-grid">
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="loading-panel loading-wide-panel">
          <div className="skeleton-line heading" />
          <div className="skeleton-table" />
        </section>
      </div>
    </main>
  );
}
