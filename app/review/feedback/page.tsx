import PageHero from "@/app/ui/PageHero";
import { readAskFeedbackLog } from "@/lib/feedback-logs";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function ReviewFeedbackPage() {
  const entries = await readAskFeedbackLog();
  const positiveCount = entries.filter((entry) => entry.feedback === "up").length;
  const negativeCount = entries.length - positiveCount;

  return (
    <div className="page-shell review-page">
      <PageHero
        eyebrow="Internal review"
        title="Feedback"
        lead="Review production feedback stored in the private durable record store."
      />

      <section className="page-content">
        <div className="container">
          <div className="panel review-summary">
            <div className="stat">
              <strong>{entries.length.toLocaleString("en-IN")}</strong>
              <span>Total submissions</span>
            </div>
            <div className="stat">
              <strong>{positiveCount.toLocaleString("en-IN")}</strong>
              <span>Helpful</span>
            </div>
            <div className="stat">
              <strong>{negativeCount.toLocaleString("en-IN")}</strong>
              <span>Needs improvement</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="notice">No feedback has been logged yet.</div>
          ) : (
            <div className="review-list">
              {entries.map((entry, index) => (
                <article className="panel review-item" key={`${entry.submittedAt}-${index}`}>
                  <div className="review-item-head">
                    <strong>{entry.query || "Untitled query"}</strong>
                    <span className="badge">{entry.feedback === "up" ? "Helpful" : "Needs improvement"}</span>
                  </div>
                  {entry.comment ? <p>{entry.comment}</p> : <p className="muted">No written comment.</p>}
                  <div className="meta">
                    <span>{formatDateTime(entry.submittedAt)}</span>
                    <span>Source: {entry.source ?? "ask"}</span>
                    <span>Cards: {entry.cardIds.join(", ") || "None"}</span>
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
