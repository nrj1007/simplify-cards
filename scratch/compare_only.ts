import { scoreCards } from "../lib/recommend";

const targetIds = ["hdfc-infinia-metal", "axis-magnus-burgundy"];
const query = "infinia vs burgundy magnus";

const scores = scoreCards({ query });
const targets = scores.filter(s => targetIds.includes(s.card.id));

targets.forEach(item => {
  console.log(`======================================`);
  console.log(`Card: ${item.card.name} (${item.card.id})`);
  console.log(`Rank: ${scores.findIndex(s => s.card.id === item.card.id) + 1} / ${scores.length}`);
  console.log(`Fit Score: ${item.fitScore}`);
  console.log(`Annual Spend: ${item.annualSpend}`);
  console.log(`Estimated Annual Rewards: ${item.estimatedAnnualRewards}`);
  console.log(`Estimated Milestone Value: ${item.estimatedMilestoneValue}`);
  console.log(`Estimated Annual Fee: ${item.estimatedAnnualFee}`);
  console.log(`Estimated Net Value: ${item.estimatedNetValue}`);
  console.log(`Reasons:`);
  item.reasons.forEach(r => console.log(`  - ${r}`));
  console.log(`Reward Breakdown:`);
  item.rewardBreakdown.forEach(rb => {
    console.log(`  - Category: ${rb.spendCategory}, Monthly Spend: ${rb.monthlySpend}, Reward Category: ${rb.rewardCategory}, Monthly Reward: ${rb.monthlyReward}, Annual Reward: ${rb.annualReward}`);
  });
  console.log(`======================================\n`);
});
