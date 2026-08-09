import { NextResponse } from "next/server";
import {
  answerQuestion,
  buildFallbackSummary,
  getAskResultCacheStatus,
  resolveDirectCardDetailQuery,
  setAskResultCacheStatus,
  type AskAiResult
} from "@/lib/ask-ai";
import { askCacheKey, getAskCache, setAskCache } from "@/lib/ask-cache";
import { checkAskRateLimit } from "@/lib/ask-rate-limit";
import { buildAskResultMetadata } from "@/lib/analytics-events";
import { answerFromCards } from "@/lib/recommend";
import type { RecommendationInput } from "@/lib/types";

const ASK_API_CACHE_SCOPE = "api-ask-response-v1";

function normalizeCacheString(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeAskApiCacheInput(input: RecommendationInput) {
  return {
    query: normalizeCacheString(input.query ?? ""),
    maxAnnualFee: input.maxAnnualFee ?? null,
    wantsLounge: input.wantsLounge ?? null,
    wantsLifetimeFree: input.wantsLifetimeFree ?? null,
    rankingStrategy: input.rankingStrategy ?? null,
    resultStrategy: input.resultStrategy ?? null,
    spend: input.spend ?? null
  };
}

function buildAskApiCacheKey(input: RecommendationInput) {
  return askCacheKey({
    scope: ASK_API_CACHE_SCOPE,
    input: normalizeAskApiCacheInput(input)
  });
}

function canUseAskApiCache(input: RecommendationInput) {
  if (input.previousQuery || input.contextCardIds?.length) return false;
  return Boolean(normalizeCacheString(input.query ?? ""));
}

function isCacheableAskApiResult(input: RecommendationInput, result: AskAiResult) {
  if (!canUseAskApiCache(input)) return false;
  if (result.needsDatabaseUpdate || result.meta?.intent === "unsupported") return false;
  return result.cards.length > 0;
}

function rateLimitedResponse(result: Exclude<ReturnType<typeof checkAskRateLimit>, { allowed: true }>) {
  return NextResponse.json(
    {
      error: "Ask rate limit exceeded",
      reason: result.reason,
      limit: result.limit,
      retryAfterSeconds: result.retryAfterSeconds
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfterSeconds),
        "X-Ask-Cache": "SKIP",
        "X-Ask-Rate-Limit": result.reason
      }
    }
  );
}

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
    const rateLimit = checkAskRateLimit(request, input);
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit);

    const directCardId = resolveDirectCardDetailQuery(input);
    if (directCardId) {
      return NextResponse.json(
        { directCardId },
        { headers: { "X-Ask-Cache": "SKIP" } }
      );
    }

    const apiCacheKey = canUseAskApiCache(input) ? buildAskApiCacheKey(input) : null;
    if (apiCacheKey) {
      const cached = getAskCache(apiCacheKey);
      if (cached) return resultResponse(setAskResultCacheStatus(cached, "HIT"));
    }

    const result = await answerQuestion(input);
    if (apiCacheKey && isCacheableAskApiResult(input, result)) setAskCache(apiCacheKey, result);
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
