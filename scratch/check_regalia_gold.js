const { scoreCards } = require('../lib/recommend');

const scores = scoreCards({
  query: "top card under 5000"
});

const regaliaGold = scores.find((score) => score.card.id === "hdfc-regalia-gold");
if (regaliaGold) {
  console.log('Regalia Gold found:');
  console.log('estimatedMilestoneValue:', regaliaGold.estimatedMilestoneValue);
  console.log('estimatedAnnualRewards:', regaliaGold.estimatedAnnualRewards);
  console.log('estimatedNetValue:', regaliaGold.estimatedNetValue);
  console.log('envelopeScoring:', JSON.stringify(regaliaGold.envelopeScoring, null, 2));
} else {
  console.log('Regalia Gold not found');
}
