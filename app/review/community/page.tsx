import { buildCardContentAdditions, buildCommunitySignalDrafts, readPendingTechnofinoFiles } from "@/lib/community-signals";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function ReviewCommunityPage() {
  const files = await readPendingTechnofinoFiles();
  const drafts = buildCommunitySignalDrafts(files);
  const readyDrafts = drafts.filter((draft) => draft.readyToIngest);
  const additions = buildCardContentAdditions(drafts);
  const affectedCards = Object.keys(additions).length;

  return (
    <section className="section">
      <div className="page-title">
        <h1>Community Signals</h1>
        <p>Review pending TechnoFino signals before we ingest them into card updates and tips.</p>
      </div>

      <div className="panel review-summary" style={{ margin: "18px 0" }}>
        <div className="stat">
          <strong>{files.length}</strong>
          <span>Pending signal files</span>
        </div>
        <div className="stat">
          <strong>{drafts.length}</strong>
          <span>Total review items</span>
        </div>
        <div className="stat">
          <strong>{readyDrafts.length}</strong>
          <span>Ready to ingest</span>
        </div>
        <div className="stat">
          <strong>{affectedCards}</strong>
          <span>Cards that would gain content</span>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 18 }}>
        Flow: run the TechnoFino scraper, review pending JSON under <code>data/community-signals/pending/</code>, mark
        approved items with <code>approvedForCardContent</code> and <code>cardIds</code>, then run{" "}
        <code>npm run ingest:technofino-content</code>.
      </div>

      {drafts.length === 0 ? (
        <div className="notice">
          No pending TechnoFino files yet. The scraper exists already; once it writes pending signals, this review queue
          will show proposed updates and tips here.
        </div>
      ) : (
        <div className="review-list">
          {drafts.map((draft, index) => (
            <article className="panel review-item" key={`${draft.fileName}-${draft.signal.url}-${index}`}>
              <div className="review-item-head">
                <strong>{draft.signal.title}</strong>
                <span className="badge">{draft.suggestedContentType === "update" ? "Latest Update" : "Tip"}</span>
              </div>
              <p className="muted">{draft.signal.candidateText}</p>

              <div className="meta">
                <span>Signal type: {draft.signal.signalType}</span>
                <span>Pending file: {draft.fileName}</span>
                <span>Scraped: {formatDateTime(draft.generatedAt)}</span>
                {draft.suggestedContentType === "update" ? <span>Date: {draft.suggestedPublishedAt}</span> : null}
              </div>

              {draft.matchedCards.length > 0 ? (
                <div className="review-block">
                  <strong>Suggested card matches</strong>
                  <div className="review-actions">
                    {draft.matchedCards.map((match) => (
                      <span className="badge" key={match.cardId}>
                        {match.cardName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {draft.signal.approvedForCardContent ? (
                <div className="review-block">
                  <strong>Approved target cards</strong>
                  <div className="review-actions">
                    {draft.approvedCardNames.length > 0 ? (
                      draft.approvedCardNames.map((name) => (
                        <span className="badge" key={name}>
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="badge">Missing explicit cardIds</span>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="review-block">
                <strong>Content preview</strong>
                <p className="muted">{draft.suggestedContentType === "update" ? draft.suggestedSummary : draft.suggestedTipText}</p>
              </div>

              <div className="review-actions">
                <span className="badge">{draft.readyToIngest ? "Ready to ingest" : "Needs review"}</span>
                {draft.missingFields.map((field) => (
                  <span className="badge" key={field}>
                    Missing {field}
                  </span>
                ))}
                <a className="button secondary" href={draft.signal.url} rel="nofollow" target="_blank">
                  Open TechnoFino
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
