import { NextResponse } from "next/server";
import { scoreCards } from "@/lib/recommend";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? "top cards under 5000";
  const maxAnnualFeeParam = url.searchParams.get("maxAnnualFee");
  const maxAnnualFee = maxAnnualFeeParam ? Number(maxAnnualFeeParam) : undefined;

  const scores = scoreCards({
    query,
    maxAnnualFee: maxAnnualFee !== undefined && !Number.isNaN(maxAnnualFee) ? maxAnnualFee : undefined
  });

  return NextResponse.json({
    query,
    count: scores.length,
    ranking: scores.map((item, index) => ({
      rank: index + 1,
      id: item.card.id,
      name: item.card.name,
      issuer: item.card.issuer,
      fitScore: Math.round(item.fitScore * 100) / 100,
      estimatedAnnualRewards: Math.round(item.estimatedAnnualRewards * 100) / 100,
      estimatedMilestoneValue: Math.round(item.estimatedMilestoneValue * 100) / 100,
      estimatedAnnualFee: Math.round(item.estimatedAnnualFee * 100) / 100,
      estimatedNetValue: Math.round(item.estimatedNetValue * 100) / 100,
      adjustment: Math.round((item.fitScore - item.estimatedNetValue) * 100) / 100,
      reasons: item.reasons
    }))
  });
}
