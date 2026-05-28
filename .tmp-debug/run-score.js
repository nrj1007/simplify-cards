const { scoreCards } = require('./.tmp-debug/recommend.js');
const results = scoreCards({ query: 'top card under 5000' });
const top = results.slice(0, 20).map((item, index) => ({
  rank: index + 1,
  id: item.card.id,
  name: item.card.name,
  issuer: item.card.issuer,
  joiningFee: item.card.joiningFee,
  annualFee: item.card.annualFee,
  feeWaiverSpend: item.card.feeWaiverSpend,
  fitScore: Math.round(item.fitScore),
  estimatedAnnualRewards: item.estimatedAnnualRewards,
  estimatedMilestoneValue: item.estimatedMilestoneValue,
  estimatedAnnualFee: item.estimatedAnnualFee,
  estimatedNetValue: item.estimatedNetValue,
  reasons: item.reasons.slice(0,5)
}));
console.log(JSON.stringify({ count: results.length, top }, null, 2));
