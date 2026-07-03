import { readUnsupportedQuestionLog } from "@/lib/question-logs";
import PageHero from "@/app/ui/PageHero";

function formatLoggedAt(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function summarizeConstraints(entry: Awaited<ReturnType<typeof readUnsupportedQuestionLog>>[number]) {
  const parts: string[] = [];

  if (entry.input.maxAnnualFee !== undefined) parts.push(`Fee <= Rs ${entry.input.maxAnnualFee.toLocaleString("en-IN")}`);
  if (entry.input.wantsLounge) parts.push("Needs lounge");
  if (entry.input.wantsLifetimeFree) parts.push("Needs LTF");

  return parts.length > 0 ? parts.join(" • ") : "No extra constraints";
}

export default async function ReviewQuestionsPage() {
  const entries = await readUnsupportedQuestionLog();

  return (
    <div className="page-shell review-page">
      <PageHero
        eyebrow="Internal review"
        title="Unsupported Questions"
        lead="Review questions that Ask AI logged instead of answering from live web search."
      />

      <section className="page-content">
        <div className="container">
          <div className="panel review-summary">
            <div className="stat">
              <strong>{entries.length}</strong>
              <span>Total logged questions</span>
            </div>
            <div className="stat">
              <strong>{entries[0] ? formatLoggedAt(entries[0].loggedAt) : "None yet"}</strong>
              <span>Latest logged item</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="notice">No unsupported questions have been logged yet.</div>
          ) : (
            <div className="review-list">
              {entries.map((entry, index) => (
                <article className="panel review-item" key={`${entry.loggedAt}-${index}`}>
                  <div className="review-item-head">
                    <strong>{entry.query || "Untitled question"}</strong>
                    <span className="badge">{formatLoggedAt(entry.loggedAt)}</span>
                  </div>
                  <p className="muted">{entry.reason}</p>
                  <div className="meta">
                    <span>Constraints: {summarizeConstraints(entry)}</span>
                  </div>
                  <div className="review-actions">
                    <span className="badge">Next step: update card dataset manually</span>
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
