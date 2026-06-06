import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import { calculateRewards } from "../lib/reward-calculator";
import { milestoneRulesForCard } from "../lib/recommend";

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

  it("calculates international rewards correctly for ICICI Sapphiro card using its dedicated rate", () => {
    const card = getCardById("icici-sapphiro");
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
      base: 0,
      rent: 0,
      insurance: 0,
      education: 0,
      gold: 0,
      government: 0,
      international: 10000 // Rs 10,000 spend
    });

    // 10,000 spend on international should earn 400 points per month (4 Reward Points / Rs 100)
    expect(result.monthlyUnits).toBe(400);
    expect(result.annualUnits).toBe(4800);

    const intlRow = result.rows.find((r) => r.category === "international");
    expect(intlRow).toBeTruthy();
    expect(intlRow!.monthlySpend).toBe(10000);
    expect(intlRow!.monthlyUnits).toBe(400);
    expect(intlRow!.excluded).toBe(false);
  });

  it("extracts joining benefits as welcome vouchers for ICICI Sapphiro", () => {
    const card = getCardById("icici-sapphiro");
    expect(card).toBeTruthy();

    const rules = milestoneRulesForCard(card!);
    
    // Check that we have joining benefits mapped with threshold 0 and classified as vouchers
    const joiningVouchers = rules.filter(r => r.threshold === 0 && r.isVoucher);
    expect(joiningVouchers.length).toBe(4);

    // Sum of face values: Tata Cliq (3000) + EMT (4000) + Croma (1500) + Uber (1000) = 9500
    // Sum of discounted values (50%): 1500 + 2000 + 750 + 500 = 4750
    const totalVoucherValue = joiningVouchers.reduce((sum, r) => sum + r.value, 0);
    expect(totalVoucherValue).toBe(4750);

    // Verify labels
    expect(joiningVouchers.some(r => r.label.includes("Tata CLiQ"))).toBe(true);
    expect(joiningVouchers.some(r => r.label.includes("Croma"))).toBe(true);
  });
});
