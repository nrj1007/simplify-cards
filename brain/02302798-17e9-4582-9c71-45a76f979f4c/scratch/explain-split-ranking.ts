import { scoreCards } from "/Users/neerajm/git/creditCardAI/lib/recommend";

const query = "best premium travel card";
const input = { query, resultStrategy: "reward-type-split" as const };
const scored = scoreCards(input);

const horizon = scored.find(s => s.card.id === "axis-horizon")!;
const regalia = scored.find(s => s.card.id === "hdfc-regalia-gold")!;

console.log("==================================================");
console.log("axis-horizon score reasons:");
horizon.scoreReasons.forEach(r => {
  console.log(`  ${r.code.padEnd(30)}: +${r.value} (${r.label})`);
});
console.log("-----------------------");
console.log("axis-horizon reward breakdown:");
horizon.rewardBreakdown.forEach(b => {
  console.log(`  ${b.spendCategory.padEnd(20)} | spend: ${b.monthlySpend} | rate: ${b.rewardRate} | annual: ${b.annualReward}`);
});

console.log("\n==================================================");
console.log("hdfc-regalia-gold score reasons:");
regalia.scoreReasons.forEach(r => {
  console.log(`  ${r.code.padEnd(30)}: +${r.value} (${r.label})`);
});
console.log("-----------------------");
console.log("hdfc-regalia-gold reward breakdown:");
regalia.rewardBreakdown.forEach(b => {
  console.log(`  ${b.spendCategory.padEnd(20)} | spend: ${b.monthlySpend} | rate: ${b.rewardRate} | annual: ${b.annualReward}`);
});
