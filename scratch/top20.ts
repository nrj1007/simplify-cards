import { scoreCards } from "../lib/recommend";

const scores = scoreCards({ query: "top 20 credit cards" });
scores.slice(0, 20).forEach((s, i) => {
  const env = s.envelopeScoring;
  console.log(
    `${String(i + 1).padStart(2)}. ${s.card.name.padEnd(42)} ` +
    `(${s.card.id})`
  );
});
