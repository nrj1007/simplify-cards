import { describe, expect, it } from "vitest";
import { cards } from "../lib/cards";
import { calculateRewards, CALCULATOR_CATEGORIES } from "../lib/reward-calculator";
import type { RewardCalcResult } from "../lib/reward-calculator";
import type { SpendProfile } from "../lib/types";

// Golden snapshot of every card's reward-calculator earn, so any unintended change to earning logic
// (rates, caps, post-cap, tiers, exclusions, category matching) surfaces as a reviewable diff across
// the whole catalog. Two spend levels exercise normal earning, caps, and the upper spend tiers.
// Intentional changes: review the diff, then `npx vitest run -u` to refresh.

function uniformProfile(amount: number): SpendProfile {
  const profile: SpendProfile = {};
  for (const category of CALCULATOR_CATEGORIES) profile[category] = amount;
  return profile;
}

// Compact, stable per-card line: "<category>:<monthlyUnits|x=excluded> … |<total>".
function summarize(result: RewardCalcResult): string {
  const rows = result.rows
    .map((row) => `${row.category}:${row.excluded ? "x" : Math.round(row.monthlyUnits)}`)
    .join(" ");
  return `${rows} |${Math.round(result.monthlyUnits)} (surcharge:${Math.round(result.monthlySurcharge)})`;
}

describe("reward calculator golden (all cards)", () => {
  it("computes stable earn for every card at moderate and high spend", () => {
    const moderate = uniformProfile(25000);
    const high = uniformProfile(200000);

    const golden: Record<string, { moderate: string; high: string }> = {};
    for (const card of [...cards].sort((a, b) => a.id.localeCompare(b.id))) {
      golden[card.id] = {
        moderate: summarize(calculateRewards(card, moderate)),
        high: summarize(calculateRewards(card, high))
      };
    }

    expect(Object.keys(golden).length).toBe(cards.length);
    expect(golden).toMatchSnapshot();
  });
});
