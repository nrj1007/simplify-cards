import { NextResponse } from "next/server";
import { scoreCards } from "@/lib/recommend";
import { SPEND_CATEGORIES, rankResults } from "@/lib/recommend-result";
import type { SpendProfile } from "@/lib/types";

const MAX_MONTHLY_SPEND = 10_000_000; // Rs 1 crore/month clamp to guard against abuse.

type RecommendRequestBody = {
  spend?: Record<string, unknown>;
  maxAnnualFee?: unknown;
  wantsLounge?: unknown;
  wantsLifetimeFree?: unknown;
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
  const rawMaxFee = Number(body.maxAnnualFee);
  const maxAnnualFee =
    !wantsLifetimeFree && Number.isFinite(rawMaxFee) && rawMaxFee >= 0 ? rawMaxFee : undefined;

  const scored = scoreCards({
    spend: sanitizeSpend(body.spend),
    maxAnnualFee,
    wantsLounge: body.wantsLounge === true,
    wantsLifetimeFree
  });

  return NextResponse.json({ results: rankResults(scored) });
}
