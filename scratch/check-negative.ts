import { scoreCards, defaultSpendProfile } from "../lib/recommend";
import { getCardById } from "../lib/cards";

const card = getCardById("indusind-tiger");
if (!card) {
  console.log("Card not found");
  process.exit(1);
}

// We will replicate the simulation of Level 1 from our previous run
const annualSpend = 300000;
const monthlyTotal = Math.round(annualSpend / 12);

const scaleSpend = (profile: typeof defaultSpendProfile, target: number) => {
  const sum = Object.values(profile).reduce((s, a) => s + (a ?? 0), 0);
  return Object.fromEntries(
    Object.entries(profile).map(([k, v]) => [k, Math.round((v / sum) * target)])
  );
};
const spendProfile = scaleSpend(defaultSpendProfile, monthlyTotal);

const input = {
  wantsLifetimeFree: true,
  spend: spendProfile
};

// We run scoreCards with wantsLifetimeFree: true and spend.
// Let's see how recommend.ts scores the card internally.
// We can simulate the individual boosts of recommend.ts since they are derived from card and input/intent.
// Let's print the scores returned by scoreCards for Tiger.
const scores = scoreCards(input);
const tiger = scores.find((s) => s.card.id === "indusind-tiger");

if (tiger) {
  console.log("=== TIGER LEVEL 1 DETAILED METRICS ===");
  console.log(`Estimated Net Value: ${tiger.estimatedNetValue}`);
  console.log(`Fit Score: ${tiger.fitScore}`);
  console.log(`Difference (Shared Boosts + Relevance): ${tiger.fitScore - tiger.estimatedNetValue}`);
  console.log("Card Popularity Score:", tiger.card.popularityScore);
} else {
  console.log("Not found");
}
