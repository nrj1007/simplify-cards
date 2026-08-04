import { readRecentAnalyticsLogByDatePrefix } from "@/lib/analytics-logs";
import {
  buildDailySummaryFromEvents,
  getAnalyticsDateKeys,
  mergeDailySummaries,
  readAnalyticsDailySummaries
} from "@/lib/analytics-summary";
import PageHero from "@/app/ui/PageHero";

export const dynamic = "force-dynamic";

type CountRow = {
  label: string;
  count: number;
};

type HitGraphRow = {
  label: string;
  count: number;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatHourLabel(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    hour12: false
  }).format(value);
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}

function HitGraph({ rows, emptyLabel = "No hits yet" }: { rows: HitGraphRow[]; emptyLabel?: string }) {
  if (rows.every((row) => row.count === 0)) return <EmptyState>{emptyLabel}</EmptyState>;

  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="analytics-hit-chart">
      {rows.map((row) => {
        const width = `${Math.max(2, Math.round((row.count / maxCount) * 100))}%`;
        return (
          <div className="analytics-hit-row" key={row.label}>
            <span>{row.label}</span>
            <div aria-hidden="true" className="analytics-hit-track">
              <i style={{ width }} />
            </div>
            <strong>{row.count.toLocaleString("en-IN")}</strong>
          </div>
        );
      })}
    </div>
  );
}

function CountTable({ rows, labelHeader }: { rows: CountRow[]; labelHeader: string }) {
  if (rows.length === 0) return <EmptyState>No data yet</EmptyState>;

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

function buildLast24HourHitRows(events: Array<{ received_at: string }>, now: Date): HitGraphRow[] {
  const hourMs = 60 * 60 * 1000;
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);

  const buckets = new Map<string, HitGraphRow>();
  const firstHourStart = new Date(currentHourStart.getTime() - 23 * hourMs);
  const endExclusive = new Date(currentHourStart.getTime() + hourMs);

  for (let index = 0; index < 24; index += 1) {
    const hour = new Date(firstHourStart.getTime() + index * hourMs);
    buckets.set(hour.toISOString(), {
      label: formatHourLabel(hour),
      count: 0
    });
  }

  for (const event of events) {
    const receivedAt = new Date(event.received_at);
    const timestamp = receivedAt.getTime();
    if (!Number.isFinite(timestamp) || timestamp < firstHourStart.getTime() || timestamp >= endExclusive.getTime()) continue;

    receivedAt.setMinutes(0, 0, 0);
    const bucket = buckets.get(receivedAt.toISOString());
    if (bucket) bucket.count += 1;
  }

  return [...buckets.values()];
}

