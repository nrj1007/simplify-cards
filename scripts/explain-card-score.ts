import { scoreCards } from "../lib/recommend";
import { getCardById } from "../lib/cards";

function printUsage() {
  console.log("Usage: npx tsx scripts/explain-card-score.ts <card-id> [query] [--ltf] [--lounge]");
  console.log("Example: npx tsx scripts/explain-card-score.ts csb-jupiter-edge-plus \"best upi card\"");
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const cardId = args[0];
  const card = getCardById(cardId);
  if (!card) {
    console.error(`Error: Card "${cardId}" not found in verified dataset.`);
    process.exit(1);
  }

  // Parse remaining arguments
  let query = "";
  let wantsLifetimeFree = false;
  let wantsLounge = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--ltf") {
      wantsLifetimeFree = true;
    } else if (arg === "--lounge") {
      wantsLounge = true;
    } else if (!arg.startsWith("-")) {
      query = arg;
    }
  }

  console.log(`\n=============================================================`);
  console.log(`SCORING BREAKDOWN FOR CARD: ${card.name} (${card.id})`);
  console.log(`=============================================================`);
  console.log(`Issuer:        ${card.issuer}`);
  console.log(`Network:       ${card.network.join(", ")}`);
  console.log(`Annual Fee:    Rs ${card.annualFee}`);
  console.log(`Popularity:    ${card.popularityScore}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`Input query:             "${query}"`);
  console.log(`wantsLifetimeFree:       ${wantsLifetimeFree}`);
  console.log(`wantsLounge:             ${wantsLounge}`);

  // Run the recommender scoring
  const scores = scoreCards({
    query,
    wantsLifetimeFree,
    wantsLounge
  });

  const cardScore = scores.find((s) => s.card.id === cardId);
  if (!cardScore) {
    console.log("\n❌ Card was FILTERED OUT and did not make the candidate pool!");
    console.log("Possible reasons for exclusion:");
    if (wantsLifetimeFree && (card.annualFee > 0 || card.joiningFee > 0)) {
      console.log("- Card has a non-zero annual/joining fee, but query requested Lifetime Free.");
    }
    const hasRelationship = [
      "invite only", "relationship", "pioneer", "burgundy", "privy", 
      "wealth", "client", "customer only", "account holders", "by invitation", "approval required"
    ].some((token) => {
      const haystack = [card.name, ...card.bestFor, ...card.tags, ...card.exclusions].join(" ").toLowerCase();
      return haystack.includes(token);
    });
    if (wantsLifetimeFree && hasRelationship) {
      console.log("- Card requires a private relationship / is invite-only, which is excluded from LTF candidates.");
    }
    process.exit(0);
  }

  // print Spend Profile
  console.log(`\n--- MODELED ANNUAL SPEND PROFILE ---`);
  console.log(`Total Spend: Rs ${cardScore.annualSpend.toLocaleString("en-IN")} / year (Rs ${Math.round(cardScore.annualSpend/12).toLocaleString("en-IN")} / month)`);
  
  // Print reward breakdown by category
  console.log(`\n--- CATEGORY REWARD BREAKDOWN ---`);
  console.log(
    String("Category").padEnd(15) + " | " + 
    String("Monthly Spend").padEnd(13) + " | " + 
    String("Rate").padEnd(8) + " | " + 
    String("Reward Type").padEnd(15) + " | " + 
    String("Monthly Earn").padEnd(12) + " | " + 
    String("Annual Value").padEnd(12)
  );
  console.log("-".repeat(85));
  
  cardScore.rewardBreakdown.forEach((row) => {
    console.log(
      row.spendCategory.padEnd(15) + " | " +
      `Rs ${row.monthlySpend.toLocaleString("en-IN")}`.padEnd(13) + " | " +
      `${row.rewardCategory}`.padEnd(8) + " | " +
      `${row.rewardCategory}`.padEnd(15) + " | " +
      `Rs ${Math.round(row.monthlyReward).toLocaleString("en-IN")}`.padEnd(12) + " | " +
      `Rs ${Math.round(row.annualReward).toLocaleString("en-IN")}`.padEnd(12)
    );
  });

  const debug = cardScore.debug;
  if (!debug) {
    console.log("\n⚠️ Error: No debug properties populated on the CardScore object.");
    process.exit(1);
  }

  console.log(`\n--- ECONOMIC VALUE SUMMARY ---`);
  console.log(`(+) Estimated Annual Rewards:       Rs ${cardScore.estimatedAnnualRewards.toLocaleString("en-IN")}`);
  console.log(`(+) Milestone Benefits Value:       Rs ${cardScore.estimatedMilestoneValue.toLocaleString("en-IN")}`);
  console.log(`(-) Modeled Annual Fee (net):       Rs ${cardScore.estimatedAnnualFee.toLocaleString("en-IN")}`);
  console.log(`(=) Estimated Net Yearly Value:     Rs ${cardScore.estimatedNetValue.toLocaleString("en-IN")}`);

  console.log(`\n--- RELEVANCE BOOSTS (Relevance Score) ---`);
  console.log(`    cardNameBoost:                  ${debug.cardNameBoost}`);
  console.log(`    keywordBoost:                   ${debug.keywordBoost}`);
  console.log(`    tagBoost:                       ${debug.tagBoost}`);
  console.log(`    issuerBoost:                    ${debug.issuerBoost}`);
  console.log(`    networkBoost:                   ${debug.networkBoost}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`(=) Total Relevance Score:          ${debug.relevanceScore}`);
  console.log(`(x) Relevance Weight Multiplier:    ${debug.relevanceWeight}`);
  console.log(`(=) Weighted Relevance Addition:    ${debug.relevanceScore * debug.relevanceWeight}`);

  console.log(`\n--- PREFERENCE / HEURISTIC BOOSTS (Shared Boosts) ---`);
  console.log(`    useCaseBoost:                   ${debug.useCaseBoost}`);
  console.log(`    categorySpecialistBoost:        ${debug.categorySpecialistBoost}`);
  console.log(`    segmentBoost:                   ${debug.segmentBoost}`);
  console.log(`    redemptionBoost:                ${debug.redemptionBoost}`);
  console.log(`    loungeBoost:                    ${debug.loungeBoost}`);
  console.log(`    forexBoost:                     ${debug.forexBoost}`);
  console.log(`    spendCategoryBoost:             ${debug.spendCategoryBoost}`);
  console.log(`    milestoneWaiverUpsideDelta:     ${debug.comparisonMilestoneAndWaiverDelta}`);
  console.log(`    specialSpendBoost:              ${debug.specialSpendBoost}`);
  console.log(`    milestoneBoost:                 ${debug.milestoneBoost}`);
  console.log(`    popularityBoost (pop * 50):     ${card.popularityScore * 50}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`(=) Total Shared Boosts:            ${debug.sharedBoosts}`);

  console.log(`\n--- FINAL RANKING SCORE ---`);
  console.log(`    Value Score (Net Value + Boosts): ${debug.valueScore}`);
  console.log(`(+) Weighted Relevance Addition:      ${debug.relevanceScore * debug.relevanceWeight}`);
  console.log(`=============================================================`);
  console.log(`(★) FINAL FIT SCORE:                  ${cardScore.fitScore}`);
  console.log(`=============================================================`);

  if (cardScore.reasons.length > 0) {
    console.log(`\nCurated Reasons:`);
    cardScore.reasons.forEach((r) => console.log(`- ${r}`));
  }
}

main().catch(console.error);
