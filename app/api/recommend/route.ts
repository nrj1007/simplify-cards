import { NextResponse } from "next/server";
import { scoreCards, applyResultStrategy } from "@/lib/recommend";
import { SPEND_CATEGORIES, rankResults, toRecommendResult } from "@/lib/recommend-result";
import type { ResultStrategyName } from "@/lib/result-strategies";
import type { SpendProfile } from "@/lib/types";

const MAX_MONTHLY_SPEND = 10_000_000; // ₹1 crore/month clamp to guard against abuse.

const RESULT_STRATEGY_NAMES = new Set<ResultStrategyName>(["single-list", "reward-type-split"]);

type RecommendRequestBody = {
  spend?: Record<string, unknown>;
  maxAnnualFee?: unknown;
  wantsLounge?: unknown;
  wantsLifetimeFree?: unknown;
  resultStrategy?: unknown;
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
  let minAnnualFee: number | undefined = undefined;
  let maxAnnualFee: number | undefined = undefined;

  if (!wantsLifetimeFree && body.maxAnnualFee != null && body.maxAnnualFee !== "") {
    const feeStr = String(body.maxAnnualFee);
    if (feeStr === "0") {
      minAnnualFee = 0;
      maxAnnualFee = 0;
    } else if (feeStr === "1-1000") {
      minAnnualFee = 1;
      maxAnnualFee = 1000;
    } else if (feeStr === "1001-5000") {
      minAnnualFee = 1001;
      maxAnnualFee = 5000;
    } else if (feeStr === "5001-10000") {
      minAnnualFee = 5001;
      maxAnnualFee = 10000;
    } else if (feeStr === "10001-plus") {
      minAnnualFee = 10001;
    } else {
      const parsedNum = Number(body.maxAnnualFee);
      if (Number.isFinite(parsedNum) && parsedNum >= 0) {
        maxAnnualFee = parsedNum;
      }
    }
  }

  const resultStrategy =
    typeof body.resultStrategy === "string" && RESULT_STRATEGY_NAMES.has(body.resultStrategy as ResultStrategyName)
      ? (body.resultStrategy as ResultStrategyName)
      : undefined;

  const input = {
    spend: sanitizeSpend(body.spend),
    maxAnnualFee,
    minAnnualFee,
    wantsLounge: body.wantsLounge === true,
    wantsLifetimeFree,
    resultStrategy
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
