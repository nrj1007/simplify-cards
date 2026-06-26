import { scoreCards } from "../lib/recommend";
import { getCardById } from "../lib/cards";

function printUsage() {
  console.log("Usage: npx tsx scripts/compare-card-scores.ts <card-id-1> <card-id-2> [query] [--ltf] [--lounge]");
  console.log("Example: npx tsx scripts/compare-card-scores.ts sc-ultimate hdfc-diners-club-black-metal");
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const id1 = args[0];
  const id2 = args[1];
  
  const card1 = getCardById(id1);
  const card2 = getCardById(id2);
  
  if (!card1) {
    console.error(`Error: Card "${id1}" not found in verified dataset.`);
    process.exit(1);
  }
  if (!card2) {
    console.error(`Error: Card "${id2}" not found in verified dataset.`);
    process.exit(1);
  }

  // Parse remaining arguments
  let query = "";
  let wantsLifetimeFree = false;
  let wantsLounge = false;

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--ltf") {
      wantsLifetimeFree = true;
    } else if (arg === "--lounge") {
      wantsLounge = true;
    } else if (!arg.startsWith("-")) {
      query = arg;
    }
  }

  const scores = scoreCards({
    query,
    wantsLifetimeFree,
    wantsLounge
  });

  const score1 = scores.find((s) => s.card.id === id1);
  const score2 = scores.find((s) => s.card.id === id2);

  console.log(`\n================================================================================`);
  console.log(`SCORE COMPARISON: ${card1.name} vs ${card2.name}`);
  console.log(`================================================================================`);
  
  if (!score1) console.log(`⚠️ Card "${id1}" was FILTERED OUT of the candidate pool.`);
  if (!score2) console.log(`⚠️ Card "${id2}" was FILTERED OUT of the candidate pool.`);
  if (!score1 || !score2) process.exit(0);

  const debug1 = score1.debug!;
  const debug2 = score2.debug!;

  console.log(
    String("Metric").padEnd(30) + " | " +
    card1.name.substring(0, 22).padEnd(22) + " | " +
    card2.name.substring(0, 22).padEnd(22)
  );
  console.log("-".repeat(80));
  
  console.log(String("Final Fit Score (★)").padEnd(30) + " | " + String(score1.fitScore).padEnd(22) + " | " + String(score2.fitScore).padEnd(22));
  console.log(String("Estimated Net Yearly Value").padEnd(30) + " | " + `Rs ${score1.estimatedNetValue.toLocaleString("en-IN")}`.padEnd(22) + " | " + `Rs ${score2.estimatedNetValue.toLocaleString("en-IN")}`.padEnd(22));
  console.log(String("  (+) Est. Annual Rewards").padEnd(30) + " | " + `Rs ${score1.estimatedAnnualRewards.toLocaleString("en-IN")}`.padEnd(22) + " | " + `Rs ${score2.estimatedAnnualRewards.toLocaleString("en-IN")}`.padEnd(22));
  console.log(String("  (+) Milestone Value").padEnd(30) + " | " + `Rs ${score1.estimatedMilestoneValue.toLocaleString("en-IN")}`.padEnd(22) + " | " + `Rs ${score2.estimatedMilestoneValue.toLocaleString("en-IN")}`.padEnd(22));
  console.log(String("  (-) Net Annual Fee").padEnd(30) + " | " + `Rs ${score1.estimatedAnnualFee.toLocaleString("en-IN")}`.padEnd(22) + " | " + `Rs ${score2.estimatedAnnualFee.toLocaleString("en-IN")}`.padEnd(22));
  console.log("-".repeat(80));
  console.log(String("Total Shared Boosts").padEnd(30) + " | " + String(debug1.sharedBoosts).padEnd(22) + " | " + String(debug2.sharedBoosts).padEnd(22));
  console.log(String("  - loungeBoost").padEnd(30) + " | " + String(debug1.loungeBoost).padEnd(22) + " | " + String(debug2.loungeBoost).padEnd(22));
  console.log(String("  - forexBoost").padEnd(30) + " | " + String(debug1.forexBoost).padEnd(22) + " | " + String(debug2.forexBoost).padEnd(22));
  console.log(String("  - popularityBoost").padEnd(30) + " | " + String(card1.popularityScore * 50).padEnd(22) + " | " + String(card2.popularityScore * 50).padEnd(22));
  console.log(String("  - flexibilityValue").padEnd(30) + " | " + String(debug1.flexibilityValue).padEnd(22) + " | " + String(debug2.flexibilityValue).padEnd(22));
  console.log(String("  - useCaseBoost").padEnd(30) + " | " + String(debug1.useCaseBoost).padEnd(22) + " | " + String(debug2.useCaseBoost).padEnd(22));
  console.log(String("  - redemptionBoost").padEnd(30) + " | " + String(debug1.redemptionBoost).padEnd(22) + " | " + String(debug2.redemptionBoost).padEnd(22));
  
  console.log(`\n================================================================================`);
}

main().catch(console.error);
