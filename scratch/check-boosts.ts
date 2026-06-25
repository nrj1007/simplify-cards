import { scoreCards, defaultSpendProfile } from "../lib/recommend";
import { getCardById } from "../lib/cards";

const card = getCardById("indusind-tiger");
if (!card) {
  console.log("Card not found");
  process.exit(1);
}

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
  wantsLifetimeFree: false, // Avoid envelope scoring
  spend: spendProfile
};

// Let's call scoreCards and find the card score object.
// We can also extract the variables by simulating the recommend.ts scoring logic in place.
const scores = scoreCards(input);
const tiger = scores.find((s) => s.card.id === "indusind-tiger");

if (tiger) {
  console.log("=== TIGER SCORING PARAMETERS IN SIMULATION ===");
  console.log("Estimated Net Value:", tiger.estimatedNetValue);
  console.log("Fit Score:", tiger.fitScore);
  console.log("Difference:", tiger.fitScore - tiger.estimatedNetValue);
  
  // Let's print common boosts/penalties that recommendation system computes.
  // We can write code to calculate them using the card properties.
  // 1. Popularity Score component: card.popularityScore * 50
  const popBoost = card.popularityScore * 50;
  console.log("Popularity prior boost (popularityScore * 50):", popBoost);

  // 2. Joining and Renewal value (amortized):
  // Let's check how joining fee is handled. Since Tiger is free, it's 0.
  
  // 3. Let's see if there is any default penalty.
  // Wait, does the card get penalized if it has no lounge access or if wantsLounge/travel intent are checked?
  // Let's check wantsLounge and travel intent. They are false.
  
  // Let's check relationship penalty, milestone boost, forex boost etc.
  // Wait! In recommend.ts, what is the default penalty for cards?
  // Let's look at:
  // const relationshipPenalty = genericRelationshipPenalty(card, input, intent);
  // and other components.
  // Wait! Let's check if the card is penalized for something else!
  // Ah, let's write code that prints all score details from the engine.
}
