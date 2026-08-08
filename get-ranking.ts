import { scoreCards } from './lib/recommend';
const scored = scoreCards({ query: "Which card best for movie tickets?" });
console.log("Top 15 Ranked Cards for 'Which card best for movie tickets?':");
scored.slice(0, 15).forEach((c, i) => {
  const normScore = c.envelopeScoring?.normalizedFitScore ?? c.fitScore;
  console.log(`${i + 1}. ${c.card.name} (ID: ${c.card.id}) - Normalized Score: ${normScore.toFixed(2)}`);
});
