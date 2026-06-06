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

  it("calculates rewards correctly for ICICI Bank HPCL Super Saver Credit Card including cashback and shared category capping", () => {
    const card = getCardById("icici-hpcl-super-saver");
    expect(card).toBeTruthy();

    // Spend profile that does not trigger caps
    const result1 = calculateRewards(card!, {
      fuel: 4000,      // 4% cashback = 160 (below 200 cap)
      utilities: 1000, // 5% = 200 points
      grocery: 1000,   // 5% = 200 points (total points 400, matches the 400 points cap)
      base: 10000      // 2 points/Rs 100 = 200 points
    });

    expect(result1.monthlyUnits).toBe(760); // 160 + 200 + 200 + 200 = 760
    expect(result1.annualUnits).toBe(760 * 12);

    const fuelRow1 = result1.rows.find(r => r.category === "fuel");
    const utilRow1 = result1.rows.find(r => r.category === "utilities");
    const groceryRow1 = result1.rows.find(r => r.category === "grocery");
    const baseRow1 = result1.rows.find(r => r.category === "base");

    expect(fuelRow1!.monthlyUnits).toBe(160);
    expect(utilRow1!.monthlyUnits).toBe(200);
    expect(groceryRow1!.monthlyUnits).toBe(200);
    expect(baseRow1!.monthlyUnits).toBe(200);

    // Spend profile that triggers caps
    const result2 = calculateRewards(card!, {
      fuel: 6000,      // 4% cashback = 240 -> capped at 200
      utilities: 2000, // 5% = 400 points
      grocery: 2000,   // 5% = 400 points (total points 800 -> capped at 400 points)
      base: 10000      // 2 points/Rs 100 = 200 points
    });

    expect(result2.monthlyUnits).toBe(800); // 200 (capped fuel) + 200 (capped utilities) + 200 (capped grocery) + 200 (base) = 800
    expect(result2.annualUnits).toBe(800 * 12);

    const fuelRow2 = result2.rows.find(r => r.category === "fuel");
    const utilRow2 = result2.rows.find(r => r.category === "utilities");
    const groceryRow2 = result2.rows.find(r => r.category === "grocery");
    const baseRow2 = result2.rows.find(r => r.category === "base");

    expect(fuelRow2!.monthlyUnits).toBe(200);
    expect(utilRow2!.monthlyUnits).toBe(200);
    expect(groceryRow2!.monthlyUnits).toBe(200);
    expect(baseRow2!.monthlyUnits).toBe(200);
  });

  it("calculates rewards correctly for ICICI Bank Platinum Chip card", () => {
    const card = getCardById("icici-platinum-chip");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      base: 10000,      // 2 points / Rs 100 = 200 points
      utilities: 10000, // 1 point / Rs 100 = 100 points
      insurance: 10000  // 1 point / Rs 100 = 100 points
    });

    expect(result.monthlyUnits).toBe(400); // 200 + 100 + 100 = 400
    expect(result.annualUnits).toBe(4800);
  });

  it("calculates rewards correctly for ICICI Bank Coral RuPay card including UPI spends", () => {
    const card = getCardById("icici-coral-rupay");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      base: 10000,      // 2 points / Rs 100 = 200 points
      utilities: 10000, // 1 point / Rs 100 = 100 points
      upi: 10000        // 2 points / Rs 100 = 200 points
    });

    expect(result.monthlyUnits).toBe(500); // 200 + 100 + 200 = 500
    expect(result.annualUnits).toBe(6000);
  });

  it("calculates rewards correctly for ICICI Bank Rubyx card", () => {
    const card = getCardById("icici-rubyx");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      base: 10000,          // 2 points / Rs 100 = 200 points
      international: 10000, // 4 points / Rs 100 = 400 points
      utilities: 10000,     // 1 point / Rs 100 = 100 points
      insurance: 10000      // 1 point / Rs 100 = 100 points
    });

    expect(result.monthlyUnits).toBe(800); // 200 + 400 + 100 + 100 = 800
    expect(result.annualUnits).toBe(9600);
  });
});
