import { describe, expect, it } from "vitest";
import { buildDailySummaryFromEvents, mergeDailySummaries } from "../lib/analytics-summary";
import type { StoredAnalyticsEvent } from "../lib/analytics";

function event(overrides: Partial<StoredAnalyticsEvent>): StoredAnalyticsEvent {
  return {
    event_name: "ask_query_submitted",
    received_at: "2026-07-27T03:00:00.000Z",
    session_id: "session-1",
    page: "ask",
    source: "ask",
    device_type: "desktop",
    referrer: "",
    ...overrides
  };
}

describe("analytics daily summaries", () => {
  it("counts ask queries, apply clicks, source breakdowns, and unsupported results", () => {
    const summary = buildDailySummaryFromEvents("2026-07-27", [
      event({ query: "best upi cards" }),
      event({ query: "best upi cards" }),
      event({
        event_name: "apply_clicked",
        page: "compare",
        source: "compare",
        card_id: "sbi-cashback"
      }),
      event({
        event_name: "ask_result_rendered",
        query: "unknown card",
        card_ids: [],
        metadata: { intent: "unsupported" }
      })
    ]);

    expect(summary.total_events).toBe(4);
    expect(summary.ask_queries).toEqual({ "best upi cards": 2 });
    expect(summary.apply_clicks_by_card).toEqual({ "sbi-cashback": 1 });
    expect(summary.apply_clicks_by_card_source).toEqual({ "sbi-cashback": { compare: 1 } });
    expect(summary.zero_result_queries).toHaveLength(1);
  });

  it("merges daily summaries into review page rows", () => {
    const summary = buildDailySummaryFromEvents("2026-07-27", [
      event({ query: "best cashback card" }),
      event({
        event_name: "apply_clicked",
        page: "ask",
        source: "ask",
        card_id: "sbi-cashback"
      }),
      event({
        event_name: "apply_clicked",
        page: "compare",
        source: "compare",
        card_id: "sbi-cashback"
      })
    ]);

    const review = mergeDailySummaries([summary], ["2026-07-27"], ["2026-07-27"]);

    expect(review.eventsLoaded).toBe(3);
    expect(review.last30DayEvents).toBe(3);
    expect(review.topAskQueries).toEqual([{ label: "best cashback card", count: 1 }]);
    expect(review.applyRows[0]).toMatchObject({ cardId: "sbi-cashback", count: 2 });
    expect(review.sourceBreakdown[0]?.sources).toEqual([
      { source: "ask", count: 1 },
      { source: "compare", count: 1 }
    ]);
    expect(review.dailyUsageRows).toEqual([{ date: "2026-07-27", count: 3 }]);
  });
});