export default async function AnalyticsReviewPage() {
  const now = new Date();
  const dailyDateKeys = getAnalyticsDateKeys(14, now);
  const eventWindowDateKeys = getAnalyticsDateKeys(30, now);
  const hourlyDateKeys = getAnalyticsDateKeys(2, now);
  const storedSummaries = await readAnalyticsDailySummaries(eventWindowDateKeys);
  const summariesByDate = new Map(storedSummaries.map((summary) => [summary.date, summary]));
  const missingSummaryDateKeys = eventWindowDateKeys.filter((date) => !summariesByDate.has(date));
  const recentEvents =
    missingSummaryDateKeys.length > 0 ? await readRecentAnalyticsLogByDatePrefix(missingSummaryDateKeys, 2000).catch(() => []) : [];
  const recentHourlyEvents = await readRecentAnalyticsLogByDatePrefix(hourlyDateKeys, 5000).catch(() => []);
  const recentEventsByDate = new Map<string, typeof recentEvents>();

  for (const event of recentEvents) {
    const date = event.received_at.slice(0, 10);
    if (!date) continue;
    recentEventsByDate.set(date, [...(recentEventsByDate.get(date) ?? []), event]);
  }

  for (const [date, dateEvents] of recentEventsByDate) {
    if (!summariesByDate.has(date)) {
      summariesByDate.set(date, buildDailySummaryFromEvents(date, dateEvents));
    }
  }

  const summary = mergeDailySummaries([...summariesByDate.values()], dailyDateKeys, eventWindowDateKeys);
  const last24HourHitRows = buildLast24HourHitRows(recentHourlyEvents, now);
  const last7DayHitRows = [...summary.dailyUsageRows]
    .slice(0, 7)
    .reverse()
    .map((row) => ({ label: row.date, count: row.count }));

  return (
    <div className="page-shell review-page analytics-review">
      <PageHero
        eyebrow="Internal review"
        title="Analytics"
        lead="Review recent product usage stored in the private durable record store."
      />

      <section className="page-content">
        <div className="container">
          <div className="panel review-summary">
            <div className="stat">
              <strong>{summary.eventsLoaded.toLocaleString("en-IN")}</strong>
              <span>Events summarized</span>
            </div>
            <div className="stat">
              <strong>{summary.last30DayEvents.toLocaleString("en-IN")}</strong>
              <span>Events in last 30 days</span>
            </div>
            <div className="stat">
              <strong>{summary.topAskQueries.length.toLocaleString("en-IN")}</strong>
              <span>Tracked ask queries</span>
            </div>
            <div className="stat">
              <strong>{summary.cardViewRows.length.toLocaleString("en-IN")}</strong>
              <span>Cards with detail views</span>
            </div>
            <div className="stat">
              <strong>{summary.askDetailClickRows.length.toLocaleString("en-IN")}</strong>
              <span>Cards opened from Ask</span>
            </div>
            <div className="stat">
              <strong>{summary.applyRows.length.toLocaleString("en-IN")}</strong>
              <span>Cards with apply clicks</span>
            </div>
            <div className="stat">
              <strong>{summary.feedback.count.toLocaleString("en-IN")}</strong>
              <span>Feedback submissions</span>
            </div>
            <div className="stat">
              <strong>{summary.aiUsage.providerAttemptCount.toLocaleString("en-IN")}</strong>
              <span>AI provider attempts</span>
            </div>
            <div className="stat">
              <strong>{summary.askSignals.botLikeQueryCount.toLocaleString("en-IN")}</strong>
              <span>Bot-like ask results</span>
            </div>
          </div>

          <div className="review-list">
        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Hits</strong>
            <span className="badge">Last 1 day and 7 days</span>
          </div>
          <div className="analytics-review-grid analytics-hit-grid">
            <div>
              <h3>Last 1 day by hour</h3>
              <HitGraph rows={last24HourHitRows} />
            </div>
            <div>
              <h3>Last 7 days by day</h3>
              <HitGraph rows={last7DayHitRows} />
            </div>
          </div>
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>AI usage</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <div className="review-summary analytics-review-mini-summary">
            <div className="stat">
              <strong>{summary.aiUsage.resultCount.toLocaleString("en-IN")}</strong>
              <span>Ask results with AI attempts</span>
            </div>
            <div className="stat">
              <strong>{summary.aiUsage.schemaCallCount.toLocaleString("en-IN")}</strong>
              <span>Schema calls</span>
            </div>
            <div className="stat">
              <strong>{summary.aiUsage.successfulSchemaCallCount.toLocaleString("en-IN")}</strong>
              <span>Successful schema calls</span>
            </div>
            <div className="stat">
              <strong>{summary.aiUsage.failedSchemaCallCount.toLocaleString("en-IN")}</strong>
              <span>Failed schema calls</span>
            </div>
            <div className="stat">
              <strong>{summary.aiUsage.fallbackResultCount.toLocaleString("en-IN")}</strong>
              <span>Results using fallback provider</span>
            </div>
          </div>
          <CountTable labelHeader="Provider attempts" rows={summary.aiUsage.providerAttempts} />
          <CountTable labelHeader="AI purpose" rows={summary.aiUsage.callsByPurpose} />
          <CountTable labelHeader="Ask intent" rows={summary.aiUsage.resultsByIntent} />
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Ask abuse signals</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <div className="review-summary analytics-review-mini-summary">
            <div className="stat">
              <strong>{summary.askSignals.resultCount.toLocaleString("en-IN")}</strong>
              <span>Ask results</span>
            </div>
            <div className="stat">
              <strong>{summary.askSignals.anonymousResultCount.toLocaleString("en-IN")}</strong>
              <span>Anonymous ask results</span>
            </div>
            <div className="stat">
              <strong>{summary.askSignals.emptyReferrerResultCount.toLocaleString("en-IN")}</strong>
              <span>Empty-referrer ask results</span>
            </div>
          </div>
          {summary.botLikeAskQueries.length === 0 ? (
            <EmptyState>No bot-like ask queries detected</EmptyState>
          ) : (
            <div className="review-list analytics-query-list">
              {summary.botLikeAskQueries.map((event, index) => (
                <div className="analytics-query-row" key={`${event.received_at}-${event.query}-${index}`}>
                  <strong>{event.query}</strong>
                  <div className="meta">
                    <span>{formatDateTime(event.received_at)}</span>
                    <span>Intent: {String(event.metadata?.intent ?? "unknown")}</span>
                    <span>AI attempts: {String(event.metadata?.ai_provider_attempt_count ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Top ask queries</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <CountTable labelHeader="Query" rows={summary.topAskQueries} />
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Feedback submissions</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <div className="review-summary analytics-review-mini-summary">
            <div className="stat">
              <strong>{summary.feedback.count.toLocaleString("en-IN")}</strong>
              <span>Total feedback</span>
            </div>
            <div className="stat">
              <strong>{summary.feedback.withCommentCount.toLocaleString("en-IN")}</strong>
              <span>With comment</span>
            </div>
            <div className="stat">
              <strong>{summary.feedback.withoutCommentCount.toLocaleString("en-IN")}</strong>
              <span>Quick taps</span>
            </div>
          </div>
          <div className="analytics-review-grid">
            <div>
              <h3>Feedback value</h3>
              <CountTable labelHeader="Feedback" rows={summary.feedback.byValue} />
            </div>
            <div>
              <h3>Feedback source</h3>
              <CountTable labelHeader="Source" rows={summary.feedback.bySource} />
            </div>
          </div>
          {summary.feedbackEvents.length === 0 ? (
            <EmptyState>No feedback events yet</EmptyState>
          ) : (
            <div className="review-list analytics-query-list">
              {summary.feedbackEvents.map((event, index) => (
                <div className="analytics-query-row" key={`${event.received_at}-${event.query}-${index}`}>
                  <strong>{event.query ?? "No query"}</strong>
                  <div className="meta">
                    <span>{formatDateTime(event.received_at)}</span>
                    <span>Feedback: {String(event.metadata?.feedback ?? "unknown")}</span>
                    <span>Source: {String(event.metadata?.feedback_source ?? event.source)}</span>
                    <span>Comment: {event.metadata?.has_comment === true ? "yes" : "no"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Card detail views</strong>
            <span className="badge">Top 25</span>
          </div>
          {summary.cardViewRows.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Card ID</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.cardViewRows.slice(0, 25).map((row) => (
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
            <strong>Ask to card detail clicks</strong>
            <span className="badge">Top 25</span>
          </div>
          {summary.askDetailClickRows.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Card ID</th>
                    <th>Ask clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.askDetailClickRows.slice(0, 25).map((row) => (
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
            <strong>Query to card detail clicks</strong>
            <span className="badge">Top 50</span>
          </div>
          {summary.queryToCardRows.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Card</th>
                    <th>Card ID</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.queryToCardRows.map((row) => (
                    <tr key={`${row.query}-${row.cardId}`}>
                      <td>{row.query}</td>
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
            <strong>Card detail apply conversion</strong>
            <span className="badge">Top viewed cards</span>
          </div>
          {summary.cardDetailApplyConversionRows.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Card ID</th>
                    <th>Detail views</th>
                    <th>Detail apply clicks</th>
                    <th>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.cardDetailApplyConversionRows.slice(0, 25).map((row) => (
                    <tr key={row.cardId}>
                      <td>{row.cardName}</td>
                      <td>{row.cardId}</td>
                      <td>{row.views.toLocaleString("en-IN")}</td>
                      <td>{row.detailApplyClicks.toLocaleString("en-IN")}</td>
                      <td>{(row.conversionRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Card detail traffic</strong>
            <span className="badge">Bot and source split</span>
          </div>
          <div className="analytics-review-grid">
            <div>
              <h3>Human vs bot</h3>
              <CountTable labelHeader="Traffic" rows={summary.cardViewTrafficRows} />
            </div>
            <div>
              <h3>User agent family</h3>
              <CountTable labelHeader="User agent" rows={summary.cardViewUserAgentRows} />
            </div>
            <div>
              <h3>Country</h3>
              <CountTable labelHeader="Country" rows={summary.cardViewCountryRows} />
            </div>
            <div>
              <h3>Referrer host</h3>
              <CountTable labelHeader="Referrer" rows={summary.cardViewReferrerRows} />
            </div>
          </div>
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Detail click source breakdown</strong>
            <span className="badge">Top 10 clicked cards</span>
          </div>
          {summary.detailSourceBreakdown.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="analytics-source-list">
              {summary.detailSourceBreakdown.map((row) => (
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
            <strong>Apply clicks by card</strong>
            <span className="badge">Top 20</span>
          </div>
          {summary.applyRows.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
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
                  {summary.applyRows.slice(0, 20).map((row) => (
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
          {summary.sourceBreakdown.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="analytics-source-list">
              {summary.sourceBreakdown.map((row) => (
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
          {summary.zeroResultQueries.length === 0 ? (
            <EmptyState>No data yet</EmptyState>
          ) : (
            <div className="review-list analytics-query-list">
              {summary.zeroResultQueries.map((event, index) => (
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
          {summary.dailyUsageRows.every((row) => row.count === 0) ? (
            <EmptyState>No data yet</EmptyState>
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
                  {summary.dailyUsageRows.map((row) => (
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
        </div>
      </section>
    </div>
  );
}
