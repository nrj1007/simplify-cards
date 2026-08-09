import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredAnalyticsEvent } from "../lib/analytics";

const blobMocks = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  put: vi.fn()
}));

vi.mock("@vercel/blob", () => blobMocks);

import { readAnalyticsDailySummaries, updateAnalyticsDailySummary } from "../lib/analytics-summary";
import { durableRecordPrefix } from "../lib/durable-records";

function jsonStream(value: unknown) {
  return new Response(JSON.stringify(value)).body;
}

function event(overrides: Partial<StoredAnalyticsEvent> = {}): StoredAnalyticsEvent {
  return {
    event_name: "page_view",
    received_at: "2026-08-09T11:46:39.734Z",
    session_id: "session-1",
    page: "/ask",
    source: "ask",
    device_type: "desktop",
    referrer: "",
    ...overrides
  };
}

describe("analytics daily summary durable storage", () => {
  beforeEach(() => {
    blobMocks.get.mockReset();
    blobMocks.list.mockReset();
    blobMocks.put.mockReset();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("retries a sharded summary write after an ETag conflict", async () => {
    blobMocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce({
      stream: jsonStream({
        schema_version: 2,
        date: "2026-08-09",
        updated_at: "2026-08-09T11:46:38.000Z",
        total_events: 1,
        hourly_event_counts: { "2026-08-09T11:00:00.000Z": 1 },
        event_counts: { page_view: 1 },
        page_counts: { "/ask": 1 },
        source_counts: { ask: 1 },
        device_counts: { desktop: 1 },
        request_path_counts: { "/ask": 1 },
        request_user_agent_family_counts: { unknown: 1 },
        ask_queries: {},
        ask_cache_status_counts: {},
        ask_result_count: 0,
        ask_anonymous_result_count: 0,
        ask_empty_referrer_result_count: 0,
        card_detail_views_by_card: {},
        card_detail_views_by_referrer_host: {},
        card_detail_views_by_traffic_class: {},
        card_detail_views_by_user_agent_family: {},
        card_detail_views_by_country: {},
        detail_clicks_by_card: {},
        detail_clicks_by_card_source: {},
        ask_detail_clicks_by_card: {},
        ask_query_to_card_detail_clicks: {},
        apply_clicks_by_card: {},
        apply_clicks_by_card_source: {},
        feedback_count: 0,
        feedback_with_comment_count: 0,
        feedback_by_value: {},
        feedback_by_source: {},
        feedback_events: [],
        ai_result_count: 0,
        ai_schema_call_count: 0,
        ai_provider_attempt_count: 0,
        ai_successful_schema_call_count: 0,
        ai_failed_schema_call_count: 0,
        ai_fallback_result_count: 0,
        ai_calls_by_purpose: {},
        ai_provider_attempts: {},
        ai_results_by_intent: {},
        zero_result_queries: [],
        bot_like_ask_queries: []
      }),
      blob: { etag: "etag-2" }
    });
    blobMocks.put.mockRejectedValueOnce(new Error("Vercel Blob: Precondition failed: ETag mismatch.")).mockResolvedValueOnce({});

    await updateAnalyticsDailySummary(event());

    expect(blobMocks.put).toHaveBeenCalledTimes(2);
    expect(blobMocks.put.mock.calls[0][0]).toMatch(/^simplifycards\/v1\/analytics-daily\/2026-08-09\/[0-9a-f]{2}\.json$/);
    expect(blobMocks.put.mock.calls[0][2]).toMatchObject({ allowOverwrite: false });
    expect(blobMocks.put.mock.calls[1][2]).toMatchObject({ ifMatch: "etag-2" });
    expect(JSON.parse(String(blobMocks.put.mock.calls[1][1]))).toMatchObject({
      date: "2026-08-09",
      total_events: 2,
      event_counts: { page_view: 2 }
    });
  });

  it("reads daily summary shards by date prefix", async () => {
    blobMocks.list.mockResolvedValue({
      blobs: [
        { pathname: `${durableRecordPrefix("analytics-daily")}2026-08-09.json`, uploadedAt: new Date("2026-08-09T10:00:00.000Z") },
        { pathname: `${durableRecordPrefix("analytics-daily")}2026-08-09/00.json`, uploadedAt: new Date("2026-08-09T11:00:00.000Z") }
      ],
      hasMore: false
    });
    blobMocks.get.mockImplementation(async (pathname: string) => ({
      stream: jsonStream({
        ...event(),
        schema_version: 2,
        date: "2026-08-09",
        updated_at: "2026-08-09T11:00:00.000Z",
        total_events: pathname.endsWith("/00.json") ? 2 : 1,
        hourly_event_counts: {},
        event_counts: {},
        page_counts: {},
        source_counts: {},
        device_counts: {},
        request_path_counts: {},
        request_user_agent_family_counts: {},
        ask_queries: {},
        ask_cache_status_counts: {},
        ask_result_count: 0,
        ask_anonymous_result_count: 0,
        ask_empty_referrer_result_count: 0,
        card_detail_views_by_card: {},
        card_detail_views_by_referrer_host: {},
        card_detail_views_by_traffic_class: {},
        card_detail_views_by_user_agent_family: {},
        card_detail_views_by_country: {},
        detail_clicks_by_card: {},
        detail_clicks_by_card_source: {},
        ask_detail_clicks_by_card: {},
        ask_query_to_card_detail_clicks: {},
        apply_clicks_by_card: {},
        apply_clicks_by_card_source: {},
        feedback_count: 0,
        feedback_with_comment_count: 0,
        feedback_by_value: {},
        feedback_by_source: {},
        feedback_events: [],
        ai_result_count: 0,
        ai_schema_call_count: 0,
        ai_provider_attempt_count: 0,
        ai_successful_schema_call_count: 0,
        ai_failed_schema_call_count: 0,
        ai_fallback_result_count: 0,
        ai_calls_by_purpose: {},
        ai_provider_attempts: {},
        ai_results_by_intent: {},
        zero_result_queries: [],
        bot_like_ask_queries: []
      })
    }));

    await expect(readAnalyticsDailySummaries(["2026-08-09"])).resolves.toHaveLength(2);
    expect(blobMocks.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: `${durableRecordPrefix("analytics-daily")}2026-08-09` }));
  });
});
