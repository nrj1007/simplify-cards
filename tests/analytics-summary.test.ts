import { describe, expect, it } from "vitest";
import { addEventToDailySummary, buildDailySummaryFromEvents, buildLast24HourRowsFromSummaries, mergeDailySummaries } from "../lib/analytics-summary";
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
        event_name: "card_detail_viewed",
        page: "cards/[id]",
        source: "details",
        card_id: "hdfc-infinia-metal",
        metadata: {
          request_path: "/cards/hdfc-infinia-metal",
          request_referrer_host: "google.com",
          request_user_agent_family: "chrome",
          request_user_agent_is_bot: false,
          request_country: "IN"
        }
      }),
      event({
        event_name: "card_detail_viewed",
        page: "cards/[id]",
        source: "details",
        card_id: "hdfc-infinia-metal",
        metadata: {
          request_path: "/cards/hdfc-infinia-metal",
          request_user_agent_family: "googlebot",
          request_user_agent_is_bot: true,
          request_country: "US"
        }
      }),
      event({
        event_name: "details_clicked",
        page: "ask",
        source: "ask",
        query: "best travel card",
        card_id: "hdfc-infinia-metal"
      }),
      event({
        event_name: "apply_clicked",
        page: "compare",
        source: "compare",
        card_id: "sbi-cashback"
      }),
      event({
        event_name: "feedback_submitted",
        page: "ask",
        source: "ask",
        query: "best travel card",
        card_ids: ["hdfc-infinia-metal"],
        metadata: {
          feedback: "down",
          has_comment: true,
          feedback_source: "ask"
        }
      }),
      event({
        event_name: "ask_result_rendered",
        query: "unknown card",
        card_ids: [],
        metadata: { intent: "unsupported", ask_cache_status: "SKIP" }
      }),
      event({
        event_name: "ask_result_rendered",
        session_id: "anonymous",
        query: "Is the Smart Credit Card a good fit for me? with spend rs 75k+ for travel with spend rs 25k-75k for low annual fee",
        card_ids: ["sc-smart"],
        metadata: {
          intent: "best-fit",
          ask_cache_status: "MISS",
          ai_attempted: true,
          ai_used: false,
          ai_schema_call_count: 1,
          ai_provider_attempt_count: 2,
          ai_successful_schema_call_count: 0,
          ai_failed_schema_call_count: 1,
          ai_fallback_used: true,
          ai_calls: [
            {
              purpose: "answer_summary",
              schema_name: "grounded_card_answer",
              primary_provider: "gemini",
              provider_used: null,
              fallback_provider: "openai",
              fallback_used: true,
              success: false
            }
          ]
        }
      })
    ]);

    expect(summary.schema_version).toBe(3);
    expect(summary.total_events).toBe(9);
    expect(summary.hourly_event_counts).toEqual({ "2026-07-27T03:00:00.000Z": 9 });
    expect(summary.ask_queries).toEqual({
      "Is the Smart Credit Card a good fit for me? with spend rs 75k+ for travel with spend rs 25k-75k for low annual fee": 1,
      "unknown card": 1
    });
    expect(summary.request_path_counts).toEqual({
      "/cards/hdfc-infinia-metal": 2,
      ask: 6,
      compare: 1
    });
    expect(summary.request_user_agent_family_counts).toEqual({
      chrome: 1,
      googlebot: 1,
      unknown: 7
    });
    expect(summary.card_detail_views_by_card).toEqual({ "hdfc-infinia-metal": 2 });
    expect(summary.card_detail_views_by_referrer_host).toEqual({ direct: 1, "google.com": 1 });
    expect(summary.card_detail_views_by_traffic_class).toEqual({ bot: 1, human: 1 });
    expect(summary.card_detail_views_by_user_agent_family).toEqual({ chrome: 1, googlebot: 1 });
    expect(summary.card_detail_views_by_country).toEqual({ IN: 1, US: 1 });
    expect(summary.detail_clicks_by_card).toEqual({ "hdfc-infinia-metal": 1 });
    expect(summary.ask_detail_clicks_by_card).toEqual({ "hdfc-infinia-metal": 1 });
    expect(summary.ask_query_to_card_detail_clicks).toEqual({
      ["best travel card\u001fhdfc-infinia-metal"]: 1
    });
    expect(summary.apply_clicks_by_card).toEqual({ "sbi-cashback": 1 });
    expect(summary.apply_clicks_by_card_source).toEqual({ "sbi-cashback": { compare: 1 } });
    expect(summary.feedback_count).toBe(1);
    expect(summary.feedback_with_comment_count).toBe(1);
    expect(summary.feedback_by_value).toEqual({ down: 1 });
    expect(summary.feedback_by_source).toEqual({ ask: 1 });
    expect(summary.feedback_events).toHaveLength(1);
    expect(summary.zero_result_queries).toHaveLength(1);
    expect(summary.ai_result_count).toBe(1);
    expect(summary.ai_provider_attempt_count).toBe(2);
    expect(summary.ai_failed_schema_call_count).toBe(1);
    expect(summary.ai_fallback_result_count).toBe(1);
    expect(summary.ask_cache_status_counts).toEqual({ MISS: 1, SKIP: 1 });
    expect(summary.ask_rate_limited_count).toBe(0);
    expect(summary.ai_calls_by_purpose).toEqual({ answer_summary: 1 });
    expect(summary.ai_provider_attempts).toEqual({ gemini: 1, openai: 1 });
    expect(summary.bot_like_ask_queries).toHaveLength(1);
  });

  it("counts Ask rate-limited requests by reason, IP hash, and query hash", () => {
    const summary = buildDailySummaryFromEvents("2026-07-27", [
      event({
        event_name: "ask_rate_limited",
        page: "api/ask",
        source: "ask",
        metadata: {
          rate_limit_reason: "ip_query_daily_limit",
          rate_limit_ip_hash: "ip-hash-1",
          rate_limit_query_hash: "query-hash-1"
        }
      }),
      event({
        event_name: "ask_rate_limited",
        page: "api/ask",
        source: "ask",
        metadata: {
          rate_limit_reason: "ip_daily_limit",
          rate_limit_ip_hash: "ip-hash-1",
          rate_limit_query_hash: "query-hash-2"
        }
      })
    ]);

    expect(summary.ask_rate_limited_count).toBe(2);
    expect(summary.ask_rate_limited_by_reason).toEqual({
      ip_daily_limit: 1,
      ip_query_daily_limit: 1
    });
    expect(summary.ask_rate_limited_by_ip_hash).toEqual({ "ip-hash-1": 2 });
    expect(summary.ask_rate_limited_by_query_hash).toEqual({
      "query-hash-1": 1,
      "query-hash-2": 1
    });

    const review = mergeDailySummaries([summary], ["2026-07-27"], ["2026-07-27"]);
    expect(review.askRateLimit).toEqual({
      count: 2,
      byReason: [
        { label: "ip_daily_limit", count: 1 },
        { label: "ip_query_daily_limit", count: 1 }
      ],
      byIpHash: [{ label: "ip-hash-1", count: 2 }],
      byQueryHash: [
        { label: "query-hash-1", count: 1 },
        { label: "query-hash-2", count: 1 }
      ]
    });
  });

  it("merges daily summaries into review page rows", () => {
    const summary = buildDailySummaryFromEvents("2026-07-27", [
      event({ query: "best cashback card" }),
      event({
        event_name: "card_detail_viewed",
        page: "cards/[id]",
        source: "details",
        card_id: "axis-atlas",
        metadata: {
          request_path: "/cards/axis-atlas",
          request_referrer_host: "google.com",
          request_user_agent_family: "chrome",
          request_user_agent_is_bot: false,
          request_country: "IN"
        }
      }),
      event({
        event_name: "card_detail_viewed",
        page: "cards/[id]",
        source: "details",
        card_id: "axis-atlas"
      }),
      event({
        event_name: "card_detail_viewed",
        page: "cards/[id]",
        source: "details",
        card_id: "hdfc-infinia-metal"
      }),
      event({
        event_name: "details_clicked",
        page: "ask",
        source: "ask",
        query: "best travel card",
        card_id: "axis-atlas"
      }),
      event({
        event_name: "details_clicked",
        page: "finder",
        source: "finder",
        card_id: "axis-atlas"
      }),
      event({
        event_name: "apply_clicked",
        page: "ask",
        source: "ask",
        card_id: "sbi-cashback"
      }),
      event({
        event_name: "apply_clicked",
        page: "cards/[id]",
        source: "details",
        card_id: "axis-atlas"
      }),
      event({
        event_name: "feedback_submitted",
        page: "ask",
        source: "ask",
        query: "best cashback card",
        card_ids: ["axis-atlas"],
        metadata: {
          feedback: "up",
          has_comment: false,
          feedback_source: "ask"
        }
      }),
      event({
        event_name: "feedback_submitted",
        page: "cards/[id]",
        source: "details",
        query: "axis atlas",
        card_ids: ["axis-atlas"],
        metadata: {
          feedback: "down",
          has_comment: true,
          feedback_source: "details"
        }
      }),
      event({
        event_name: "ask_result_rendered",
        page: "ask",
        source: "ask",
        query: "best cashback card",
        card_ids: ["axis-atlas"]
      })
    ]);

    const review = mergeDailySummaries([summary], ["2026-07-27"], ["2026-07-27"]);

    expect(review.eventsLoaded).toBe(11);
    expect(review.last30DayEvents).toBe(11);
    expect(review.topAskQueries).toEqual([{ label: "best cashback card", count: 1 }]);
    expect(review.askCacheRows).toEqual([{ label: "UNKNOWN", count: 1 }]);
    expect(review.requestPathRows).toEqual([
      { label: "ask", count: 5 },
      { label: "cards/[id]", count: 4 },
      { label: "/cards/axis-atlas", count: 1 },
      { label: "finder", count: 1 }
    ]);
    expect(review.requestUserAgentRows).toEqual([
      { label: "unknown", count: 10 },
      { label: "chrome", count: 1 }
    ]);
    expect(review.cardViewRows).toEqual([
      expect.objectContaining({ cardId: "axis-atlas", count: 2 }),
      expect.objectContaining({ cardId: "hdfc-infinia-metal", count: 1 })
    ]);
    expect(review.detailClickRows[0]).toMatchObject({ cardId: "axis-atlas", count: 2 });
    expect(review.askDetailClickRows).toEqual([expect.objectContaining({ cardId: "axis-atlas", count: 1 })]);
    expect(review.queryToCardRows).toEqual([
      expect.objectContaining({ query: "best travel card", cardId: "axis-atlas", count: 1 })
    ]);
    expect(review.cardDetailApplyConversionRows[0]).toMatchObject({
      cardId: "axis-atlas",
      views: 2,
      detailApplyClicks: 1,
      conversionRate: 0.5
    });
    expect(review.cardViewReferrerRows).toEqual([
      { label: "direct", count: 2 },
      { label: "google.com", count: 1 }
    ]);
    expect(review.cardViewTrafficRows).toEqual([{ label: "human", count: 3 }]);
    expect(review.cardViewUserAgentRows).toEqual([
      { label: "unknown", count: 2 },
      { label: "chrome", count: 1 }
    ]);
    expect(review.cardViewCountryRows).toEqual([
      { label: "unknown", count: 2 },
      { label: "IN", count: 1 }
    ]);
    expect(review.applyRows).toEqual([
      expect.objectContaining({ cardId: "axis-atlas", count: 1 }),
      expect.objectContaining({ cardId: "sbi-cashback", count: 1 })
    ]);
    expect(review.sourceBreakdown.find((row) => row.cardId === "axis-atlas")?.sources).toEqual([
      { source: "details", count: 1 }
    ]);
    expect(review.detailSourceBreakdown[0]?.sources).toEqual([
      { source: "ask", count: 1 },
      { source: "finder", count: 1 }
    ]);
    expect(review.feedback).toEqual({
      count: 2,
      withCommentCount: 1,
      withoutCommentCount: 1,
      byValue: [
        { label: "down", count: 1 },
        { label: "up", count: 1 }
      ],
      bySource: [
        { label: "ask", count: 1 },
        { label: "details", count: 1 }
      ]
    });
    expect(review.feedbackEvents).toHaveLength(2);
    expect(review.dailyUsageRows).toEqual([{ date: "2026-07-27", count: 11 }]);
  });

  it("adds same-day summary shards in daily usage rows", () => {
    const firstShard = buildDailySummaryFromEvents("2026-07-27", [
      event({ event_name: "page_view", page: "/" }),
      event({ event_name: "page_view", page: "/" })
    ]);
    const secondShard = buildDailySummaryFromEvents("2026-07-27", [
      event({ event_name: "page_view", page: "/ask" })
    ]);

    const review = mergeDailySummaries([firstShard, secondShard], ["2026-07-27"], ["2026-07-27"]);

    expect(review.eventsLoaded).toBe(3);
    expect(review.dailyUsageRows).toEqual([{ date: "2026-07-27", count: 3 }]);
  });

  it("merges AI usage and ask abuse signals into review rows", () => {
    const summary = buildDailySummaryFromEvents("2026-07-27", [
      event({
        event_name: "ask_result_rendered",
        session_id: "anonymous",
        query: "Is the Smart Credit Card a good fit for me? with spend rs 75k+ for travel with spend rs 25k-75k for low annual fee",
        card_ids: ["sc-smart"],
        metadata: {
          intent: "best-fit",
          ask_cache_status: "HIT",
          ai_attempted: true,
          ai_schema_call_count: 1,
          ai_provider_attempt_count: 2,
          ai_successful_schema_call_count: 0,
          ai_failed_schema_call_count: 1,
          ai_fallback_used: true,
          ai_calls: [
            {
              purpose: "answer_summary",
              primary_provider: "gemini",
              fallback_provider: "openai",
              fallback_used: true,
              success: false
            }
          ]
        }
      })
    ]);

    const review = mergeDailySummaries([summary], ["2026-07-27"], ["2026-07-27"]);

    expect(review.aiUsage).toMatchObject({
      resultCount: 1,
      schemaCallCount: 1,
      providerAttemptCount: 2,
      failedSchemaCallCount: 1,
      fallbackResultCount: 1
    });
    expect(review.aiUsage.providerAttempts).toEqual([
      { label: "gemini", count: 1 },
      { label: "openai", count: 1 }
    ]);
    expect(review.aiUsage.callsByPurpose).toEqual([{ label: "answer_summary", count: 1 }]);
    expect(review.aiUsage.resultsByIntent).toEqual([{ label: "best-fit", count: 1 }]);
    expect(review.askCacheRows).toEqual([{ label: "HIT", count: 1 }]);
    expect(review.askSignals).toEqual({
      resultCount: 1,
      anonymousResultCount: 1,
      emptyReferrerResultCount: 1,
      botLikeQueryCount: 1
    });
    expect(review.botLikeAskQueries).toHaveLength(1);
  });

  it("normalizes older summary blobs before adding newer fields", () => {
    const olderSummary = {
      date: "2026-07-27",
      updated_at: "2026-07-27T00:00:00.000Z",
      total_events: 1,
      event_counts: { page_view: 1 },
      page_counts: { ask: 1 },
      source_counts: { ask: 1 },
      device_counts: { desktop: 1 },
      request_path_counts: { ask: 1 },
      request_user_agent_family_counts: { unknown: 1 },
      ask_queries: {},
      apply_clicks_by_card: {},
      apply_clicks_by_card_source: {},
      zero_result_queries: []
    } as never;

    const summary = addEventToDailySummary(
      olderSummary,
      event({
        event_name: "ask_result_rendered",
        received_at: "2026-07-27T04:22:00.000Z",
        query: "best travel card",
        card_ids: ["axis-atlas"],
        metadata: { ask_cache_status: "MISS" }
      })
    );

    expect(summary.total_events).toBe(2);
    expect(summary.hourly_event_counts).toEqual({ "2026-07-27T04:00:00.000Z": 1 });
    expect(summary.ask_cache_status_counts).toEqual({ MISS: 1 });
    expect(summary.bot_like_ask_queries).toEqual([]);
    expect(summary.feedback_events).toEqual([]);
  });

  it("builds last 24 hour hit rows from summary hourly buckets", () => {
    const summary = buildDailySummaryFromEvents("2026-07-27", [
      event({ received_at: "2026-07-27T02:15:00.000Z" }),
      event({ received_at: "2026-07-27T02:45:00.000Z" }),
      event({ received_at: "2026-07-27T03:05:00.000Z" })
    ]);

    const rows = buildLast24HourRowsFromSummaries([summary], new Date("2026-07-27T03:30:00.000Z"));

    expect(rows).toHaveLength(24);
    expect(rows.at(-2)?.count).toBe(2);
    expect(rows.at(-1)?.count).toBe(1);
  });
});
