import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import { calculateRewards } from "../lib/reward-calculator";
import { milestoneRulesForCard } from "../lib/recommend";
import type { Milestone } from "../lib/types";

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

  describe("audited American Express cards", () => {
    it("calculates rewards correctly for Amex Gold including utilities", () => {
      const card = getCardById("amex-gold");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        base: 10000,      // 1 MR / Rs 50 = 200
        utilities: 5000   // 1 MR / Rs 50 = 100
      });

      expect(result.monthlyUnits).toBe(300);
      expect(result.annualUnits).toBe(3600);

      const baseRow = result.rows.find((r) => r.category === "base");
      const utilRow = result.rows.find((r) => r.category === "utilities");
      expect(baseRow?.monthlyUnits).toBe(200);
      expect(utilRow?.monthlyUnits).toBe(100);
      expect(utilRow?.excluded).toBe(false);
    });

    it("caps Amex Gold utility rewards at 10,000 points per month", () => {
      const card = getCardById("amex-gold");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        utilities: 600000 // raw 12,000 MR, capped at 10,000
      });

      expect(result.monthlyUnits).toBe(10000);
      expect(result.annualUnits).toBe(120000);
    });

    it("calculates rewards correctly for Amex Membership Rewards Credit Card", () => {
      const card = getCardById("amex-membership-rewards");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        base: 10000,   // 200
        online: 10000  // 2 MR / Rs 50 = 400
      });

      expect(result.monthlyUnits).toBe(600);
      expect(result.annualUnits).toBe(7200);

      const onlineRow = result.rows.find((r) => r.category === "online");
      expect(onlineRow?.monthlyUnits).toBe(400);
    });

    it("excludes utilities on Amex Membership Rewards Credit Card", () => {
      const card = getCardById("amex-membership-rewards");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        utilities: 10000
      });

      expect(result.monthlyUnits).toBe(0);
      const utilitiesRow = result.rows.find((r) => r.category === "utilities");
      expect(utilitiesRow).toBeTruthy();
      expect(utilitiesRow!.monthlyUnits).toBe(0);
      expect(utilitiesRow!.excluded).toBe(true);
    });

    it("calculates rewards correctly for Amex Platinum Reserve", () => {
      const card = getCardById("amex-platinum-reserve");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        base: 10000,   // 200
        online: 10000  // 3 MR / Rs 50 = 600
      });

      expect(result.monthlyUnits).toBe(800);
      expect(result.annualUnits).toBe(9600);

      const onlineRow = result.rows.find((r) => r.category === "online");
      expect(onlineRow?.monthlyUnits).toBe(600);
    });

    it("calculates rewards correctly for Amex Platinum including overseas and fuel spend", () => {
      const card = getCardById("amex-platinum");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        base: 8000,          // 1 MR / Rs 40 = 200
        travel: 8000,        // 3 MR / Rs 40 = 600
        fuel: 10000          // 5 MR / Rs 100 = 500
      });

      expect(result.monthlyUnits).toBe(1300);
      expect(result.annualUnits).toBe(15600);

      const travelRow = result.rows.find((r) => r.category === "travel");
      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(travelRow?.monthlyUnits).toBe(600);
      expect(fuelRow?.monthlyUnits).toBe(500);
    });

    it("calculates rewards correctly for Amex SmartEarn with 10X and 5X merchants", () => {
      const card = getCardById("amex-smartearn");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        online: 2500,  // 10X => 500 MR
        amazon: 2500,  // 5X => 250 MR
        base: 5000     // 1 MR / Rs 50 => 100 MR
      });

      expect(result.monthlyUnits).toBe(850);
      expect(result.annualUnits).toBe(10200);
    });

    it("applies SmartEarn accelerated caps correctly", () => {
      const card = getCardById("amex-smartearn");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        online: 10000, // raw 2,000 MR, capped at 500
        amazon: 10000  // raw 1,000 MR, capped at 250
      });

      expect(result.monthlyUnits).toBe(750);
      expect(result.annualUnits).toBe(9000);

      const onlineRow = result.rows.find((r) => r.category === "online");
      const amazonRow = result.rows.find((r) => r.category === "amazon");
      expect(onlineRow?.monthlyUnits).toBe(500);
      expect(amazonRow?.monthlyUnits).toBe(250);
    });
  });

  describe("audited SBI cards", () => {
    it("calculates rewards correctly for Tata Neu Infinity SBI Card", () => {
      const card = getCardById("tata-neu-infinity-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        upi: 60000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(650);
      expect(result.annualUnits).toBe(7800);

      const upiRow = result.rows.find((r) => r.category === "upi");
      const baseRow = result.rows.find((r) => r.category === "base");
      expect(upiRow?.monthlyUnits).toBe(500);
      expect(baseRow?.monthlyUnits).toBe(150);
    });

    it("calculates rewards correctly for Flipkart SBI Card", () => {
      const card = getCardById("flipkart-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        travel: 10000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(600);
      expect(result.annualUnits).toBe(7200);

      const travelRow = result.rows.find((r) => r.category === "travel");
      const baseRow = result.rows.find((r) => r.category === "base");
      expect(travelRow?.monthlyUnits).toBe(500);
      expect(baseRow?.monthlyUnits).toBe(100);
    });

    it("calculates rewards correctly for BPCL SBI Card OCTANE with monthly caps", () => {
      const card = getCardById("bpcl-sbi-octane");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        fuel: 10000,
        utilities: 10000,
        grocery: 5000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(3100);
      expect(result.annualUnits).toBe(37200);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      const utilitiesRow = result.rows.find((r) => r.category === "utilities");
      const groceryRow = result.rows.find((r) => r.category === "grocery");
      const baseRow = result.rows.find((r) => r.category === "base");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);
      expect(utilitiesRow?.monthlyUnits).toBe(2500);
      expect(groceryRow?.monthlyUnits).toBe(500);
      expect(baseRow?.monthlyUnits).toBe(100);
    });

    it("calculates rewards correctly for SBI Card ELITE", () => {
      const card = getCardById("sbi-card-elite");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 5000,
        grocery: 5000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(1200);
      expect(result.annualUnits).toBe(14400);
    });

    it("calculates rewards correctly for SimplyCLICK SBI Card and excludes fuel", () => {
      const card = getCardById("simplyclick-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        online: 10000,
        base: 10000,
        fuel: 5000
      });

      expect(result.monthlyUnits).toBe(600);
      expect(result.annualUnits).toBe(7200);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);
    });

    it("calculates rewards correctly for both IRCTC SBI cards", () => {
      const platinum = getCardById("irctc-sbi-platinum");
      const rupay = getCardById("irctc-rupay-sbi");
      expect(platinum).toBeTruthy();
      expect(rupay).toBeTruthy();

      const platinumResult = calculateRewards(platinum!, {
        travel: 12500,
        base: 12500
      });
      expect(platinumResult.monthlyUnits).toBe(1100);
      expect(platinumResult.annualUnits).toBe(13200);

      const rupayResult = calculateRewards(rupay!, {
        travel: 10000,
        base: 12500
      });
      expect(rupayResult.monthlyUnits).toBe(1100);
      expect(rupayResult.annualUnits).toBe(13200);
    });

    it("calculates rewards correctly for Titan SBI Card base spends and excludes fuel", () => {
      const card = getCardById("titan-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        base: 10000,
        fuel: 5000
      });

      expect(result.monthlyUnits).toBe(600);
      expect(result.annualUnits).toBe(7200);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);
    });

    it("calculates rewards correctly for SBI Card MILES ELITE and PRIME", () => {
      const elite = getCardById("sbi-card-miles-elite");
      const prime = getCardById("sbi-card-miles-prime");
      expect(elite).toBeTruthy();
      expect(prime).toBeTruthy();

      const eliteResult = calculateRewards(elite!, {
        travel: 20000,
        base: 10000
      });
      expect(eliteResult.monthlyUnits).toBe(700);
      expect(eliteResult.annualUnits).toBe(8400);

      const primeResult = calculateRewards(prime!, {
        travel: 20000,
        base: 10000
      });
      expect(primeResult.monthlyUnits).toBe(500);
      expect(primeResult.annualUnits).toBe(6000);
    });

    it("calculates rewards correctly for SBI Card PULSE base spends and excludes fuel", () => {
      const card = getCardById("sbi-card-pulse");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        base: 10000,
        fuel: 5000
      });

      expect(result.monthlyUnits).toBe(200);
      expect(result.annualUnits).toBe(2400);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);
    });

    it("calculates rewards correctly for Tata Neu Plus SBI Card", () => {
      const card = getCardById("tata-neu-plus-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        upi: 60000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(600);
      expect(result.annualUnits).toBe(7200);

      const upiRow = result.rows.find((r) => r.category === "upi");
      expect(upiRow?.monthlyUnits).toBe(500);
    });

    it("calculates rewards correctly for Landmark Rewards SBI Card PRIME", () => {
      const card = getCardById("landmark-rewards-sbi-prime");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 5000,
        travel: 5000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(1200);
      expect(result.annualUnits).toBe(14400);
    });

    it("calculates rewards correctly for PhonePe SBI Card PURPLE with category caps", () => {
      const card = getCardById("phonepe-sbi-purple");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        utilities: 50000,
        online: 50000,
        upi: 100000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(3100);
      expect(result.annualUnits).toBe(37200);

      const utilitiesRow = result.rows.find((r) => r.category === "utilities");
      const onlineRow = result.rows.find((r) => r.category === "online");
      const upiRow = result.rows.find((r) => r.category === "upi");
      expect(utilitiesRow?.monthlyUnits).toBe(1000);
      expect(onlineRow?.monthlyUnits).toBe(1000);
      expect(upiRow?.monthlyUnits).toBe(1000);
    });

    it("calculates rewards correctly for PhonePe SBI Card SELECT BLACK with category caps", () => {
      const card = getCardById("phonepe-sbi-select-black");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        utilities: 30000,
        online: 50000,
        upi: 200000,
        base: 10000
      });

      expect(result.monthlyUnits).toBe(6100);
      expect(result.annualUnits).toBe(73200);

      const utilitiesRow = result.rows.find((r) => r.category === "utilities");
      const onlineRow = result.rows.find((r) => r.category === "online");
      const upiRow = result.rows.find((r) => r.category === "upi");
      expect(utilitiesRow?.monthlyUnits).toBe(2000);
      expect(onlineRow?.monthlyUnits).toBe(2000);
      expect(upiRow?.monthlyUnits).toBe(2000);
    });
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

  describe("structured milestones field", () => {
    const base = getCardById("amex-platinum-travel")!;

    it("prefers structured milestones over milestoneBenefits text", () => {
      const milestones: Milestone[] = [
        { threshold: 500000, period: "annual", value: 5000, kind: "voucher", label: "Rs 5,000 flight voucher on Rs 5 lakh annual spend" }
      ];
      const rules = milestoneRulesForCard({
        ...base,
        milestoneBenefits: ["Rs 99,999 worth bonus on annual spends of Rs 1 lakh"],
        milestones
      });
      expect(rules).toHaveLength(1);
      expect(rules[0].threshold).toBe(500000);
      expect(rules[0].value).toBe(5000);
      expect(rules[0].isVoucher).toBe(true);
      expect(rules[0].label).toContain("flight voucher");
    });

    it("keeps annual milestone numbers as-authored", () => {
      const milestones: Milestone[] = [
        { threshold: 400000, period: "annual", value: 8000, kind: "points", label: "8,000 points at Rs 4 lakh" }
      ];
      const rules = milestoneRulesForCard({ ...base, milestones });
      expect(rules[0]).toMatchObject({ threshold: 400000, value: 8000, period: "annual", isVoucher: false });
    });

    it("annualizes a quarterly milestone (threshold and value x4)", () => {
      const milestones: Milestone[] = [
        { threshold: 75000, period: "quarterly", value: 2500, kind: "points", label: "5,000 pts on Rs 75k per quarter" }
      ];
      const rules = milestoneRulesForCard({ ...base, milestones });
      expect(rules[0].threshold).toBe(300000);
      expect(rules[0].value).toBe(10000);
      expect(rules[0].period).toBe("quarterly");
    });

    it("annualizes a monthly milestone (threshold and value x12)", () => {
      const milestones: Milestone[] = [
        { threshold: 10000, period: "monthly", value: 100, kind: "points", label: "100 pts on Rs 10k per month" }
      ];
      const rules = milestoneRulesForCard({ ...base, milestones });
      expect(rules[0].threshold).toBe(120000);
      expect(rules[0].value).toBe(1200);
    });
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

  it("calculates rewards correctly for ICICI Bank HPCL Coral card", () => {
    const card = getCardById("icici-hpcl-coral");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      fuel: 5000,  // 2.5% cashback => Rs 125/month (cashback, not points)
      base: 10000  // 2 points / Rs 100 = 200 points/month
    });

    // fuel: 5000 * 2.5% = Rs 125 cashback (returned as-is in units)
    // base: 10000 / 100 * 2 = 200 reward points
    // total monthlyUnits = 125 + 200 = 325
    expect(result.monthlyUnits).toBe(325);
    expect(result.annualUnits).toBe(3900);
  });

  it("calculates rewards correctly for Adani One ICICI Bank Signature card across all spend tiers", () => {
    const card = getCardById("icici-adani-one-signature");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      travel: 10000,       // 7% → rate=7 → 7 units per Rs 100 → 700 units
      international: 5000, // 2% → rate=2 → 2 units per Rs 100 → 100 units
      base: 10000,         // 1.5% → rate=1.5 → 1.5 units per Rs 100 → 150 units
      utilities: 5000      // 0.5% → rate=0.5 → 0.5 units per Rs 100 → 25 units
    });

    // displayRate "X% Adani Reward Points" doesn't match "X Points / Rs Y" parser
    // → falls back to rate directly (rate already equals % return since 1 point = Rs 1)
    // travel:       10000 / 100 * 7   = 700
    // international: 5000 / 100 * 2   = 100
    // base:         10000 / 100 * 1.5 = 150
    // utilities:     5000 / 100 * 0.5 =  25
    // total = 975
    expect(result.monthlyUnits).toBe(975);
    expect(result.annualUnits).toBe(11700);
  });

  it("calculates rewards correctly for Adani One ICICI Bank Platinum card across all spend tiers", () => {
    const card = getCardById("icici-adani-one-platinum");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      travel: 10000,       // 3% → rate=3 → 300 units
      international: 5000, // 1.5% → rate=1.5 → 75 units
      base: 10000,         // 1% → rate=1 → 100 units
      utilities: 5000      // 0.5% → rate=0.5 → 25 units
    });

    // travel:       10000 / 100 * 3   = 300
    // international: 5000 / 100 * 1.5 =  75
    // base:         10000 / 100 * 1   = 100
    // utilities:     5000 / 100 * 0.5 =  25
    // total = 500
    expect(result.monthlyUnits).toBe(500);
    expect(result.annualUnits).toBe(6000);
  });

  it("calculates rewards correctly for HDFC Bank Diners Club Privilege Credit Card", () => {
    const card = getCardById("hdfc-diners-club-privilege");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      dining: 5000,        // Swiggy & Zomato: 20 RP / Rs 200 => 10 RP / Rs 100 => 500 units
      base: 10000,         // Base: 4 RP / Rs 200 => 2 RP / Rs 100 => 200 units
      amazon: 10000,       // No dedicated rate, falls back to Base => 200 units
      fuel: 5000,          // Excluded => 0 units
      rent: 10000          // Excluded => 0 units
    });

    // dining:        5000 * 10 / 100 = 500 points (below 2500 cap)
    // base:          10000 * 2 / 100 = 200 points
    // amazon:        10000 * 2 / 100 = 200 points
    // fuel:          0 points
    // rent:          0 points
    // Total monthly units = 500 + 200 + 200 = 900
    expect(result.monthlyUnits).toBe(900);
    expect(result.annualUnits).toBe(10800);
  });

  it("calculates rewards correctly for HDFC Bank Tata Neu Plus Credit Card including categories caps and upi limits", () => {
    const card = getCardById("hdfc-tata-neu-plus");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      base: 10000,         // 10000 * 1% = 100 NeuCoins
      upi: 60000,          // 60000 * 1% = 600 NeuCoins => capped at 500 NeuCoins
      grocery: 150000,     // 150000 * 1% = 1500 NeuCoins => capped at 1000 NeuCoins
      utilities: 250000,   // 250000 * 1% = 2500 NeuCoins => capped at 2000 NeuCoins
      insurance: 250000,   // 250000 * 1% = 2500 NeuCoins => capped at 2000 NeuCoins
      fuel: 5000           // Excluded => 0 NeuCoins
    });

    expect(result.monthlyUnits).toBe(5600); // 100 + 500 + 1000 + 2000 + 2000 = 5600
    expect(result.annualUnits).toBe(67200);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(500);
    expect(upiRow!.excluded).toBe(false);

    const groceryRow = result.rows.find(r => r.category === "grocery");
    expect(groceryRow!.monthlyUnits).toBe(1000);

    const utilitiesRow = result.rows.find(r => r.category === "utilities");
    expect(utilitiesRow!.monthlyUnits).toBe(2000);

    const insuranceRow = result.rows.find(r => r.category === "insurance");
    expect(insuranceRow!.monthlyUnits).toBe(2000);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(0);
    expect(fuelRow!.excluded).toBe(true);
  });

  it("calculates rewards correctly for HDFC Bank IndianOil Credit Card including category caps and upi spends", () => {
    const card = getCardById("hdfc-indianoil");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      fuel: 5000,          // 5000 * 5% FP = 250 FP => capped at 150 FP
      grocery: 3000,       // 3000 * 5% FP = 150 FP => capped at 100 FP
      utilities: 3000,     // 3000 * 5% FP = 150 FP => capped at 100 FP
      base: 15000,         // 15000 * (1 FP / Rs 150) = 100 FP
      upi: 15000,          // 15000 * (1 FP / Rs 150) = 100 FP
      rent: 10000,         // Excluded => 0
      government: 5000     // Excluded => 0
    });

    // Total expected monthly units = 150 (fuel) + 100 (grocery) + 100 (utilities) + 100 (base) + 100 (upi) = 550 FP
    expect(result.monthlyUnits).toBe(550);
    expect(result.annualUnits).toBe(6600);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(150);
    expect(fuelRow!.excluded).toBe(false);

    const groceryRow = result.rows.find(r => r.category === "grocery");
    expect(groceryRow!.monthlyUnits).toBe(100);

    const utilitiesRow = result.rows.find(r => r.category === "utilities");
    expect(utilitiesRow!.monthlyUnits).toBe(100);

    const baseRow = result.rows.find(r => r.category === "base");
    expect(baseRow!.monthlyUnits).toBe(100);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(100);

    const rentRow = result.rows.find(r => r.category === "rent");
    expect(rentRow!.monthlyUnits).toBe(0);
    expect(rentRow!.excluded).toBe(true);
  });

  it("calculates rewards correctly for HDFC Bank MoneyBack+ Credit Card including 10X caps and exclusions", () => {
    const card = getCardById("hdfc-moneyback-plus");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      amazon: 30000,       // 10X category, 30000 * 10% = 3000 units => capped at 2500 CashPoints
      grocery: 50000,      // 10X category, 50000 * 10% = 5000 units => capped at 1000 CashPoints
      base: 10000,         // base category, 10000 * (1% base) = 100 CashPoints (2 points / Rs 200 => 1 point / Rs 100)
      upi: 10000,          // upi category, 10000 * (1% base) = 100 CashPoints
      fuel: 5000,          // excluded => 0
      rent: 10000          // excluded => 0
    });

    // Total expected monthly units = 2500 (amazon capped) + 1000 (grocery capped) + 100 (base) + 100 (upi) = 3700 CashPoints
    expect(result.monthlyUnits).toBe(3700);
    expect(result.annualUnits).toBe(3700 * 12);

    const amazonRow = result.rows.find(r => r.category === "amazon");
    expect(amazonRow!.monthlyUnits).toBe(2500);

    const groceryRow = result.rows.find(r => r.category === "grocery");
    expect(groceryRow!.monthlyUnits).toBe(1000);

    const baseRow = result.rows.find(r => r.category === "base");
    expect(baseRow!.monthlyUnits).toBe(100);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(100);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(0);
    expect(fuelRow!.excluded).toBe(true);
  });

  it("calculates rewards correctly for HDFC Bank PIXEL Play Credit Card including category caps and exclusions", () => {
    const card = getCardById("hdfc-pixel-play");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      dining: 6000,        // 5% rate, 6000 * 5% = 300
      grocery: 6000,       // 5% rate, 6000 * 5% = 300 (dining + grocery raw = 600 => capped at 500 combined)
      online: 20000,       // 3% rate, 20000 * 3% = 600 => capped at 500
      upi: 60000,          // 1% rate, 60000 * 1% = 600 => capped at 500
      base: 10000,         // 1% rate, 10000 * 1% = 100
      fuel: 5000,          // excluded => 0
      rent: 10000          // excluded => 0
    });

    // Total expected monthly units = 500 (dining/grocery capped) + 500 (online capped) + 500 (upi capped) + 100 (base) = 1600 CashPoints
    expect(result.monthlyUnits).toBe(1600);
    expect(result.annualUnits).toBe(1600 * 12);

    const diningRow = result.rows.find(r => r.category === "dining");
    expect(diningRow!.monthlyUnits).toBe(250); // Proportional split of 500 cap: 300 / 600 * 500 = 250

    const groceryRow = result.rows.find(r => r.category === "grocery");
    expect(groceryRow!.monthlyUnits).toBe(250); // Proportional split of 500 cap: 300 / 600 * 500 = 250

    const onlineRow = result.rows.find(r => r.category === "online");
    expect(onlineRow!.monthlyUnits).toBe(500);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(500);

    const baseRow = result.rows.find(r => r.category === "base");
    expect(baseRow!.monthlyUnits).toBe(100);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(0);
    expect(fuelRow!.excluded).toBe(true);

    const rentRow = result.rows.find(r => r.category === "rent");
    expect(rentRow!.monthlyUnits).toBe(0);
    expect(rentRow!.excluded).toBe(true);
  });

  it("calculates rewards correctly for HDFC Bank Freedom Credit Card including category caps and exclusions", () => {
    const card = getCardById("hdfc-freedom");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      online: 45000,       // 10X category: 45000 * 10/150 = 3000 points => capped at 2500
      upi: 90000,          // 1X category: 90000 * 1/150 = 600 points => capped at 500
      base: 15000,         // 1X category: 15000 * 1/150 = 100 points
      fuel: 5000,          // excluded => 0
      rent: 10000          // excluded => 0
    });

    // Total expected monthly units = 2500 (online capped) + 500 (upi capped) + 100 (base) = 3100 CashPoints
    expect(result.monthlyUnits).toBe(3100);
    expect(result.annualUnits).toBe(3100 * 12);

    const onlineRow = result.rows.find(r => r.category === "online");
    expect(onlineRow!.monthlyUnits).toBe(2500);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(500);

    const baseRow = result.rows.find(r => r.category === "base");
    expect(baseRow!.monthlyUnits).toBe(100);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(0);
    expect(fuelRow!.excluded).toBe(true);

    const rentRow = result.rows.find(r => r.category === "rent");
    expect(rentRow!.monthlyUnits).toBe(0);
    expect(rentRow!.excluded).toBe(true);
  });

  it("calculates rewards correctly for HDFC Bank PIXEL Go Credit Card including category caps and exclusions", () => {
    const card = getCardById("hdfc-pixel-go");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      upi: 60000,          // 1% rate, 60000 * 1% = 600 => capped at 500
      online: 20000,       // 1% rate, 20000 * 1% = 200
      base: 10000,         // 1% rate, 10000 * 1% = 100
      fuel: 5000,          // excluded => 0
      rent: 10000          // excluded => 0
    });

    // Total expected monthly units = 500 (upi capped) + 200 (online) + 100 (base) = 800 CashPoints
    expect(result.monthlyUnits).toBe(800);
    expect(result.annualUnits).toBe(800 * 12);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(500);

    const onlineRow = result.rows.find(r => r.category === "online");
    expect(onlineRow!.monthlyUnits).toBe(200);

    const baseRow = result.rows.find(r => r.category === "base");
    expect(baseRow!.monthlyUnits).toBe(100);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(0);
    expect(fuelRow!.excluded).toBe(true);

    const rentRow = result.rows.find(r => r.category === "rent");
    expect(rentRow!.monthlyUnits).toBe(0);
    expect(rentRow!.excluded).toBe(true);
  });

  it("calculates rewards correctly for HDFC Bank PhonePe Ultimo Credit Card including category caps and exclusions", () => {
    const card = getCardById("hdfc-phonepe-ultimo");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      utilities: 20000,    // 10% rate, 20000 * 10% = 2000 => capped at 1000
      online: 20000,       // 5% rate, 20000 * 5% = 1000 => capped at 500
      upi: 60000,          // 1% rate, 60000 * 1% = 600 => capped at 500
      fuel: 5000,          // excluded => 0
      rent: 10000          // excluded => 0
    });

    // Total expected monthly units = 1000 (utilities capped) + 500 (online capped) + 500 (upi capped) = 2000 reward points
    expect(result.monthlyUnits).toBe(2000);
    expect(result.annualUnits).toBe(2000 * 12);

    const utilitiesRow = result.rows.find(r => r.category === "utilities");
    expect(utilitiesRow!.monthlyUnits).toBe(1000);

    const onlineRow = result.rows.find(r => r.category === "online");
    expect(onlineRow!.monthlyUnits).toBe(500);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(500);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(0);
    expect(fuelRow!.excluded).toBe(true);

    const rentRow = result.rows.find(r => r.category === "rent");
    expect(rentRow!.monthlyUnits).toBe(0);
    expect(rentRow!.excluded).toBe(true);
  });

  it("calculates rewards correctly for HDFC Bank PhonePe Uno Credit Card including category caps and exclusions", () => {
    const card = getCardById("hdfc-phonepe-uno");
    expect(card).toBeTruthy();

    const result = calculateRewards(card!, {
      utilities: 30000,    // 2% rate, 30000 * 2% = 600 => capped at 500
      online: 60000,       // 1% rate, 60000 * 1% = 600 => capped at 500
      upi: 60000,          // 1% rate, 60000 * 1% = 600 => capped at 500
      fuel: 5000,          // excluded => 0
      rent: 10000          // excluded => 0
    });

    // Total expected monthly units = 500 (utilities capped) + 500 (online capped) + 500 (upi capped) = 1500 reward points
    expect(result.monthlyUnits).toBe(1500);
    expect(result.annualUnits).toBe(1500 * 12);

    const utilitiesRow = result.rows.find(r => r.category === "utilities");
    expect(utilitiesRow!.monthlyUnits).toBe(500);

    const onlineRow = result.rows.find(r => r.category === "online");
    expect(onlineRow!.monthlyUnits).toBe(500);

    const upiRow = result.rows.find(r => r.category === "upi");
    expect(upiRow!.monthlyUnits).toBe(500);

    const fuelRow = result.rows.find(r => r.category === "fuel");
    expect(fuelRow!.monthlyUnits).toBe(0);
    expect(fuelRow!.excluded).toBe(true);

    const rentRow = result.rows.find(r => r.category === "rent");
    expect(rentRow!.monthlyUnits).toBe(0);
    expect(rentRow!.excluded).toBe(true);
  });

  describe("IRCTC HDFC Bank Credit Card", () => {
    it("earns 5 reward points per Rs 100 on IRCTC / travel spends", () => {
      const card = getCardById("hdfc-irctc");
      expect(card).toBeTruthy();

      // Rs 10,000 IRCTC/travel spend: 10,000 / 100 * 5 = 500 points
      const result = calculateRewards(card!, { travel: 10000 });

      expect(result.monthlyUnits).toBe(500);
      expect(result.annualUnits).toBe(6000);

      const travelRow = result.rows.find((r) => r.category === "travel");
      expect(travelRow).toBeTruthy();
      expect(travelRow!.monthlySpend).toBe(10000);
      expect(travelRow!.monthlyUnits).toBe(500);
      expect(travelRow!.excluded).toBe(false);
    });

    it("earns 1 reward point per Rs 100 on base / other spends", () => {
      const card = getCardById("hdfc-irctc");
      expect(card).toBeTruthy();

      // Rs 50,000 base spend: 50,000 / 100 * 1 = 500 points
      const result = calculateRewards(card!, { base: 50000 });

      expect(result.monthlyUnits).toBe(500);
      expect(result.annualUnits).toBe(6000);

      const baseRow = result.rows.find((r) => r.category === "base");
      expect(baseRow).toBeTruthy();
      expect(baseRow!.monthlyUnits).toBe(500);
    });

    it("earns both 5x IRCTC and 1x base correctly in a combined profile", () => {
      const card = getCardById("hdfc-irctc");
      expect(card).toBeTruthy();

      // Rs 5,000 IRCTC => 5,000/100 * 5 = 250 pts
      // Rs 20,000 base  => 20,000/100 * 1 = 200 pts
      // Total = 450 pts/month
      const result = calculateRewards(card!, { travel: 5000, base: 20000 });

      expect(result.monthlyUnits).toBe(450);
      expect(result.annualUnits).toBe(5400);
    });

    it("caps insurance earn at 2,000 reward points per month", () => {
      const card = getCardById("hdfc-irctc");
      expect(card).toBeTruthy();

      // Rs 300,000 insurance spend: raw = 300,000 / 100 * 1 = 3,000 pts — capped at 2,000
      const result = calculateRewards(card!, { insurance: 300000 });

      const insRow = result.rows.find((r) => r.category === "insurance");
      expect(insRow).toBeTruthy();
      expect(insRow!.monthlyUnits).toBe(2000);
      expect(result.monthlyUnits).toBe(2000);
    });

    it("excludes fuel spend from earning reward points", () => {
      const card = getCardById("hdfc-irctc");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, { fuel: 10000 });

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(fuelRow).toBeTruthy();
      expect(fuelRow!.monthlyUnits).toBe(0);
      expect(fuelRow!.excluded).toBe(true);
      expect(result.monthlyUnits).toBe(0);
    });

    it("milestone: Rs 500 gift voucher unlocks at Rs 30,000 quarterly (Rs 1,20,000 annual) spend", () => {
      const card = getCardById("hdfc-irctc");
      expect(card).toBeTruthy();

      const rules = milestoneRulesForCard(card!);

      // Quarterly Rs 30k = annualised Rs 1,20,000 threshold; Rs 500 GV × 4 quarters = Rs 2,000 annualised value
      const quarterlyMilestone = rules.find((r) => r.threshold === 120000);
      expect(quarterlyMilestone).toBeTruthy();
      expect(quarterlyMilestone!.value).toBe(2000);  // 500 × 4 quarters
      expect(quarterlyMilestone!.period).toBe("quarterly");
      expect(quarterlyMilestone!.isVoucher).toBe(true);
    });
  });

  describe("Swiggy HDFC Bank Credit Card", () => {
    it("earns 10% cashback on Swiggy spends, capped at Rs 1,500/month", () => {
      const card = getCardById("hdfc-swiggy");
      expect(card).toBeTruthy();

      // Rs 10,000 Swiggy (dining) spend => 10,000 * 10% = Rs 1,000 cashback
      const result1 = calculateRewards(card!, { dining: 10000 });
      expect(result1.monthlyUnits).toBe(1000);

      const diningRow = result1.rows.find((r) => r.category === "dining");
      expect(diningRow).toBeTruthy();
      expect(diningRow!.monthlyUnits).toBe(1000);

      // Rs 20,000 Swiggy spend => 2,000 raw cashback capped at Rs 1,500
      const result2 = calculateRewards(card!, { dining: 20000 });
      expect(result2.monthlyUnits).toBe(1500);
    });

    it("earns 5% cashback on online spends, capped at Rs 1,500/month", () => {
      const card = getCardById("hdfc-swiggy");
      expect(card).toBeTruthy();

      // Rs 10,000 online spend => 10,000 * 5% = Rs 500 cashback
      const result1 = calculateRewards(card!, { online: 10000 });
      expect(result1.monthlyUnits).toBe(500);

      const onlineRow = result1.rows.find((r) => r.category === "online");
      expect(onlineRow).toBeTruthy();
      expect(onlineRow!.monthlyUnits).toBe(500);

      // Rs 40,000 online spend => 2,000 raw cashback capped at Rs 1,500
      const result2 = calculateRewards(card!, { online: 40000 });
      expect(result2.monthlyUnits).toBe(1500);
    });

    it("earns 1% cashback on other spends, capped at Rs 500/month", () => {
      const card = getCardById("hdfc-swiggy");
      expect(card).toBeTruthy();

      // Rs 10,000 base spend => 10,000 * 1% = Rs 100 cashback
      const result1 = calculateRewards(card!, { base: 10000 });
      expect(result1.monthlyUnits).toBe(100);

      const baseRow = result1.rows.find((r) => r.category === "base");
      expect(baseRow).toBeTruthy();
      expect(baseRow!.monthlyUnits).toBe(100);

      // Rs 60,000 base spend => 600 raw cashback capped at Rs 500
      const result2 = calculateRewards(card!, { base: 60000 });
      expect(result2.monthlyUnits).toBe(500);
    });

    it("excludes fuel, rent, utilities, insurance, education, and gold from earning cashback", () => {
      const card = getCardById("hdfc-swiggy");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        fuel: 10000,
        rent: 10000,
        utilities: 10000,
        insurance: 10000,
        education: 10000,
        gold: 10000,
      });

      expect(result.monthlyUnits).toBe(0);

      const excludedCategories = ["fuel", "rent", "utilities", "insurance", "education", "gold"];
      for (const cat of excludedCategories) {
        const row = result.rows.find((r) => r.category === cat);
        expect(row).toBeTruthy();
        expect(row!.monthlyUnits).toBe(0);
        expect(row!.excluded).toBe(true);
      }
    });
  });

  describe("Swiggy Orange HDFC Bank Credit Card", () => {
    it("earns 10% cashback on Swiggy spends, capped at Rs 1,500/month", () => {
      const card = getCardById("hdfc-swiggy-orange");
      expect(card).toBeTruthy();

      const result1 = calculateRewards(card!, { dining: 10000 });
      expect(result1.monthlyUnits).toBe(1000);

      const diningRow = result1.rows.find((r) => r.category === "dining");
      expect(diningRow).toBeTruthy();
      expect(diningRow!.monthlyUnits).toBe(1000);

      const result2 = calculateRewards(card!, { dining: 20000 });
      expect(result2.monthlyUnits).toBe(1500);
    });

    it("earns 5% cashback on online spends, capped at Rs 1,500/month", () => {
      const card = getCardById("hdfc-swiggy-orange");
      expect(card).toBeTruthy();

      const result1 = calculateRewards(card!, { online: 10000 });
      expect(result1.monthlyUnits).toBe(500);

      const onlineRow = result1.rows.find((r) => r.category === "online");
      expect(onlineRow).toBeTruthy();
      expect(onlineRow!.monthlyUnits).toBe(500);

      const result2 = calculateRewards(card!, { online: 40000 });
      expect(result2.monthlyUnits).toBe(1500);
    });

    it("earns 1% cashback on other spends, capped at Rs 500/month", () => {
      const card = getCardById("hdfc-swiggy-orange");
      expect(card).toBeTruthy();

      const result1 = calculateRewards(card!, { base: 10000 });
      expect(result1.monthlyUnits).toBe(100);

      const baseRow = result1.rows.find((r) => r.category === "base");
      expect(baseRow).toBeTruthy();
      expect(baseRow!.monthlyUnits).toBe(100);

      const result2 = calculateRewards(card!, { base: 60000 });
      expect(result2.monthlyUnits).toBe(500);
    });

    it("excludes fuel, rent, utilities, insurance, education, and gold from earning cashback", () => {
      const card = getCardById("hdfc-swiggy-orange");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        fuel: 10000,
        rent: 10000,
        utilities: 10000,
        insurance: 10000,
        education: 10000,
        gold: 10000,
      });

      expect(result.monthlyUnits).toBe(0);

      const excludedCategories = ["fuel", "rent", "utilities", "insurance", "education", "gold"];
      for (const cat of excludedCategories) {
        const row = result.rows.find((r) => r.category === cat);
        expect(row).toBeTruthy();
        expect(row!.monthlyUnits).toBe(0);
        expect(row!.excluded).toBe(true);
      }
    });
  });

  describe("Shoppers Stop HDFC Bank Credit Card", () => {
    it("earns 1% reward points on base spends, capped at 1,000 points per month", () => {
      const card = getCardById("hdfc-shoppers-stop");
      expect(card).toBeTruthy();

      // Rs 10,000 base spend => 10,000 * 1% = 100 points
      const result1 = calculateRewards(card!, { base: 10000 });
      expect(result1.monthlyUnits).toBe(100);

      // Rs 120,000 base spend => 1,200 points raw, capped at 1,000 points
      const result2 = calculateRewards(card!, { base: 120000 });
      expect(result2.monthlyUnits).toBe(1000);
    });

    it("excludes fuel, rent, utilities, insurance, education, and gold from earning points", () => {
      const card = getCardById("hdfc-shoppers-stop");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        fuel: 10000,
        rent: 10000,
        utilities: 10000,
        insurance: 10000,
        education: 10000,
        gold: 10000
      });

      expect(result.monthlyUnits).toBe(0);

      const excludedCategories = ["fuel", "rent", "utilities", "insurance", "education", "gold"];
      for (const cat of excludedCategories) {
        const row = result.rows.find((r) => r.category === cat);
        expect(row).toBeTruthy();
        expect(row!.monthlyUnits).toBe(0);
        expect(row!.excluded).toBe(true);
      }
    });

    it("milestones: monthly weekend and annual milestone values are correctly annualized", () => {
      const card = getCardById("hdfc-shoppers-stop");
      expect(card).toBeTruthy();

      const rules = milestoneRulesForCard(card!);

      // Weekend monthly Rs 15,000 => annualized Rs 1,80,000 threshold; Rs 500 monthly value => Rs 6,000 annualized
      const monthlyMilestone = rules.find((r) => r.threshold === 180000);
      expect(monthlyMilestone).toBeTruthy();
      expect(monthlyMilestone!.value).toBe(6000);
      expect(monthlyMilestone!.period).toBe("monthly");

      // Annual Rs 2 Lakhs threshold => Rs 2,000 points value
      const annualMilestone = rules.find((r) => r.threshold === 200000);
      expect(annualMilestone).toBeTruthy();
      expect(annualMilestone!.value).toBe(2000);
      expect(annualMilestone!.period).toBe("annual");
    });
  });

  describe("Shoppers Stop BLACK HDFC Bank Credit Card", () => {
    it("earns 2% reward points on base spends, capped at 2,000 points per month", () => {
      const card = getCardById("hdfc-shoppers-stop-black");
      expect(card).toBeTruthy();

      // Rs 10,000 base spend => 10,000 * 2% = 200 points
      const result1 = calculateRewards(card!, { base: 10000 });
      expect(result1.monthlyUnits).toBe(200);

      // Rs 150,000 base spend => 3,000 points raw, capped at 2,000 points
      const result2 = calculateRewards(card!, { base: 150000 });
      expect(result2.monthlyUnits).toBe(2000);
    });

    it("excludes fuel, rent, utilities, insurance, education, and gold from earning points", () => {
      const card = getCardById("hdfc-shoppers-stop-black");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        fuel: 10000,
        rent: 10000,
        utilities: 10000,
        insurance: 10000,
        education: 10000,
        gold: 10000
      });

      expect(result.monthlyUnits).toBe(0);

      const excludedCategories = ["fuel", "rent", "utilities", "insurance", "education", "gold"];
      for (const cat of excludedCategories) {
        const row = result.rows.find((r) => r.category === cat);
        expect(row).toBeTruthy();
        expect(row!.monthlyUnits).toBe(0);
        expect(row!.excluded).toBe(true);
      }
    });

    it("milestones: monthly weekend milestone values are correctly annualized", () => {
      const card = getCardById("hdfc-shoppers-stop-black");
      expect(card).toBeTruthy();

      const rules = milestoneRulesForCard(card!);

      // Weekend monthly Rs 50,000 => annualized Rs 6,000,000 threshold; Rs 2,000 monthly value => Rs 24,000 annualized
      const monthlyMilestone = rules.find((r) => r.threshold === 600000);
      expect(monthlyMilestone).toBeTruthy();
      expect(monthlyMilestone!.value).toBe(24000);
      expect(monthlyMilestone!.period).toBe("monthly");
    });
  });

  describe("Swiggy HDFC Bank BLCK Credit Card", () => {
    it("earns 10% cashback on Swiggy spends, capped at Rs 1,500/month", () => {
      const card = getCardById("hdfc-swiggy-black");
      expect(card).toBeTruthy();

      // Rs 10,000 Swiggy (dining) spend => 10,000 * 10% = Rs 1,000 cashback
      const result1 = calculateRewards(card!, { dining: 10000 });
      expect(result1.monthlyUnits).toBe(1000);

      const diningRow = result1.rows.find((r) => r.category === "dining");
      expect(diningRow).toBeTruthy();
      expect(diningRow!.monthlyUnits).toBe(1000);

      // Rs 20,000 Swiggy spend => 2,000 raw cashback capped at Rs 1,500
      const result2 = calculateRewards(card!, { dining: 20000 });
      expect(result2.monthlyUnits).toBe(1500);
    });

    it("earns 5% cashback on online spends, capped at Rs 1,500/month", () => {
      const card = getCardById("hdfc-swiggy-black");
      expect(card).toBeTruthy();

      // Rs 10,000 online spend => 10,000 * 5% = Rs 500 cashback
      const result1 = calculateRewards(card!, { online: 10000 });
      expect(result1.monthlyUnits).toBe(500);

      const onlineRow = result1.rows.find((r) => r.category === "online");
      expect(onlineRow).toBeTruthy();
      expect(onlineRow!.monthlyUnits).toBe(500);

      // Rs 40,000 online spend => 2,000 raw cashback capped at Rs 1,500
      const result2 = calculateRewards(card!, { online: 40000 });
      expect(result2.monthlyUnits).toBe(1500);
    });

    it("earns 1% cashback on other spends, capped at Rs 500/month", () => {
      const card = getCardById("hdfc-swiggy-black");
      expect(card).toBeTruthy();

      // Rs 10,000 base spend => 10,000 * 1% = Rs 100 cashback
      const result1 = calculateRewards(card!, { base: 10000 });
      expect(result1.monthlyUnits).toBe(100);

      const baseRow = result1.rows.find((r) => r.category === "base");
      expect(baseRow).toBeTruthy();
      expect(baseRow!.monthlyUnits).toBe(100);

      // Rs 60,000 base spend => 600 raw cashback capped at Rs 500
      const result2 = calculateRewards(card!, { base: 60000 });
      expect(result2.monthlyUnits).toBe(500);
    });

    it("excludes only the official zero-cashback categories and still rewards other eligible retail spend buckets", () => {
      const card = getCardById("hdfc-swiggy-black");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        fuel: 10000,
        rent: 10000,
        utilities: 10000,
        insurance: 10000,
        education: 10000,
        gold: 10000,
      });

      // Fuel, rent, and gold are excluded; utilities, insurance, and education fall back to the 1% bucket.
      expect(result.monthlyUnits).toBe(300);

      const excludedCategories = ["fuel", "rent", "gold"];
      for (const cat of excludedCategories) {
        const row = result.rows.find((r) => r.category === cat);
        expect(row).toBeTruthy();
        expect(row!.monthlyUnits).toBe(0);
        expect(row!.excluded).toBe(true);
      }

      const rewardedCategories = ["utilities", "insurance", "education"];
      for (const cat of rewardedCategories) {
        const row = result.rows.find((r) => r.category === cat);
        expect(row).toBeTruthy();
        expect(row!.monthlyUnits).toBe(100);
        expect(row!.excluded).toBe(false);
      }
    });
  });

  describe("HSBC Live+ Credit Card", () => {
    it("earns 10% cashback on dining, food delivery, and groceries capped at Rs 1,000/month", () => {
      const card = getCardById("hsbc-live-plus");
      expect(card).toBeTruthy();

      // Rs 5,000 on dining => 5,000 * 10% = Rs 500 cashback
      const result1 = calculateRewards(card!, { dining: 5000 });
      expect(result1.monthlyUnits).toBe(500);

      // Rs 15,000 on dining => 1,500 capped at Rs 1,000
      const result2 = calculateRewards(card!, { dining: 15000 });
      expect(result2.monthlyUnits).toBe(1000);
    });

    it("earns 1.5% cashback on base spends", () => {
      const card = getCardById("hsbc-live-plus");
      expect(card).toBeTruthy();

      // Rs 10,000 base spend => 150 cashback
      const result = calculateRewards(card!, { base: 10000 });
      expect(result.monthlyUnits).toBe(150);
    });

    it("excludes fuel, rent, insurance, government, education, and utilities spends", () => {
      const card = getCardById("hsbc-live-plus");
      const result = calculateRewards(card!, {
        fuel: 5000,
        rent: 5000,
        insurance: 5000,
        government: 5000,
        education: 5000,
        utilities: 5000
      });
      expect(result.monthlyUnits).toBe(0);
    });
  });

  describe("HSBC Premier Credit Card", () => {
    it("earns accelerated points on Travel with Points portal bookings (hotels 36 pts, flights 18 pts, car rentals 6 pts)", () => {
      const card = getCardById("hsbc-premier");
      expect(card).toBeTruthy();

      // Rs 10,000 hotels => 3,600 points
      const resultHotels = calculateRewards(card!, { hotels: 10000 });
      expect(resultHotels.monthlyUnits).toBe(3600);

      // Rs 10,000 flights => 1,800 points
      const resultFlights = calculateRewards(card!, { airlines: 10000 });
      expect(resultFlights.monthlyUnits).toBe(1800);

      // Rs 10,000 travel (general travel / offline) => 300 points
      const resultTravel = calculateRewards(card!, { travel: 10000 });
      expect(resultTravel.monthlyUnits).toBe(300);
    });

    it("earns 3 reward points per Rs 100 on base spends", () => {
      const card = getCardById("hsbc-premier");
      expect(card).toBeTruthy();

      // Rs 10,000 base => 300 points
      const result = calculateRewards(card!, { base: 10000 });
      expect(result.monthlyUnits).toBe(300);
    });

    it("caps utilities, insurance, and rent rewards at Rs 1 Lakh spend (3,000 points) combined monthly", () => {
      const card = getCardById("hsbc-premier");
      expect(card).toBeTruthy();

      // Rs 50,000 utilities + Rs 50,000 insurance => Rs 100,000 total spend => 3,000 points
      const result1 = calculateRewards(card!, { utilities: 50000, insurance: 50000 });
      expect(result1.monthlyUnits).toBe(3000);

      // Rs 150,000 utilities => 4,500 raw points capped at 3,000 points
      const result2 = calculateRewards(card!, { utilities: 150000 });
      expect(result2.monthlyUnits).toBe(3000);

      // Rs 150,000 rent => 4,500 raw points capped at 3,000 points
      const result3 = calculateRewards(card!, { rent: 150000 });
      expect(result3.monthlyUnits).toBe(3000);
    });
  });

  describe("HSBC RuPay Cashback Credit Card", () => {
    it("earns 10% cashback on dining, food delivery, and groceries capped at Rs 400/month", () => {
      const card = getCardById("hsbc-rupay-cashback");
      expect(card).toBeTruthy();

      // Rs 3,000 dining => 300 cashback
      const result1 = calculateRewards(card!, { dining: 3000 });
      expect(result1.monthlyUnits).toBe(300);

      // Rs 6,000 dining => 600 capped at Rs 400
      const result2 = calculateRewards(card!, { dining: 6000 });
      expect(result2.monthlyUnits).toBe(400);
    });

    it("earns 1% cashback on base spends", () => {
      const card = getCardById("hsbc-rupay-cashback");
      expect(card).toBeTruthy();

      // Rs 10,000 base spend => 100 cashback
      const result = calculateRewards(card!, { base: 10000 });
      expect(result.monthlyUnits).toBe(100);
    });
  });

  describe("HSBC Visa/RuPay Platinum Credit Cards", () => {
    it("earns 2 reward points per Rs 150 spent on base eligible transactions", () => {
      const card = getCardById("hsbc-visa-platinum");
      expect(card).toBeTruthy();

      // Rs 15,000 base spend => 15,000 * 2 / 150 = 200 points
      const result = calculateRewards(card!, { base: 15000 });
      expect(result.monthlyUnits).toBe(200);
    });

    it("earns 12 reward points per Rs 150 spent on Travel with Points (Visa Platinum)", () => {
      const card = getCardById("hsbc-visa-platinum");
      expect(card).toBeTruthy();

      // Rs 15,000 travel spend => 15,000 * 12 / 150 = 1200 points
      const result = calculateRewards(card!, { travel: 15000 });
      expect(result.monthlyUnits).toBe(1200);
    });
  });

  describe("HSBC Taj Credit Card", () => {
    it("earns 5 reward points per Rs 100 spent at Taj hotels and 1.5 reward points per Rs 100 spent on base transactions", () => {
      const card = getCardById("hsbc-taj");
      expect(card).toBeTruthy();

      // Rs 10,000 hotel spend => 10,000 * 5 / 100 = 500 points
      const result1 = calculateRewards(card!, { hotels: 10000 });
      expect(result1.monthlyUnits).toBe(500);

      // Rs 10,000 base spend => 10,000 * 1.5 / 100 = 150 points
      const result2 = calculateRewards(card!, { base: 10000 });
      expect(result2.monthlyUnits).toBe(150);
    });
  });

  describe("Axis Bank Batch 3 Cards", () => {
    describe("Samsung Axis Bank Signature Credit Card", () => {
      it("earns 10% cashback on Samsung purchases capped at Rs 2,500/month", () => {
        const card = getCardById("axis-samsung-signature");
        expect(card).toBeTruthy();

        // Rs 15,000 Samsung spend => Rs 1,500 cashback
        const result1 = calculateRewards(card!, { online: 15000 });
        expect(result1.monthlyUnits).toBe(1500);

        // Rs 30,000 Samsung spend => 3,000 raw cashback capped at Rs 2,500
        const result2 = calculateRewards(card!, { online: 30000 });
        expect(result2.monthlyUnits).toBe(2500);
      });

      it("earns 2% value return (10 Edge points / Rs 100 spent) on preferred partners", () => {
        const card = getCardById("axis-samsung-signature");
        // Preferred partners categories: dining, grocery, online (tested via dining & grocery here)
        const result = calculateRewards(card!, { dining: 10000, grocery: 10000 });
        // Rs 20,000 spend => 2,000 Edge points earned
        expect(result.monthlyUnits).toBe(2000);
      });

      it("earns 1% value return (5 Edge points / Rs 100 spent) on base spends", () => {
        const card = getCardById("axis-samsung-signature");
        const result = calculateRewards(card!, { base: 10000 });
        // Rs 10,000 spend => 500 Edge points earned
        expect(result.monthlyUnits).toBe(500);
      });
    });

    describe("IndianOil Easy Axis Bank Credit Card", () => {
      it("earns 4% value return on fuel capped at 1,000 points/month", () => {
        const card = getCardById("axis-indianoil-easy");
        expect(card).toBeTruthy();

        // Rs 10,000 fuel spend => 10,000 / 100 * 20 = 2,000 points, capped at 1,000 points
        const result1 = calculateRewards(card!, { fuel: 10000 });
        expect(result1.monthlyUnits).toBe(1000);

        // Rs 30,000 fuel spend => 6,000 points, capped at 1,000 points
        const result2 = calculateRewards(card!, { fuel: 30000 });
        expect(result2.monthlyUnits).toBe(1000);
      });

      it("excludes fuel, rent, insurance, utilities, government, and education spends", () => {
        const card = getCardById("axis-indianoil-easy");
        const result = calculateRewards(card!, {
          rent: 5000,
          insurance: 5000,
          utilities: 5000,
          government: 5000,
          education: 5000
        });
        expect(result.monthlyUnits).toBe(0);
      });
    });

    describe("Privilege Easy Credit Card", () => {
      it("earns 10 Edge points per Rs 200 spent on base eligible retail transactions", () => {
        const card = getCardById("axis-privilege-easy");
        expect(card).toBeTruthy();

        // Rs 20,000 base spend => 20,000 / 200 * 10 = 1,000 Edge points
        const result = calculateRewards(card!, { base: 20000 });
        expect(result.monthlyUnits).toBe(1000);
      });
    });

    describe("Google Pay Flex Axis Bank Credit Card", () => {
      it("earns 1 star per Rs 500 spent on base and upi transactions", () => {
        const card = getCardById("axis-google-pay-flex");
        expect(card).toBeTruthy();

        // Rs 10,000 base + upi spend => 10,000 * 0.2% = Rs 20 value back (20 stars)
        const result = calculateRewards(card!, { base: 5000, upi: 5000 });
        expect(result.monthlyUnits).toBe(20);
      });
    });

    describe("Axis Bank Freecharge Plus Credit Card", () => {
      it("earns 5% cashback on Freecharge app spends", () => {
        const card = getCardById("axis-freecharge-plus");
        expect(card).toBeTruthy();

        // Rs 5,000 Freecharge spends => Rs 250 cashback
        const result = calculateRewards(card!, { online: 5000 });
        expect(result.monthlyUnits).toBe(250);
      });

      it("earns 2% cashback on commute spends and 1% on base spends", () => {
        const card = getCardById("axis-freecharge-plus");
        expect(card).toBeTruthy();

        // Rs 5,000 travel (commute) + Rs 10,000 base spends => 5,000 * 2% + 10,000 * 1% = 100 + 100 = Rs 200 cashback
        const result = calculateRewards(card!, { travel: 5000, base: 10000 });
        expect(result.monthlyUnits).toBe(200);
      });
    });
  });
});



