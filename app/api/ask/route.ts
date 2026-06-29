import { NextResponse } from "next/server";
import { answerQuestion, buildFallbackSummary } from "@/lib/ask-ai";
import { answerFromCards } from "@/lib/recommend";
import type { RecommendationInput } from "@/lib/types";

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
    return NextResponse.json(result);
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
