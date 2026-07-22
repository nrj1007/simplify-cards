import PageHero from "@/app/ui/PageHero";
import { readSubscriptionLog } from "@/lib/subscription-logs";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function ReviewSubscriptionsPage() {
  const entries = await readSubscriptionLog();

  return (
    <div className="page-shell review-page">
      <PageHero
        eyebrow="Internal review"
        title="Subscriptions"
        lead="Review newsletter sign-ups stored in the private durable record store."
      />

      <section className="page-content">
        <div className="container">
          <div className="panel review-summary">
            <div className="stat">
              <strong>{entries.length.toLocaleString("en-IN")}</strong>
              <span>Unique subscribers</span>
            </div>
            <div className="stat">
              <strong>{entries[0] ? formatDateTime(entries[0].subscribedAt) : "None yet"}</strong>
              <span>Latest subscription</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="notice">No subscriptions have been stored yet.</div>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.email}>
                      <td>{entry.name}</td>
                      <td>{entry.email}</td>
                      <td>{formatDateTime(entry.subscribedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
