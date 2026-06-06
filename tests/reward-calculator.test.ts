import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import { calculateRewards } from "../lib/reward-calculator";

describe("reward calculator", () => {
  it("derives Burgundy EDGE REWARD Point earn correctly from display rates", () => {
    const card = getCardById("axis-magnus-burgundy");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      online: 0,
      dining: 0,
      travel: 0,
      fuel: 0,
      grocery: 0,
      utilities: 0,
      upi: 0,
      amazon: 0,
      base: 100000,
      rent: 0,
      insurance: 0,
      education: 0,
      gold: 0,
      government: 0
    });

    expect(result.monthlyUnits).toBe(6000);
    expect(result.annualUnits).toBe(72000);
  });

  it("applies Burgundy accelerated base earn above Rs 1.5 lakh monthly spend", () => {
    const card = getCardById("axis-magnus-burgundy");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      online: 0,
      dining: 0,
      travel: 0,
      fuel: 0,
      grocery: 0,
      utilities: 0,
      upi: 0,
      amazon: 0,
      base: 200000,
      rent: 0,
      insurance: 0,
      education: 0,
      gold: 0,
      government: 0
    });

    expect(result.monthlyUnits).toBe(17750);
    expect(result.annualUnits).toBe(213000);
  });

  it("applies monthly capping of 5k points combined on utility, insurance, education, and government spend for Times Black ICICI Bank Credit Card", () => {
    const card = getCardById("icici-times-black");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      utilities: 150000, // 2% would be 3000 points
      insurance: 150000, // 2% would be 3000 points
      education: 50000,  // 2% would be 1000 points
      government: 50000  // 2% would be 1000 points
    });

    // Total raw points = 3000 + 3000 + 1000 + 1000 = 8000 points.
    // Capped at 5000 points.
    expect(result.monthlyUnits).toBe(5000);
    expect(result.annualUnits).toBe(60000);

    // Verify proportional distribution across the rows
    const utilsRow = result.rows.find(r => r.category === "utilities");
    const insRow = result.rows.find(r => r.category === "insurance");
    const eduRow = result.rows.find(r => r.category === "education");
    const govRow = result.rows.find(r => r.category === "government");

    expect(utilsRow).toBeTruthy();
    expect(insRow).toBeTruthy();
    expect(eduRow).toBeTruthy();
    expect(govRow).toBeTruthy();

    // 3000 / 8000 * 5000 = 1875
    expect(utilsRow!.monthlyUnits).toBe(1875);
    expect(insRow!.monthlyUnits).toBe(1875);
    // 1000 / 8000 * 5000 = 625
    expect(eduRow!.monthlyUnits).toBe(625);
    expect(govRow!.monthlyUnits).toBe(625);
  });
});
