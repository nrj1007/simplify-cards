import { scoreCards } from "../lib/recommend";

const input = { query: "best lifetime free cards", wantsLifetimeFree: true };
const results = scoreCards(input);

const jupiter = results.find((r) => r.card.id === "csb-jupiter-edge-plus");
const tiger = results.find((r) => r.card.id === "indusind-tiger");

console.log("=== COMPARISON DETAILS ===");
if (jupiter) {
  console.log("\n--- JUPITER ---");
  console.log(`Fit Score: ${jupiter.fitScore}`);
  console.log(`Estimated Net Value: ${jupiter.estimatedNetValue}`);
  console.log(`Blended Fit Score (envelope): ${jupiter.envelopeScoring?.normalizedFitScore}`);
  console.log(`Annual Fee: ${jupiter.card.annualFee}`);
  console.log(`Popularity: ${jupiter.card.popularityScore}`);
  console.log(`Reasons:`, jupiter.reasons);
} else {
  console.log("Jupiter not found in results!");
}

if (tiger) {
  console.log("\n--- TIGER ---");
  console.log(`Fit Score: ${tiger.fitScore}`);
  console.log(`Estimated Net Value: ${tiger.estimatedNetValue}`);
  console.log(`Blended Fit Score (envelope): ${tiger.envelopeScoring?.normalizedFitScore}`);
  console.log(`Annual Fee: ${tiger.card.annualFee}`);
  console.log(`Popularity: ${tiger.card.popularityScore}`);
  console.log(`Reasons:`, tiger.reasons);
} else {
  console.log("Tiger not found in results!");
}
