import { getCardById } from "../lib/cards";
import { scoreCards } from "../lib/recommend";

const levels = [300000, 1000000, 2000000, 3000000];
const ids = ["hdfc-diners-club-privilege", "equitas-powermiles"];

for (const annual of levels) {
  const monthly = annual / 12;
  const spend = {
    online: monthly * 0.30, dining: monthly * 0.10, travel: monthly * 0.15,
    grocery: monthly * 0.15, fuel: monthly * 0.05, utilities: monthly * 0.05,
    base: monthly * 0.20,
  };
  const scores = scoreCards({ spend });
  console.log(`\n=== Annual ${annual} (Rs ${Math.round(monthly)}/mo) ===`);
  for (const id of ids) {
    const s = scores.find((x) => x.card.id === id)!;
    console.log(
      `${id.padEnd(28)} rewards=${Math.round(s.estimatedAnnualRewards).toString().padStart(7)} ` +
      `milestone=${Math.round(s.estimatedMilestoneValue).toString().padStart(6)} ` +
      `fee=${Math.round(s.estimatedAnnualFee).toString().padStart(6)} ` +
      `net=${Math.round(s.estimatedNetValue).toString().padStart(7)}`
    );
  }
}

// overall envelope rank
const top = scoreCards({ query: "top 30 credit cards" });
for (const id of ids) {
  const idx = top.findIndex((x) => x.card.id === id);
  const c = getCardById(id)!;
  console.log(`\n${id}: rank #${idx + 1}, fee=${c.annualFee}, feeWaiver=${c.feeWaiverSpend}`);
}
