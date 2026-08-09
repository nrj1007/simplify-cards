import { readRecentAnalyticsLogByDatePrefix } from "@/lib/analytics-logs";
import {
  buildDailySummaryFromEvents,
  buildLast24HourRowsFromSummaries,
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

type LabelCountRow = {
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

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="notice">{children}</div>;
}

function HitGraph({ rows, emptyLabel = "No hits yet" }: { rows: HitGraphRow[]; emptyLabel?: string }) {
  if (rows.every((row) => row.count === 0)) return <EmptyState>{emptyLabel}</EmptyState>;

  const maxCount = Math.max(1, ...rows.map((row) => row.count));
  const chartWidth = 720;
  const chartHeight = 260;
  const padding = { top: 18, right: 18, bottom: 46, left: 52 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const barGap = rows.length > 12 ? 6 : 14;
  const barWidth = Math.max(4, (plotWidth - barGap * (rows.length - 1)) / rows.length);
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];
  const labeledXIndexes = new Set(
    rows.length > 12
      ? [0, Math.floor((rows.length - 1) / 2), rows.length - 1]
      : rows.map((_, index) => index)
  );

  return (
    <div className="analytics-axis-chart" role="img" aria-label="Hits chart with time on X axis and hit count on Y axis">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        {yTicks.map((tick) => {
          const y = padding.top + plotHeight - (tick / maxCount) * plotHeight;
          return (
            <g key={tick}>
              <line className="analytics-axis-grid" x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} />
              <text className="analytics-axis-label" x={padding.left - 10} y={y + 4} textAnchor="end">
                {tick.toLocaleString("en-IN")}
              </text>
            </g>
          );
        })}
        <line className="analytics-axis-line" x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + plotHeight} />
        <line
          className="analytics-axis-line"
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={padding.top + plotHeight}
          y2={padding.top + plotHeight}
        />
        <text className="analytics-axis-title" x={16} y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 16 ${padding.top + plotHeight / 2})`}>
          Hits
        </text>
        <text className="analytics-axis-title" x={padding.left + plotWidth / 2} y={chartHeight - 6} textAnchor="middle">
          Time
        </text>
        {rows.map((row, index) => {
          const barHeight = (row.count / maxCount) * plotHeight;
          const x = padding.left + index * (barWidth + barGap);
          const y = padding.top + plotHeight - barHeight;
          const labelX = x + barWidth / 2;

          return (
            <g key={row.label}>
              <rect className="analytics-hit-bar" x={x} y={y} width={barWidth} height={Math.max(row.count > 0 ? 2 : 0, barHeight)} rx="4">
                <title>{`${row.label}: ${row.count.toLocaleString("en-IN")} hits`}</title>
              </rect>
              {labeledXIndexes.has(index) ? (
                <text className="analytics-axis-label analytics-x-label" x={labelX} y={padding.top + plotHeight + 22} textAnchor="middle">
                  {row.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
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

function formatLabelCounts(rows: LabelCountRow[]) {
  if (rows.length === 0) return "—";
  return rows.map((row) => `${row.label}: ${row.count.toLocaleString("en-IN")}`).join(", ");
}

export default async function AnalyticsReviewPage() {
  const now = new Date();
  const dailyDateKeys = getAnalyticsDateKeys(14, now);
  const eventWindowDateKeys = getAnalyticsDateKeys(30, now);
  const storedSummaries = await readAnalyticsDailySummaries(eventWindowDateKeys);
  const summariesByDate = new Map(storedSummaries.map((summary) => [summary.date, summary]));
  const missingSummaryDateKeys = eventWindowDateKeys.filter((date) => !summariesByDate.has(date));
  const recentEvents =
    missingSummaryDateKeys.length > 0 ? await readRecentAnalyticsLogByDatePrefix(missingSummaryDateKeys, 2000).catch(() => []) : [];
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
  const last24HourHitRows = buildLast24HourRowsFromSummaries([...summariesByDate.values()], now);
  const last7DayHitRows = [...summary.dailyUsageRows]
    .slice(0, 7)
    .reverse()
    .map((row) => ({ label: row.date, count: row.count }));
  const last14DayRateLimitRows = [...summary.dailyRateLimitRows]
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
            <strong>API request counts by route</strong>
            <span className="badge">Analytics-emitting requests · Last 30 days</span>
          </div>
          <div className="analytics-review-grid">
            <div>
              <h3>Route / request path</h3>
              <CountTable labelHeader="Path" rows={summary.requestPathRows} />
            </div>
            <div>
              <h3>User agent family</h3>
              <CountTable labelHeader="User agent" rows={summary.requestUserAgentRows} />
            </div>
          </div>
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Ask cache hit rate trend</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <CountTable labelHeader="Cache status" rows={summary.askCacheRows} />
          {summary.askCacheTrendRows.every((row) => row.total === 0) ? (
            <EmptyState>No cache data yet</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hit rate</th>
                    <th>Hits</th>
                    <th>Misses</th>
                    <th>Skipped</th>
                    <th>Unknown</th>
                    <th>Total Ask results</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary.askCacheTrendRows].reverse().map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{(row.hitRate * 100).toFixed(1)}%</td>
                      <td>{row.hit.toLocaleString("en-IN")}</td>
                      <td>{row.miss.toLocaleString("en-IN")}</td>
                      <td>{row.skip.toLocaleString("en-IN")}</td>
                      <td>{row.unknown.toLocaleString("en-IN")}</td>
                      <td>{row.total.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>AI calls by provider / purpose over time</strong>
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
          {summary.dailyAiUsageRows.every((row) => row.providerAttemptCount === 0 && row.schemaCallCount === 0) ? (
            <EmptyState>No daily AI usage yet</EmptyState>
          ) : (
            <div className="analytics-review-table-shell">
              <table className="compare-table analytics-review-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ask results with AI</th>
                    <th>Schema calls</th>
                    <th>Provider attempts</th>
                    <th>Providers</th>
                    <th>Purposes</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary.dailyAiUsageRows].reverse().map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.resultCount.toLocaleString("en-IN")}</td>
                      <td>{row.schemaCallCount.toLocaleString("en-IN")}</td>
                      <td>{row.providerAttemptCount.toLocaleString("en-IN")}</td>
                      <td>{formatLabelCounts(row.providerAttempts)}</td>
                      <td>{formatLabelCounts(row.callsByPurpose)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            <strong>Rate-limited requests</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <div className="review-summary analytics-review-mini-summary">
            <div className="stat">
              <strong>{summary.askRateLimit.count.toLocaleString("en-IN")}</strong>
              <span>Blocked Ask requests</span>
            </div>
          </div>
          <HitGraph rows={last14DayRateLimitRows} emptyLabel="No rate-limited requests yet" />
          <div className="analytics-review-grid">
            <div>
              <h3>Block reason</h3>
              <CountTable labelHeader="Reason" rows={summary.askRateLimit.byReason} />
            </div>
            <div>
              <h3>IP hash</h3>
              <CountTable labelHeader="IP hash" rows={summary.askRateLimit.byIpHash} />
            </div>
            <div>
              <h3>Top blocked query hashes</h3>
              <CountTable labelHeader="Query hash" rows={summary.askRateLimit.byQueryHash} />
            </div>
          </div>
        </article>

        <article className="panel review-item">
          <div className="review-item-head">
            <strong>Top blocked query hashes / patterns</strong>
            <span className="badge">Last 30 days</span>
          </div>
          <div className="analytics-review-grid">
            <div>
              <h3>Blocked query hashes</h3>
              <CountTable labelHeader="Query hash" rows={summary.askRateLimit.byQueryHash} />
            </div>
            <div>
              <h3>Bot-like query patterns</h3>
              {summary.botLikeAskQueries.length === 0 ? (
                <EmptyState>No bot-like ask query patterns detected</EmptyState>
              ) : (
                <div className="review-list analytics-query-list">
                  {summary.botLikeAskQueries.slice(0, 10).map((event, index) => (
                    <div className="analytics-query-row" key={`${event.received_at}-${event.query}-${index}`}>
                      <strong>{event.query}</strong>
                      <div className="meta">
                        <span>{formatDateTime(event.received_at)}</span>
                        <span>Intent: {String(event.metadata?.intent ?? "unknown")}</span>
                        <span>Cache: {String(event.metadata?.ask_cache_status ?? "UNKNOWN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
