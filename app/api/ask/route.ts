import { NextResponse } from "next/server";
import { answerQuestion, buildFallbackSummary, getAskResultCacheStatus } from "@/lib/ask-ai";
import { buildAskResultMetadata } from "@/lib/analytics-events";
import { logAnalyticsEvent } from "@/lib/analytics-logs";
import { answerFromCards } from "@/lib/recommend";
import type { RecommendationInput } from "@/lib/types";

async function logAskEvents(input: RecommendationInput, result: Awaited<ReturnType<typeof answerQuestion>>) {
  const query = input.query?.trim();
  if (!query) return;

  await logAnalyticsEvent({
    event_name: "ask_query_submitted",
    page: "ask",
    source: "ask",
    query
  });
  await logAnalyticsEvent({
    event_name: "ask_result_rendered",
    page: "ask",
    source: "ask",
    query,
    card_ids: result.cards.map((item) => item.card.id),
    metadata: buildAskResultMetadata(result)
  });
}

export async function POST(request: Request) {
  let input: RecommendationInput = { query: "" };
  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      input = body as RecommendationInput;
    }
  } catch (parseError) {
    console.error("Failed to parse POST body in /api/ask:", parseError);
  }

  try {
    const result = await answerQuestion(input);
    await logAskEvents(input, result);
    return NextResponse.json(result, {
      headers: {
        "X-Ask-Cache": getAskResultCacheStatus(result) ?? "SKIP"
      }
    });
  } catch (error) {
    console.error("Error in /api/ask route handler:", error);

    try {
      const baseAnswer = answerFromCards(input);
      let summary = "";
      try {
        summary = buildFallbackSummary(input, baseAnswer.cards);
      } catch (fallbackSummaryError) {
        summary = "I encountered an error processing your query, but here are the closest matches from our verified database.";
      }
      return NextResponse.json({
        ...baseAnswer,
        summary,
        highlights: ["Database fallback (AI offline)"],
        meta: {
          intent: "unsupported",
          intentLabel: "Database fallback",
          confidence: "low",
          confidenceLabel: "Low",
          needsFollowUp: true,
        }
      });
    } catch (fallbackError) {
      console.error("Double failure in /api/ask route handler fallback:", fallbackError);
      return NextResponse.json({
        cards: [],
        summary: "I encountered an issue. Please try again later.",
        highlights: [],
        meta: {
          intent: "unsupported",
          intentLabel: "No confident match",
          confidence: "low",
          confidenceLabel: "Low",
          needsFollowUp: true,
        }
      });
    }
  }
}
