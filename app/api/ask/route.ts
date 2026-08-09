import { NextResponse } from "next/server";
import {
  answerQuestion,
  buildFallbackSummary,
  getAskResultCacheStatus,
  resolveDirectCardDetailQuery,
  type AskAiResult
} from "@/lib/ask-ai";
import { buildAskResultMetadata } from "@/lib/analytics-events";
import { answerFromCards } from "@/lib/recommend";
import type { RecommendationInput } from "@/lib/types";

function resultResponse(result: AskAiResult) {
  return NextResponse.json(
    {
      ...result,
      analyticsMetadata: buildAskResultMetadata(result)
    },
    {
      headers: {
        "X-Ask-Cache": getAskResultCacheStatus(result) ?? "SKIP"
      }
    }
  );
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
    const directCardId = resolveDirectCardDetailQuery(input);
    if (directCardId) {
      return NextResponse.json(
        { directCardId },
        { headers: { "X-Ask-Cache": "SKIP" } }
      );
    }

    const result = await answerQuestion(input);
    return resultResponse(result);
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
      return resultResponse({
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
      return resultResponse({
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
