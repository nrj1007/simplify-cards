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

  it("extracts milestone vouchers for Amex Platinum Travel", () => {
    const card = getCardById("amex-platinum-travel");
    expect(card).toBeTruthy();

    const rules = milestoneRulesForCard(card!);
    
    // Amex Platinum Travel has 3 milestone benefits:
    // 1. 7,500 MR points at Rs 1.9L
    // 2. 10,000 MR points at Rs 4.0L
    // 3. 22,500 MR points + Rs 10k Taj voucher at Rs 7.0L
    expect(rules.length).toBe(3);

    const tajMilestone = rules.find(r => r.threshold === 700000);
    expect(tajMilestone).toBeTruthy();
    expect(tajMilestone!.isVoucher).toBe(true);

    // 22500 MR points * 1.0 = 22500. Taj stay voucher 10000 * 0.5 = 5000. Total value = 27500.
    expect(tajMilestone!.value).toBe(27500);
    expect(tajMilestone!.label).toContain("Taj stay voucher");

    // The other two milestones do not contain the word 'voucher'
    const pointMilestones = rules.filter(r => r.threshold < 700000);
    expect(pointMilestones.every(r => !r.isVoucher)).toBe(true);
  });

  it("extracts 12 Lakhs threshold from Sapphiro cap milestone benefit description", () => {
    const card = getCardById("icici-sapphiro");
    expect(card).toBeTruthy();

    const rules = milestoneRulesForCard(card!);
    
    // Sapphiro has 3 milestone benefits. The last one is "Maximum milestone rewards capped..." at Rs 12 Lakhs spend.
    const capMilestone = rules.find(r => r.label.includes("Maximum milestone rewards"));
    expect(capMilestone).toBeTruthy();
    expect(capMilestone!.threshold).toBe(1200000);
  });

  it("calculates rewards correctly for MakeMyTrip ICICI card", () => {
    const card = getCardById("icici-makemytrip");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      online: 0,
      dining: 0,
      travel: 0,
      hotels: 10000,   // Rs 10,000 spend on MMT Hotels (rate 6%)
      airlines: 20000, // Rs 20,000 spend on MMT Flights (rate 3%)
      fuel: 0,
      grocery: 0,
      utilities: 0,
      upi: 0,
      amazon: 0,
      base: 10000,     // Rs 10,000 spend on other base retail (rate 1%)
      rent: 0,
      insurance: 0,
      education: 0,
      gold: 0,
      government: 0
    });

    // 10000 * 6% = 600 myCash
    // 20000 * 3% = 600 myCash
    // 10000 * 1% = 100 myCash
    // Total: 1300 myCash
    expect(result.monthlyUnits).toBe(1300);
    expect(result.annualUnits).toBe(15600);

    const hotelsRow = result.rows.find((r) => r.category === "hotels");
    expect(hotelsRow).toBeTruthy();
    expect(hotelsRow!.monthlyUnits).toBe(600);

    const airlinesRow = result.rows.find((r) => r.category === "airlines");
    expect(airlinesRow).toBeTruthy();
    expect(airlinesRow!.monthlyUnits).toBe(600);

    const baseRow = result.rows.find((r) => r.category === "base");
    expect(baseRow).toBeTruthy();
    expect(baseRow!.monthlyUnits).toBe(100);
  });
});
