import { readTelegramInbox, readTelegramInboxState } from "@/lib/telegram-inbox";
import PageHero from "@/app/ui/PageHero";

function formatDateTime(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function ReviewInboxPage() {
  const [entries, state] = await Promise.all([readTelegramInbox(), readTelegramInboxState()]);
  const entriesWithUrls = entries.filter((entry) => entry.urls.length > 0);

  return (
    <div className="page-shell review-page">
      <PageHero
        eyebrow="Internal review"
        title="Telegram Inbox"
        lead="Review Telegram links before turning them into latest updates, tips, or card database tasks."
      />

      <section className="page-content">
        <div className="container">
          <div className="panel review-summary">
            <div className="stat">
              <strong>{entries.length}</strong>
              <span>Total synced messages</span>
            </div>
            <div className="stat">
              <strong>{entriesWithUrls.length}</strong>
              <span>Messages containing URLs</span>
            </div>
            <div className="stat">
              <strong>{formatDateTime(state.syncedAt)}</strong>
              <span>Last poll</span>
            </div>
            <div className="stat">
              <strong>{state.lastUpdateId || 0}</strong>
              <span>Latest Telegram update ID</span>
            </div>
          </div>

          <div className="notice">
            Flow: put <code>TELEGRAM_BOT_TOKEN</code> and <code>TELEGRAM_CHAT_ID</code> in <code>.env.local</code>, run{" "}
            <code>npm run fetch:telegram-inbox</code>, then review messages here. Nothing from Telegram should go directly
            into card data without your manual approval.
          </div>

          {entries.length === 0 ? (
            <div className="notice">No Telegram messages have been synced yet.</div>
          ) : (
            <div className="review-list">
              {entries.map((entry) => (
                <article className="panel review-item" key={entry.updateId}>
                  <div className="review-item-head">
                    <strong>{entry.urls[0] ?? entry.text.slice(0, 80)}</strong>
                    <span className="badge">{formatDateTime(entry.receivedAt)}</span>
                  </div>

                  <div className="meta">
                    <span>Decision: {entry.reviewDecision}</span>
                    <span>Sender: {entry.senderUsername ? `@${entry.senderUsername}` : entry.senderId ?? "unknown"}</span>
                    <span>{entry.urls.length} URL{entry.urls.length === 1 ? "" : "s"}</span>
                  </div>

                  {entry.note ? <p className="muted">{entry.note}</p> : null}

                  {entry.urls.length > 0 ? (
                    <div className="review-block">
                      <strong>URLs</strong>
                      <div className="review-actions">
                        {entry.urls.map((url) => (
                          <a className="button secondary" href={url} key={url} rel="nofollow" target="_blank">
                            Open link
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="review-block">
                      <strong>Message</strong>
                      <p className="muted">{entry.text}</p>
                    </div>
                  )}

                  <div className="review-actions">
                    <span className="badge">{entry.reviewed ? "Reviewed" : "Needs review"}</span>
                    <span className="badge">Next step: classify manually</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
