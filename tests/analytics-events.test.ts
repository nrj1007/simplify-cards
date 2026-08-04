import { describe, expect, it } from "vitest";
import { buildAskResultMetadata, buildRecommendationMetadata } from "../lib/analytics-events";
import type { AskAiResult } from "../lib/ask-ai";
import type { RecommendResult } from "../lib/types";

describe("analytics event payload builders", () => {
  it("builds ask result metadata with intent and ranking info", () => {
    const result = {
      summary: "Top 3 picks for this query.",
      cards: [
        {
          card: { id: "sbi-cashback" }
        }
      ],
      meta: {
        intent: "top-cards",
        intentLabel: "Mixed recommendation",
        confidence: "medium-high",
        confidenceLabel: "Medium-high",
        needsFollowUp: true,
        ai: {
          aiUsed: true,
          providersUsed: ["gemini"],
          fallbackUsed: false,
          calls: [
            {
              purpose: "top_cards_summary",
              schema_name: "grounded_top_cards_answer",
              primary_provider: "gemini",
              provider_used: "gemini",
              fallback_provider: null,
              fallback_used: false,
              success: true,
              primary_model: "gemini-2.0-flash",
              fallback_model: null
            }
          ]
        }
      },
      needsDatabaseUpdate: false,
      displayMode: "ranked-list"
    } as unknown as AskAiResult;

    expect(buildAskResultMetadata(result)).toEqual({
      intent: "top-cards",
      confidence: "medium-high",
      result_count: 1,
      top_card_id: "sbi-cashback",
      needs_database_update: false,
      display_mode: "ranked-list",
      ai_used: true,
      ai_attempted: true,
      ai_schema_call_count: 1,
      ai_provider_attempt_count: 1,
      ai_successful_schema_call_count: 1,
      ai_failed_schema_call_count: 0,
      ai_providers_used: ["gemini"],
      ai_fallback_used: false,
      ai_calls: [
        {
          purpose: "top_cards_summary",
          schema_name: "grounded_top_cards_answer",
          primary_provider: "gemini",
          provider_used: "gemini",
          fallback_provider: null,
          fallback_used: false,
          success: true,
          primary_model: "gemini-2.0-flash",
          fallback_model: null
        }
      ]
    });
  });

  it("builds recommendation metadata with top three ids and spend summary", () => {
    const results = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
      { id: "d" }
    ] as RecommendResult[];

    expect(
      buildRecommendationMetadata(
        { dining: 5000, online: 10000, base: 0 },
        "5000",
        true,
        false,
        results
      )
    ).toEqual({
      max_annual_fee: 5000,
      wants_lounge: true,
      wants_lifetime_free: false,
      spend_summary: {
        dining: 5000,
        online: 10000
      },
      top_3_card_ids: ["a", "b", "c"]
    });
  });
});
