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
        event_name: "card_detail_viewed",
        page: "cards/[id]",
        source: "details",
        card_id: "hdfc-infinia-metal",
        metadata: {
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
        event_name: "ask_result_rendered",
        query: "unknown card",
        card_ids: [],
        metadata: { intent: "unsupported" }
      }),
      event({
        event_name: "ask_result_rendered",
        session_id: "anonymous",
        query: "Is the Smart Credit Card a good fit for me? with spend rs 75k+ for travel with spend rs 25k-75k for low annual fee",
        card_ids: ["sc-smart"],
        metadata: {
          intent: "best-fit",
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

    expect(summary.total_events).toBe(8);
    expect(summary.ask_queries).toEqual({ "best upi cards": 2 });
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
    expect(summary.zero_result_queries).toHaveLength(1);
    expect(summary.ai_result_count).toBe(1);
    expect(summary.ai_provider_attempt_count).toBe(2);
    expect(summary.ai_failed_schema_call_count).toBe(1);
    expect(summary.ai_fallback_result_count).toBe(1);
    expect(summary.ai_calls_by_purpose).toEqual({ answer_summary: 1 });
    expect(summary.ai_provider_attempts).toEqual({ gemini: 1, openai: 1 });
    expect(summary.bot_like_ask_queries).toHaveLength(1);
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
      })
    ]);

    const review = mergeDailySummaries([summary], ["2026-07-27"], ["2026-07-27"]);

    expect(review.eventsLoaded).toBe(8);
    expect(review.last30DayEvents).toBe(8);
    expect(review.topAskQueries).toEqual([{ label: "best cashback card", count: 1 }]);
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
    expect(review.dailyUsageRows).toEqual([{ date: "2026-07-27", count: 8 }]);
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
    expect(review.askSignals).toEqual({
      resultCount: 1,
      anonymousResultCount: 1,
      emptyReferrerResultCount: 1,
      botLikeQueryCount: 1
    });
    expect(review.botLikeAskQueries).toHaveLength(1);
  });
});
