import { readAnalyticsLog } from "@/lib/analytics-logs";
import { getCardById } from "@/lib/cards";
import type { AnalyticsEventName, AnalyticsSource, StoredAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const ASK_QUERY_EVENT: AnalyticsEventName = "ask_query_submitted";
const ASK_RESULT_EVENT: AnalyticsEventName = "ask_result_rendered";
const APPLY_CLICK_EVENT: AnalyticsEventName = "apply_clicked";

type CountRow = {
  label: string;
  count: number;
};

type ApplyCardRow = {
  cardId: string;
  cardName: string;
  count: number;
};

function isRecentEvent(event: StoredAnalyticsEvent, since: Date) {
  const receivedAt = new Date(event.received_at);
  return Number.isFinite(receivedAt.getTime()) && receivedAt > since;
}

function countByLabel(items: string[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const label = item.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function getTopAskQueries(events: StoredAnalyticsEvent[]) {
  return countByLabel(
    events
      .filter((event) => event.event_name === ASK_QUERY_EVENT)
      .map((event) => event.query ?? "")
  ).slice(0, 25);
}

function getApplyRows(events: StoredAnalyticsEvent[]) {
  const rows = countByLabel(
    events
      .filter((event) => event.event_name === APPLY_CLICK_EVENT)
      .map((event) => event.card_id ?? "")
  );

  return rows.map((row) => {
    const card = getCardById(row.label);

    return {
      cardId: row.label,
      cardName: card?.name ?? row.label,
      count: row.count
    };
  });
}

function getSourceBreakdown(events: StoredAnalyticsEvent[], topCards: ApplyCardRow[]) {
  const topCardIds = new Set(topCards.slice(0, 10).map((row) => row.cardId));
  const counts = new Map<string, Map<AnalyticsSource, number>>();

  for (const event of events) {
    if (event.event_name !== APPLY_CLICK_EVENT || !event.card_id || !topCardIds.has(event.card_id)) continue;

    const sourceCounts = counts.get(event.card_id) ?? new Map<AnalyticsSource, number>();
    sourceCounts.set(event.source, (sourceCounts.get(event.source) ?? 0) + 1);
    counts.set(event.card_id, sourceCounts);
  }

  return topCards.slice(0, 10).map((row) => {
    const sources = Array.from(counts.get(row.cardId) ?? [], ([source, count]) => ({ source, count })).sort(
      (a, b) => b.count - a.count
    );

    return {
      ...row,
      sources
    };
  });
}

function getZeroResultQueries(events: StoredAnalyticsEvent[]) {
  return events
    .filter((event) => {
      if (event.event_name !== ASK_RESULT_EVENT || !event.query) return false;
      return (event.card_ids?.length ?? 0) === 0 || event.metadata?.intent === "unsupported";
    })
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
    .slice(0, 50);
}

function getDailyUsageRows(events: StoredAnalyticsEvent[], now: Date) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const date = event.received_at.slice(0, 10);
    if (!date) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const dateKey = date.toISOString().slice(0, 10);

    return {
      date: dateKey,
      count: counts.get(dateKey) ?? 0
    };
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}

function CountTable({ rows, labelHeader }: { rows: CountRow[]; labelHeader: string }) {
  if (rows.length === 0) return <EmptyState>No data yet.</EmptyState>;

  return (
    <div className="analytics-review-table-shell">
      <table className="compare-table analytics-review-table">
        <thead>
          <tr>
            <th>{labelHeader}</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.count.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AnalyticsReviewPage() {
  const events = await readAnalyticsLog(10000);
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const last30DayEvents = events.filter((event) => isRecentEvent(event, thirtyDaysAgo));
  const last14DayEvents = events.filter((event) => isRecentEvent(event, fourteenDaysAgo));
  const topAskQueries = getTopAskQueries(last30DayEvents);
  const applyRows = getApplyRows(last30DayEvents);
  const sourceBreakdown = getSourceBreakdown(last30DayEvents, applyRows);
  const zeroResultQueries = getZeroResultQueries(last30DayEvents);
  const dailyUsageRows = getDailyUsageRows(last14DayEvents, now);

  return (
    <section className="section analytics-review">
      <div className="page-title">
        <h1>Analytics</h1>
        <p>Review recent product usage from the local analytics JSONL log.</p>
      </div>

      <div className="panel review-summary" style={{ margin: "18px 0" }}>
        <div className="stat">
          <strong>{events.length.toLocaleString("en-IN")}</strong>
          <span>Events loaded</span>
        </div>
        <div className="stat">
          <strong>{last30DayEvents.length.toLocaleString("en-IN")}</strong>
          <span>Events in last 30 days</span>
        </div>
        <div className="stat">
          <strong>{topAskQueries.length.toLocaleString("en-IN")}</strong>
          <span>Tracked ask queries</span>
        </div>
        <div className="stat">
          <strong>{applyRows.length.toLocaleString("en-IN")}</strong>
          <span>Cards with apply clicks</span>
        </div>
      </div>

      <div className="review-list">
        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Top ask queries</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <CountTable labelHeader="Query" rows={topAskQueries} />
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Apply clicks by card</strong>
            <span className="badge">Top 20</span>
          </div>
          {applyRows.length === 0 ? (
            <EmptyState>No data yet.</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Card ID</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {applyRows.slice(0, 20).map((row) => (
                    <tr key={row.cardId}>
                      <td>{row.cardName}</td>
                      <td>{row.cardId}</td>
                      <td>{row.count.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Apply source breakdown</strong>
            <span className="badge">Top 10 clicked cards</span>
          </div>
          {sourceBreakdown.length === 0 ? (
            <EmptyState>No data yet.</EmptyState>
          ) : (
            <div className="analytics-source-list">
              {sourceBreakdown.map((row) => (
                <div className="analytics-source-row" key={row.cardId}>
                  <div>
                    <strong>{row.cardName}</strong>
                    <span>{row.count.toLocaleString("en-IN")} total clicks</span>
                  </div>
                  <div className="review-actions">
                    {row.sources.map((source) => (
                      <span className="badge" key={`${row.cardId}-${source.source}`}>
                        {source.source}: {source.count.toLocaleString("en-IN")}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Zero-result and unsupported queries</strong>
            <span className="badge">Newest 50</span>
          </div>
          {zeroResultQueries.length === 0 ? (
            <EmptyState>No data yet.</EmptyState>
          ) : (
            <div className="review-list analytics-query-list">
              {zeroResultQueries.map((event, index) => (
                <div className="analytics-query-row" key={`${event.received_at}-${event.query}-${index}`}>
                  <strong>{event.query}</strong>
                  <div className="meta">
                    <span>{formatDateTime(event.received_at)}</span>
                    <span>Intent: {String(event.metadata?.intent ?? "zero-result")}</span>
                    <span>Source: {event.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Daily usage</strong>
            <span className="badge">Last 14 days</span>
          </div>
          {last14DayEvents.length === 0 ? (
            <EmptyState>No data yet.</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total events</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyUsageRows.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.count.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
