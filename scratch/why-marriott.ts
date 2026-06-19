import { getCardById } from "../lib/cards";
import { scoreCards } from "../lib/recommend";

const top = scoreCards({ query: "top 40 credit cards" });
const idx = top.findIndex((x) => x.card.id === "hdfc-marriott-bonvoy");
console.log("Marriott Bonvoy rank:", idx + 1);

const c = getCardById("hdfc-marriott-bonvoy")!;
console.log("fee:", c.annualFee, "waiver:", c.feeWaiverSpend, "rewardType:", c.rewardType,
  "liquidity:", c.rewardLiquidity, c.rewardLiquidityFactor ?? "");
console.log("rewards:", c.rewards.map(r => `${r.category}:${r.rate}${r.capMonthly?`(cap${r.capMonthly})`:""}`).join("  "));
console.log("redemption:", JSON.stringify(c.redemption));
console.log("milestones:", JSON.stringify(c.milestones));

const levels = [300000, 1000000, 2000000, 3000000];
const cmp = ["hdfc-marriott-bonvoy", "equitas-powermiles", "hdfc-diners-club-privilege"];
for (const annual of levels) {
  const monthly = annual / 12;
  const spend = { online: monthly*0.30, dining: monthly*0.10, travel: monthly*0.15,
    grocery: monthly*0.15, fuel: monthly*0.05, utilities: monthly*0.05, base: monthly*0.20 };
  const scores = scoreCards({ spend });
  console.log(`\n=== ${annual} (Rs ${Math.round(monthly)}/mo) ===`);
  for (const id of cmp) {
    const s = scores.find(x => x.card.id === id)!;
    console.log(`${id.padEnd(28)} rewards=${Math.round(s.estimatedAnnualRewards).toString().padStart(7)} mile=${Math.round(s.estimatedMilestoneValue).toString().padStart(6)} fee=${Math.round(s.estimatedAnnualFee).toString().padStart(5)} net=${Math.round(s.estimatedNetValue).toString().padStart(7)}`);
  }
}
