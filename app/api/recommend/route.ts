import { NextResponse } from "next/server";
import { scoreCards, applyResultStrategy } from "@/lib/recommend";
import { SPEND_CATEGORIES, rankResults, toRecommendResult } from "@/lib/recommend-result";
import type { ResultStrategyName } from "@/lib/result-strategies";
import type { RankingStrategyName } from "@/lib/ranking-strategies";
import type { SpendProfile } from "@/lib/types";

const MAX_MONTHLY_SPEND = 10_000_000; // Rs 1 crore/month clamp to guard against abuse.

const RESULT_STRATEGY_NAMES = new Set<ResultStrategyName>(["single-list", "reward-type-split"]);
const RANKING_STRATEGY_NAMES = new Set<RankingStrategyName>(["absolute-blend", "max-yield"]);

type RecommendRequestBody = {
  spend?: Record<string, unknown>;
  maxAnnualFee?: unknown;
  wantsLounge?: unknown;
  wantsLifetimeFree?: unknown;
  resultStrategy?: unknown;
  rankingStrategy?: unknown;
};

function sanitizeSpend(raw: Record<string, unknown> | undefined): SpendProfile {
  const spend: SpendProfile = {};
  if (!raw || typeof raw !== "object") return spend;
  for (const category of SPEND_CATEGORIES) {
    if (raw[category] === undefined) continue;
    const value = Number(raw[category]);
    if (Number.isFinite(value) && value >= 0) {
      // Preserve explicit zeros: the client sends all categories, and a 0 must
      // override the engine's default spend profile rather than fall back to it.
      spend[category] = Math.min(Math.round(value), MAX_MONTHLY_SPEND);
    }
  }
  return spend;
}

export async function POST(request: Request) {
  let body: RecommendRequestBody;
  try {
    body = (await request.json()) as RecommendRequestBody;
  } catch {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  const wantsLifetimeFree = body.wantsLifetimeFree === true;
  const rawMaxFee = body.maxAnnualFee == null || body.maxAnnualFee === "" ? NaN : Number(body.maxAnnualFee);
  const maxAnnualFee =
    !wantsLifetimeFree && Number.isFinite(rawMaxFee) && rawMaxFee >= 0 ? rawMaxFee : undefined;

  const resultStrategy =
    typeof body.resultStrategy === "string" && RESULT_STRATEGY_NAMES.has(body.resultStrategy as ResultStrategyName)
      ? (body.resultStrategy as ResultStrategyName)
      : undefined;

  const rankingStrategy =
    typeof body.rankingStrategy === "string" && RANKING_STRATEGY_NAMES.has(body.rankingStrategy as RankingStrategyName)
      ? (body.rankingStrategy as RankingStrategyName)
      : undefined;

  const input = {
    spend: sanitizeSpend(body.spend),
    maxAnnualFee,
    wantsLounge: body.wantsLounge === true,
    wantsLifetimeFree,
    resultStrategy,
    rankingStrategy
  };

  const scored = scoreCards(input);

  // When a result strategy is requested, return grouped sections; otherwise keep the
  // flat `results` shape for backwards compatibility.
  if (resultStrategy === "reward-type-split") {
    const sections = applyResultStrategy(scored, input).map((section) => ({
      title: section.title,
      results: section.cards.map(toRecommendResult)
    }));
    return NextResponse.json({ sections });
  }

  return NextResponse.json({ results: rankResults(scored) });
}
