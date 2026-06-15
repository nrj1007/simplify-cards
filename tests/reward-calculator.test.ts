import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import { cards } from "../lib/cards";
import { calculateRewards } from "../lib/reward-calculator";
import { milestoneRulesForCard } from "../lib/recommend";
import { parseDisplayRateUnits } from "../lib/reward-rate-parse";
import type { Milestone } from "../lib/types";

// Rows whose displayRate text is intentionally inconsistent with the (correct) rate.
const RATE_DISPLAY_ALLOWLIST = new Set([
  "hdfc-diners-club-black-metal::smartbuy hotels",
  "hdfc-diners-club-black-metal::smartbuy flights"
]);
const isCashbackType = (rt: string) => /cashback/i.test(rt) && !/point|mile|coin|star|credit|neucoin/i.test(rt);

describe("reward rate convention", () => {
  it("keeps reward.rate (units per Rs 100) consistent with every parseable displayRate", () => {
    const offenders: string[] = [];
    for (const card of cards) {
      if (isCashbackType(card.rewardType)) continue;
      for (const reward of card.rewards) {
        if (RATE_DISPLAY_ALLOWLIST.has(`${card.id}::${reward.category}`)) continue;
        const parsed = parseDisplayRateUnits(reward.displayRate);
        if (parsed && Math.abs(parsed.basePerRs100 - reward.rate) > 0.01) {
          offenders.push(`${card.id} [${reward.category}] rate=${reward.rate} vs ${parsed.basePerRs100.toFixed(3)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("scores Amex MR earn as units (not the old %-return), e.g. amex-gold base = 2 points/Rs100", () => {
    const card = getCardById("amex-gold");
    expect(card).toBeTruthy();
    // "1 Membership Rewards Point / Rs 50" = 2 units per Rs 100 (was mis-stored as 0.5 %-return).
    const retail = card!.rewards.find((r) => r.category === "retail");
    expect(retail!.rate).toBe(2);
    // Rs 50,000 retail/mo earns 1,000 MR points/mo (uncapped retail row).
    const result = calculateRewards(card!, { base: 50000 });
    expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(1000);
  });

  it("buckets spend across structured reward tiers (Magnus base earn)", () => {
    // Magnus base: 6 pts/Rs100 up to Rs 1.5L/mo (tier 0–150000), then 17.5 pts/Rs100 above
    // (tier 150000–∞), sourced from the structured tierLowerBound/tierUpperBound fields.
    const card = getCardById("axis-magnus");
    expect(card).toBeTruthy();
    const tiered = card!.rewards.filter((r) => r.category === "base" && r.tierLowerBound !== undefined);
    expect(tiered.length).toBe(2);

    // Rs 3L/mo base: 150000*6/100 + 150000*17.5/100 = 9,000 + 26,250 = 35,250 units/mo.
    const result = calculateRewards(card!, { base: 300000 });
    expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(35250);
  });

  it("applies the structured postCapRate beyond a reward cap (matching recommend.ts)", () => {
    // Marriott Bonvoy "travel, dining, entertainment": 2.6667 pts/Rs100, capped at 1,600 pts/mo,
    // then a reduced 1.33 pts/Rs100. The displayRate has no "then" clause, so this earning comes
    // purely from the structured `postCapRate` field — which the calculator must honor.
    const card = getCardById("hdfc-marriott-bonvoy");
    expect(card).toBeTruthy();
    const reward = card!.rewards.find((r) => r.category.includes("dining"))!;
    expect(reward.capMonthly).toBe(1600);
    expect(reward.postCapRate).toBeGreaterThan(0);

    // Rs 1,00,000/mo travel: 60k reaches the 1,600-pt cap, the remaining 40k earns at 1.33/100.
    const result = calculateRewards(card!, { travel: 100000 });
    const travel = result.rows.find((r) => r.category === "travel")!;
    // 1,600 (capped) + 40,000 * 1.33 / 100 = 2,132 — strictly above the bare cap.
    expect(travel.monthlyUnits).toBeGreaterThan(reward.capMonthly!);
    expect(travel.monthlyUnits).toBeCloseTo(1600 + (40000 * reward.postCapRate!) / 100, 2);
  });
});

describe("reward calculator", () => {
  // Catalog-wide coverage lives in tests/calculator-golden.test.ts (a snapshot of every card's earn
  // at moderate and high spend). The cases below assert specific, hand-checked behaviors.

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

    it("calculates rewards correctly for standard SBI Card MILES", () => {
      const card = getCardById("sbi-card-miles");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        travel: 20000,
        base: 10000
      });
      expect(result.monthlyUnits).toBe(250);
      expect(result.annualUnits).toBe(3000);
    });

    it("calculates rewards correctly for SimplySAVE SBI Card", () => {
      const card = getCardById("simplysave-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 3000,
        grocery: 3000,
        base: 15000
      });
      expect(result.monthlyUnits).toBeCloseTo(500, 0);
      expect(result.annualUnits).toBeCloseTo(6000, 0);
    });

    it("calculates rewards correctly for IndiGo SBI Card ELITE", () => {
      const card = getCardById("indigo-sbi-elite");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        travel: 10000,
        hotels: 10000,
        base: 10000
      });
      expect(result.monthlyUnits).toBe(1200);
      expect(result.annualUnits).toBe(14400);
    });

    it("calculates rewards correctly for IndiGo SBI Card", () => {
      const card = getCardById("indigo-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        travel: 10000,
        hotels: 10000,
        base: 10000
      });
      expect(result.monthlyUnits).toBe(600);
      expect(result.annualUnits).toBe(7200);
    });

    it("calculates rewards correctly for BPCL SBI Card with monthly caps", () => {
      const card = getCardById("bpcl-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        fuel: 12000, // 13 points / Rs 100 -> 1560 points, capped at 1300 points
        grocery: 10000, // 5 points / Rs 100 -> 500 points
        dining: 10000, // 5 points / Rs 100 -> 500 points
        base: 10000 // 1 point / Rs 100 -> 100 points
      });
      expect(result.monthlyUnits).toBe(1300 + 1000 + 100);
      expect(result.annualUnits).toBe(2400 * 12);
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

    it("calculates rewards correctly for Shaurya Select SBI Card", () => {
      const card = getCardById("shaurya-select-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 10000,    // 10 Reward Points / Rs 100 spent = 1000 units
        grocery: 10000,   // 10 Reward Points / Rs 100 spent = 1000 units
        base: 20000,      // 2 Reward Points / Rs 100 spent = 400 units
        fuel: 5000        // excluded
      });

      expect(result.monthlyUnits).toBe(2400);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);

      const rules = milestoneRulesForCard(card!);
      // Quarterly milestone: Rs 500 voucher (net Rs 250) at Rs 50k -> annualized: Rs 1000 at Rs 200k
      // Annual milestone: Rs 7000 voucher (net Rs 3500) at Rs 5L -> Rs 3500 at Rs 500k
      expect(rules).toHaveLength(2);
      const quarterly = rules.find(r => r.period === "quarterly");
      expect(quarterly?.threshold).toBe(200000);
      expect(quarterly?.value).toBe(1000);
      expect(quarterly?.isVoucher).toBe(true);
    });

    it("calculates rewards correctly for Landmark Rewards SBI Card SELECT", () => {
      const card = getCardById("landmark-rewards-sbi-select");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 10000,          // 10 Reward Points / Rs 100 = 1000 units
        international: 10000,   // 10 Reward Points / Rs 100 = 1000 units
        base: 10000,            // Other retail purchases at 2 Reward Points / Rs 100 = 200 units
        fuel: 5000
      });

      expect(result.monthlyUnits).toBe(2200);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);

      const rules = milestoneRulesForCard(card!);
      // Milestone: 12,000 points (worth Rs 3,000) at Rs 3 lakh annual spent
      expect(rules).toHaveLength(1);
      expect(rules[0].threshold).toBe(300000);
      expect(rules[0].value).toBe(3000);
    });

    it("calculates rewards correctly for Doctor's SBI Card", () => {
      const card = getCardById("doctors-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        travel: 10000,
        base: 10000,
        international: 10000,
        fuel: 5000,
        rent: 5000
      });

      // travel: 10,000 * 5 = 500
      // base: 10,000 * 1 = 100
      // international: 10,000 * 5 = 500
      // fuel: 0 (excluded)
      // rent: 0 (excluded)
      expect(result.monthlyUnits).toBe(1100);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      const rentRow = result.rows.find((r) => r.category === "rent");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);
      expect(rentRow?.monthlyUnits).toBe(0);
      expect(rentRow?.excluded).toBe(true);

      // Travel cap: 800,000 * 5 / 100 = 40,000 units, capped at 7500
      const capResult = calculateRewards(card!, {
        travel: 800000
      });
      expect(capResult.monthlyUnits).toBe(7500);
    });

    it("calculates rewards correctly for Reliance SBI Card PRIME", () => {
      const card = getCardById("reliance-sbi-prime");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 10000, // 5 pts/Rs 100 = 500
        base: 10000,   // 2 pts/Rs 100 = 200
        fuel: 5000     // excluded
      });

      expect(result.monthlyUnits).toBe(700);

      const fuelRow = result.rows.find((r) => r.category === "fuel");
      expect(fuelRow?.monthlyUnits).toBe(0);
      expect(fuelRow?.excluded).toBe(true);

      // dining/travel/intl combined cap: 200,000 * 5/100 = 10,000 units, capped at 7500
      const capResult = calculateRewards(card!, {
        dining: 200000
      });
      expect(capResult.monthlyUnits).toBe(7500);

      // Verify milestones
      const rules = milestoneRulesForCard(card!);
      expect(rules).toHaveLength(1);
      expect(rules[0].threshold).toBe(300000);
      expect(rules[0].value).toBe(4375);
      expect(rules[0].isVoucher).toBe(true);
    });

    it("calculates rewards correctly for Reliance SBI Card", () => {
      const card = getCardById("reliance-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 10000, // 5 pts/Rs 100 = 500
        base: 10000,   // 1 pt/Rs 100 = 100
        fuel: 5000     // excluded
      });

      expect(result.monthlyUnits).toBe(600);

      // Dining cap: 120,000 * 5/100 = 6,000 units, capped at 5000
      const capResult = calculateRewards(card!, {
        dining: 120000
      });
      expect(capResult.monthlyUnits).toBe(5000);
    });

    it("calculates rewards correctly for AURUM SBI Card", () => {
      const card = getCardById("aurum-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        base: 10000,     // 4 pts/Rs 100 = 400
        fuel: 5000,      // excluded
        rent: 5000,      // excluded
        government: 5000 // excluded
      });

      expect(result.monthlyUnits).toBe(400);

      const governmentRow = result.rows.find((r) => r.category === "government");
      expect(governmentRow?.monthlyUnits).toBe(0);
      expect(governmentRow?.excluded).toBe(true);

      // Verify milestones
      const rules = milestoneRulesForCard(card!);
      // monthly milestone 1500 * 12 = 18000, annual 5000, 10000, 20000. Total = 4 rules
      expect(rules).toHaveLength(4);
    });

    it("calculates rewards correctly for Apollo SBI Card SELECT", () => {
      const card = getCardById("apollo-sbi-select");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 10000, // 2 pts/Rs 100 = 200
        base: 10000,   // 0.5 pts/Rs 100 = 50
        fuel: 5000     // excluded
      });

      expect(result.monthlyUnits).toBe(250);

      // Dining/Travel cap: 300,000 * 2/100 = 6,000 units, capped at 5000
      const capResult = calculateRewards(card!, {
        dining: 300000
      });
      expect(capResult.monthlyUnits).toBe(5000);
    });

    it("calculates rewards correctly for Shaurya SBI Card", () => {
      const card = getCardById("shaurya-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 10000, // 5 pts/Rs 100 = 500
        grocery: 10000, // 5 pts/Rs 100 = 500
        base: 10000,   // 1 pt/Rs 100 = 100
        fuel: 5000     // excluded
      });

      expect(result.monthlyUnits).toBe(1100);
    });

    it("calculates rewards correctly for Landmark Rewards SBI Card", () => {
      const card = getCardById("landmark-rewards-sbi");
      expect(card).toBeTruthy();

      const result = calculateRewards(card!, {
        dining: 10000, // 5 pts/Rs 100 = 500
        base: 10000    // Base row at 1 RP/Rs 100 = 100 units
      });

      expect(result.monthlyUnits).toBe(600);

      // Verify milestones
      const rules = milestoneRulesForCard(card!);
      expect(rules).toHaveLength(1);
      expect(rules[0].threshold).toBe(200000);
      expect(rules[0].value).toBe(2000);
    });
  });

  it("derives Sapphiro milestone rules from the structured milestones field", () => {
    const card = getCardById("icici-sapphiro");
    expect(card).toBeTruthy();

    const rules = milestoneRulesForCard(card!);

    // Structured milestones: a Rs 4 lakh base unlock and an incremental "beyond Rs 4 lakh"
    // milestone whose 20,000-point cap is folded into its label (no separate cap milestone row).
    const base = rules.find((r) => r.threshold === 400000);
    expect(base).toBeTruthy();

    const incremental = rules.find((r) => r.threshold === 500000);
    expect(incremental).toBeTruthy();
    expect(incremental!.label).toMatch(/capped at 20,000 points total/i);
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

      // Quarterly Rs 30k = annualised Rs 1,20,000 threshold; Rs 500 GV (net Rs 250) × 4 quarters = Rs 1,000 annualised value
      const quarterlyMilestone = rules.find((r) => r.threshold === 120000);
      expect(quarterlyMilestone).toBeTruthy();
      expect(quarterlyMilestone!.value).toBe(1000);  // 250 net × 4 quarters
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

  describe("Axis Bank Batch 1 Cards", () => {
    describe("IndianOil Axis Bank Credit Card", () => {
      it("earns fuel rewards capped at 1000 points", () => {
        const card = getCardById("axis-indianoil");
        expect(card).toBeTruthy();

        // Rs 5,000 fuel spend => 1000 points (using rate = 4% / statementBalanceValue = 0.2 => 20 points per Rs 100)
        const result1 = calculateRewards(card!, { fuel: 5000 });
        expect(result1.monthlyUnits).toBe(1000);

        // Rs 10,000 fuel spend => capped at 1000 points
        const result2 = calculateRewards(card!, { fuel: 10000 });
        expect(result2.monthlyUnits).toBe(1000);
      });

      it("earns 1% value return on online shopping", () => {
        const card = getCardById("axis-indianoil");
        // Rs 5,000 online spends => 50 rupees value return / 0.2 = 250 points
        const result = calculateRewards(card!, { online: 5000 });
        expect(result.monthlyUnits).toBe(250);
      });
    });

    describe("Axis Bank Select Credit Card", () => {
      it("earns retail shopping rewards capped at 2,000 points/month", () => {
        const card = getCardById("axis-select");
        expect(card).toBeTruthy();

        // Rs 20,000 spend => 2,000 points
        const result1 = calculateRewards(card!, { grocery: 20000 });
        expect(result1.monthlyUnits).toBe(2000);

        // Rs 30,000 spend => capped at 2,000 points
        const result2 = calculateRewards(card!, { grocery: 30000 });
        expect(result2.monthlyUnits).toBe(2000);
      });

      it("earns 1% value return on base spends", () => {
        const card = getCardById("axis-select");
        // Rs 10,000 base spend => 200 rupees value return / 0.2 = 1000 points (using first base category rule with rate = 2)
        const result = calculateRewards(card!, { base: 10000 });
        expect(result.monthlyUnits).toBe(1000);
      });
    });

    describe("Axis Bank Reserve Credit Card", () => {
      it("earns domestic and international rewards", () => {
        const card = getCardById("axis-reserve");
        expect(card).toBeTruthy();

        // Rs 20,000 domestic => 1500 points
        const resultDomestic = calculateRewards(card!, { base: 20000 });
        expect(resultDomestic.monthlyUnits).toBe(1500);

        // Rs 20,000 international => 3000 points
        const resultIntl = calculateRewards(card!, { international: 20000 });
        expect(resultIntl.monthlyUnits).toBe(3000);
      });
    });

    describe("IndianOil Axis Bank Premium Credit Card", () => {
      it("earns fuel rewards capped at 600 points", () => {
        const card = getCardById("axis-indianoil-premium");
        expect(card).toBeTruthy();

        // Rs 25,000 fuel spend => capped at 600 points (EDGE Miles)
        const result = calculateRewards(card!, { fuel: 25000 });
        expect(result.monthlyUnits).toBe(600);
      });
    });

    describe("Cashback Credit Card", () => {
      it("earns 7% cashback on online spends capped at Rs 4,000/month", () => {
        const card = getCardById("axis-cashback");
        expect(card).toBeTruthy();

        // Rs 10,000 online spends => Rs 700 cashback
        const result1 = calculateRewards(card!, { online: 10000 });
        expect(result1.monthlyUnits).toBe(700);

        // Rs 60,000 online spends => Rs 4,000 cashback
        const result2 = calculateRewards(card!, { online: 60000 });
        expect(result2.monthlyUnits).toBe(4000);
      });

      it("earns 0.5% cashback on utility spends capped at Rs 100/month", () => {
        const card = getCardById("axis-cashback");
        // Rs 30,000 utility spend => Rs 100 cashback
        const result = calculateRewards(card!, { utilities: 30000 });
        expect(result.monthlyUnits).toBe(100);
      });
    });
  });

  describe("Axis Bank Batch 2 Cards", () => {
    describe("Axis Bank REWARDS Credit Card", () => {
      it("earns departmental store rewards capped at 1,120 points/month", () => {
        const card = getCardById("axis-rewards");
        expect(card).toBeTruthy();

        // Rs 5,000 departmental store (online) spend => 800 points
        const result1 = calculateRewards(card!, { online: 5000 });
        expect(result1.monthlyUnits).toBe(800);

        // Rs 10,000 departmental store (online) spend => capped at 1120 points
        const result2 = calculateRewards(card!, { online: 10000 });
        expect(result2.monthlyUnits).toBe(1120);
      });
    });

    describe("Axis Bank My Zone Credit Card", () => {
      it("earns base rewards", () => {
        const card = getCardById("axis-my-zone");
        expect(card).toBeTruthy();

        // Rs 10,000 base spend => 200 points
        const result = calculateRewards(card!, { base: 10000 });
        expect(result.monthlyUnits).toBe(200);
      });
    });

    describe("Neo Credit Card", () => {
      it("earns base rewards", () => {
        const card = getCardById("axis-neo");
        expect(card).toBeTruthy();

        // Rs 10,000 base spend => 50 points
        const result = calculateRewards(card!, { base: 10000 });
        expect(result.monthlyUnits).toBe(50);
      });
    });

    describe("AXIS BANK PRIVILEGE Credit Card", () => {
      it("earns base rewards", () => {
        const card = getCardById("axis-privilege");
        expect(card).toBeTruthy();

        // Rs 20,000 base spend => 1000 points
        const result = calculateRewards(card!, { base: 20000 });
        expect(result.monthlyUnits).toBe(1000);
      });
    });

    describe("HORIZON Credit Card", () => {
      it("earns travel and base edge miles", () => {
        const card = getCardById("axis-horizon");
        expect(card).toBeTruthy();

        // Rs 10,000 travel => 500 miles
        const result1 = calculateRewards(card!, { travel: 10000 });
        expect(result1.monthlyUnits).toBe(500);

        // Rs 10,000 base => 200 miles
        const result2 = calculateRewards(card!, { base: 10000 });
        expect(result2.monthlyUnits).toBe(200);
      });
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

  describe("Axis Bank Batch 4 Cards", () => {
    describe("Platinum Credit Card", () => {
      it("earns 0.6% return on base domestic spends and 1.2% on international spends", () => {
        const card = getCardById("axis-platinum");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, { base: 20000, international: 20000 });
        expect(result.monthlyUnits).toBe(1800); // 600 domestic + 1200 international points
      });

      it("excludes fuel, rent, insurance, utilities, government, and education spends", () => {
        const card = getCardById("axis-platinum");
        const result = calculateRewards(card!, {
          fuel: 5000,
          rent: 5000,
          insurance: 5000,
          utilities: 5000,
          government: 5000,
          education: 5000
        });
        expect(result.monthlyUnits).toBe(0);
      });
    });

    describe("Axis Bank Freecharge Credit Card", () => {
      it("earns 1 Edge reward point per Rs 200 spent on eligible base spends", () => {
        const card = getCardById("axis-freecharge");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, { base: 10000 });
        expect(result.monthlyUnits).toBe(50);
      });

      it("earns monthly milestone bonus points based on spend thresholds", () => {
        const card = getCardById("axis-freecharge");
        expect(card).toBeTruthy();

        const milestones = milestoneRulesForCard(card!);
        expect(milestones).toHaveLength(2);

        const first = milestones[0];
        expect(first.threshold).toBe(24000); // 2000 * 12
        expect(first.value).toBe(240); // 20 * 12
        expect(first.period).toBe("monthly");
      });
    });

    describe("Fibe Axis Bank Credit Card", () => {
      it("earns 3% cashback on food delivery, entertainment & local commute, capped at Rs 1,500/month", () => {
        const card = getCardById("axis-fibe");
        expect(card).toBeTruthy();

        const result1 = calculateRewards(card!, { dining: 10000, online: 10000, travel: 10000 });
        expect(result1.monthlyUnits).toBe(900); // 30,000 * 3%

        const result2 = calculateRewards(card!, { online: 60000 });
        expect(result2.monthlyUnits).toBe(1500); // capped
      });

      it("earns 1% cashback on other eligible retail spends", () => {
        const card = getCardById("axis-fibe");
        const result = calculateRewards(card!, { base: 10000 });
        expect(result.monthlyUnits).toBe(100);
      });
    });

    describe("Flipkart Axis Bank Super Elite Credit Card", () => {
      it("earns 12 SuperCoins per Rs 100 spent on Flipkart, and 2 SuperCoins per Rs 100 spent elsewhere", () => {
        const card = getCardById("axis-flipkart-super-elite");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, { online: 10000, base: 10000 });
        expect(result.monthlyUnits).toBe(1400); // 1200 + 200
      });
    });

    describe("Miles and More Axis Bank Credit Card", () => {
      it("earns flat 4 Award Miles per Rs 200 spent on eligible transactions", () => {
        const card = getCardById("axis-miles-and-more");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, { base: 10000, airlines: 10000, travel: 10000 });
        expect(result.monthlyUnits).toBe(600); // 30,000 / 200 * 4
      });

      it("excludes fuel, rent, insurance, utilities, government, and gold spends", () => {
        const card = getCardById("axis-miles-and-more");
        const result = calculateRewards(card!, {
          fuel: 5000,
          rent: 5000,
          insurance: 5000,
          utilities: 5000,
          government: 5000,
          gold: 5000
        });
        expect(result.monthlyUnits).toBe(0);
      });
    });
  });

  describe("audited YES Bank cards", () => {
    describe("YES BANK ACE Credit Card", () => {
      it("earns online accelerated, base, and utilities rewards at correct rates", () => {
        const card = getCardById("yes-ace");
        expect(card).toBeTruthy();

        // Online rate: 4 points / Rs 100
        // Base rate: 2 points / Rs 100
        // Utilities rate: 1 point / Rs 100
        const result = calculateRewards(card!, {
          online: 10000,
          base: 10000,
          utilities: 10000
        });

        // Online: 400 points, Base: 200 points, Utilities: 100 points
        expect(result.monthlyUnits).toBe(700);
      });

      it("enforces monthly caps on online and utilities", () => {
        const card = getCardById("yes-ace");
        expect(card).toBeTruthy();

        // Online cap: 5000 points (reached at Rs 1,25,000 spend)
        // Utilities cap: 600 points (reached at Rs 60,000 spend)
        const result = calculateRewards(card!, {
          online: 150000,
          utilities: 70000
        });

        expect(result.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(5000);
        expect(result.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(600);
      });

      it("excludes fuel, rent, wallet load, government, and EMI", () => {
        const card = getCardById("yes-ace");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, {
          fuel: 5000,
          rent: 5000,
          government: 5000
        });

        expect(result.monthlyUnits).toBe(0);
      });
    });

    describe("YES BANK Anq Phi Credit Card", () => {
      it("earns accelerated travel, dining, grocery, online, and base rewards", () => {
        const card = getCardById("yes-anq-phi");
        expect(card).toBeTruthy();

        // Travel, dining, grocery, online rate: 12 points / Rs 100
        // Base rate: 2 points / Rs 100
        const result = calculateRewards(card!, {
          travel: 5000,
          dining: 5000,
          grocery: 5000,
          online: 5000,
          base: 5000
        });

        // 12 * 50 * 4 + 2 * 50 = 2400 + 100 = 2500 points
        expect(result.monthlyUnits).toBe(2500);
      });
    });

    describe("YES BANK ELITE+ Credit Card", () => {
      it("earns online, base, and utilities rewards with correct caps", () => {
        const card = getCardById("yes-elite-plus");
        expect(card).toBeTruthy();

        // Online rate: 6 points / Rs 100, cap: 3000 (reached at Rs 50k spend)
        // Base rate: 3 points / Rs 100
        // Utilities rate: 2 points / Rs 100, cap: 1200 (reached at Rs 60k spend)
        const result = calculateRewards(card!, {
          online: 60000,
          base: 10000,
          utilities: 70000
        });

        expect(result.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(3000);
        expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(300);
        expect(result.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(1200);
      });
    });

    describe("YES First Preferred Credit Card", () => {
      it("earns travel, dining, utilities, and base rewards with correct caps", () => {
        const card = getCardById("yes-first-preferred");
        expect(card).toBeTruthy();

        // Travel rate: 8 points / Rs 100, cap: 3000 (reached at Rs 37,500 spend)
        // Dining rate: 8 points / Rs 100, cap: 3000 (reached at Rs 37,500 spend)
        // Base rate: 4 points / Rs 100
        // Utilities rate: 2 points / Rs 100
        const result = calculateRewards(card!, {
          travel: 40000,
          dining: 40000,
          base: 10000,
          utilities: 10000
        });

        expect(result.rows.find((r) => r.category === "travel")!.monthlyUnits).toBe(3000);
        expect(result.rows.find((r) => r.category === "dining")!.monthlyUnits).toBe(3000);
        expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(400);
        expect(result.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(200);
      });

      it("verifies the structured milestone rewards", () => {
        const card = getCardById("yes-first-preferred");
        expect(card).toBeTruthy();

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(1);
        expect(rules[0].threshold).toBe(750000);
        expect(rules[0].value).toBe(5000);
        expect(rules[0].period).toBe("annual");
        expect(rules[0].isVoucher).toBe(false);
      });
    });

    describe("YES Bank Kiwi Credit Card", () => {
      it("earns UPI, online, and base rewards", () => {
        const card = getCardById("yes-kiwi");
        expect(card).toBeTruthy();

        // UPI rate: 1.5% cashback (rupees)
        // Online rate: 0.5% cashback (rupees)
        // Base rate: 1 point / Rs 100 (which is 1 unit per Rs 100)
        const result = calculateRewards(card!, {
          upi: 10000,
          online: 10000,
          base: 10000
        });

        // UPI: 150 Rs, Online: 50 Rs, Base: 100 units
        // Since rewardType is "cashback and reward points", the monthlyUnits is the sum of these values.
        expect(result.monthlyUnits).toBe(300);
      });
    });

    describe("YES BANK Klick RuPay Credit Card", () => {
      it("earns UPI and base rewards", () => {
        const card = getCardById("yes-klick-rupay");
        expect(card).toBeTruthy();

        // UPI rate: 2 points / Rs 100
        // Base rate: 1 point / Rs 100
        const result = calculateRewards(card!, {
          upi: 10000,
          base: 10000
        });

        expect(result.monthlyUnits).toBe(300); // 200 + 100
      });
    });

    describe("YES BANK MARQUEE Credit Card", () => {
      it("earns online, base, and utilities rewards at correct rates", () => {
        const card = getCardById("yes-marquee");
        expect(card).toBeTruthy();

        // Online rate: 18 points / Rs 100 spent
        // Base rate: 9 points / Rs 100 spent
        // Utilities/Select rate: 5 points / Rs 100 spent
        const result = calculateRewards(card!, {
          online: 10000,
          base: 10000,
          utilities: 10000
        });

        // 1800 + 900 + 500 = 3200 points
        expect(result.monthlyUnits).toBe(3200);
      });

      it("enforces monthly caps correctly", () => {
        const card = getCardById("yes-marquee");
        expect(card).toBeTruthy();

        // Online cap: 100000 points
        // Base cap: 100000 points
        // Utilities cap: 1250 points (reached at Rs 25,000 spent)
        const result = calculateRewards(card!, {
          online: 600000, // 1,08,000 points raw, capped at 1,00,000
          utilities: 30000 // 1,500 points raw, capped at 1,250
        });

        expect(result.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(100000);
        expect(result.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(1250);
      });

      it("excludes fuel, rent, wallet load, and cash advance", () => {
        const card = getCardById("yes-marquee");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, {
          fuel: 5000,
          rent: 5000
        });

        expect(result.monthlyUnits).toBe(0);
      });
    });

    describe("YES BANK Paisabazaar PaisaSave RuPay Credit Card", () => {
      it("earns UPI scan and pay rewards above Rs 2,000 and excludes below", () => {
        const card = getCardById("yes-paisabazaar-paisasave-rupay");
        expect(card).toBeTruthy();

        // UPI rate: 1% cashback on scans > Rs 2000
        const result1 = calculateRewards(card!, { upi: 5000 });
        expect(result1.monthlyUnits).toBe(50); // 5000 * 1%

        const result2 = calculateRewards(card!, { upi: 1500 });
        expect(result2.monthlyUnits).toBe(15); // transaction-level threshold is not modeled at monthly level in calculator
      });
    });

    describe("YES BANK Paisabazaar PaisaSave Credit Card", () => {
      it("earns travel, dining, and base cashback", () => {
        const card = getCardById("yes-paisabazaar-paisasave");
        expect(card).toBeTruthy();

        // Travel: 6%, Dining: 6%, Base: 1%
        const result = calculateRewards(card!, {
          travel: 10000,
          dining: 10000,
          base: 10000
        });

        // 600 + 600 + 100 = 1300 units
        expect(result.monthlyUnits).toBe(1300);
      });

      it("enforces monthly caps on travel and dining", () => {
        const card = getCardById("yes-paisabazaar-paisasave");
        expect(card).toBeTruthy();

        // Cap is Rs 3,000 per category per month (reached at Rs 50k spent)
        const result = calculateRewards(card!, {
          travel: 60000,
          dining: 60000
        });

        expect(result.rows.find((r) => r.category === "travel")!.monthlyUnits).toBe(3000);
        expect(result.rows.find((r) => r.category === "dining")!.monthlyUnits).toBe(3000);
      });
    });

    describe("YES BANK POP-CLUB Credit Card", () => {
      it("earns online, POP UPI, and base POPcoins", () => {
        const card = getCardById("yes-pop-club");
        expect(card).toBeTruthy();

        // Online: 10% (10 POPcoins / Rs 100)
        // UPI via POP App: 7% (7 POPcoins / Rs 100)
        // Base: 2% (2 POPcoins / Rs 100)
        const result = calculateRewards(card!, {
          online: 5000,
          upi: 5000,
          base: 5000
        });

        // 500 + 350 + 100 = 950 POPcoins
        expect(result.monthlyUnits).toBe(950);
      });

      it("verifies structured milestones", () => {
        const card = getCardById("yes-pop-club");
        expect(card).toBeTruthy();

        const rules = milestoneRulesForCard(card!);
        expect(rules).toHaveLength(1);
        expect(rules[0].threshold).toBe(150000);
        expect(rules[0].value).toBe(1500);
        expect(rules[0].isVoucher).toBe(false);
      });
    });

    describe("YES BANK RESERV Credit Card", () => {
      it("earns online, base, and utilities rewards at correct rates", () => {
        const card = getCardById("yes-reserv");
        expect(card).toBeTruthy();

        // Online: 12.0
        // Base: 6.0
        // Utilities: 3.0
        const result = calculateRewards(card!, {
          online: 10000,
          base: 10000,
          utilities: 10000
        });

        // 1200 + 600 + 300 = 2100 points
        expect(result.monthlyUnits).toBe(2100);
      });

      it("enforces monthly caps correctly", () => {
        const card = getCardById("yes-reserv");
        expect(card).toBeTruthy();

        // Online cap: 9000 points (reached at Rs 75,000 spend)
        // Utilities cap: 750 points (reached at Rs 25,000 spend)
        const result = calculateRewards(card!, {
          online: 100000,
          utilities: 30000
        });

        expect(result.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(9000);
        expect(result.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(750);
      });
    });

    describe("YES BANK SELECT Credit Card", () => {
      it("earns online, base, and utilities rewards at correct rates", () => {
        const card = getCardById("yes-select");
        expect(card).toBeTruthy();

        // Online: 4.0
        // Base: 2.0
        // Utilities: 1.0
        const result = calculateRewards(card!, {
          online: 10000,
          base: 10000,
          utilities: 10000
        });

        // 400 + 200 + 100 = 700 points
        expect(result.monthlyUnits).toBe(700);
      });

      it("enforces monthly caps correctly", () => {
        const card = getCardById("yes-select");
        expect(card).toBeTruthy();

        // Online cap: 1250 points
        // Utilities cap: 150 points
        const result = calculateRewards(card!, {
          online: 40000,
          utilities: 20000
        });

        expect(result.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(1250);
        expect(result.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(150);
      });

      it("verifies structured milestones", () => {
        const card = getCardById("yes-select");
        expect(card).toBeTruthy();

        const rules = milestoneRulesForCard(card!);
        expect(rules).toHaveLength(1);
        expect(rules[0].threshold).toBe(600000);
        expect(rules[0].value).toBe(15000);
        expect(rules[0].isVoucher).toBe(false);
      });
    });
  });

  describe("IDFC FIRST Bank Cards", () => {
    describe("IDFC FIRST WOW! Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-wow");
        expect(card).toBeTruthy();
        
        // Online: 2.0 per Rs 100 spent (4 points per Rs 200)
        // Utilities: 0.5 per Rs 100 spent (1 point per Rs 200)
        const result = calculateRewards(card!, {
          online: 10000,
          utilities: 10000
        });
        
        // 200 + 50 = 250 points
        expect(result.monthlyUnits).toBe(250);
      });
    });

    describe("IDFC FIRST Classic Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-first-classic");
        expect(card).toBeTruthy();
        
        // Base: 1.5 per Rs 100 spent (3 points per Rs 200)
        // Dining: 5.0 per Rs 100 spent (10 points per Rs 200)
        // Utilities: 0.5 per Rs 100 spent (1 point per Rs 200)
        const result = calculateRewards(card!, {
          base: 10000,
          dining: 10000,
          utilities: 10000
        });
        
        // 150 + 500 + 50 = 700 points
        expect(result.monthlyUnits).toBe(700);
      });
    });

    describe("IDFC FIRST Millennia Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-first-millennia");
        expect(card).toBeTruthy();
        
        // Base: 1.5 per Rs 100 spent
        // Travel: 5.0 per Rs 100 spent
        // Utilities: 0.5 per Rs 100 spent
        const result = calculateRewards(card!, {
          base: 10000,
          travel: 10000,
          utilities: 10000
        });
        
        // 150 + 500 + 50 = 700 points
        expect(result.monthlyUnits).toBe(700);
      });
    });

    describe("IDFC FIRST Select Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-first-select");
        expect(card).toBeTruthy();
        
        // Base: 1.5 per Rs 100 spent
        // International: 5.0 per Rs 100 spent
        // Utilities: 0.5 per Rs 100 spent
        const result = calculateRewards(card!, {
          base: 10000,
          international: 10000,
          utilities: 10000
        });
        
        // 150 + 500 + 50 = 700 points
        expect(result.monthlyUnits).toBe(700);
      });
    });

    describe("IDFC FIRST Wealth Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-first-wealth");
        expect(card).toBeTruthy();
        
        // Base: 1.5 per Rs 100 spent
        // Dining: 5.0 per Rs 100 spent
        // Utilities: 0.5 per Rs 100 spent
        const result = calculateRewards(card!, {
          base: 10000,
          dining: 10000,
          utilities: 10000
        });
        
        // 150 + 500 + 50 = 700 points
        expect(result.monthlyUnits).toBe(700);
      });
    });

    describe("IDFC FIRST Power+ Credit Card", () => {
      it("earns rewards and applies caps correctly", () => {
        const card = getCardById("idfc-first-power-plus");
        expect(card).toBeTruthy();
        
        // Fuel: 20.0 per Rs 100 spent, capped at 2400 points (reached at Rs 12,000 spend)
        // Grocery: 20.0 per Rs 100 spent, capped at 400 points (reached at Rs 2,000 spend)
        // Base: 2.0 per Rs 100 spent
        const result = calculateRewards(card!, {
          fuel: 20000,
          grocery: 5000,
          base: 10000
        });
        
        // Fuel: 2400 points (capped)
        // Grocery: 400 points (capped)
        // Base: 200 points
        // Total: 2400 + 400 + 200 = 3000 points
        expect(result.monthlyUnits).toBe(3000);
      });
    });

    describe("IDFC FIRST Power Credit Card", () => {
      it("earns rewards and applies caps correctly", () => {
        const card = getCardById("idfc-first-power");
        expect(card).toBeTruthy();

        // Fuel: 14.0 per Rs 100 spent, capped at 700 points (reached at Rs 5,000 spend)
        // Grocery: 10.0 per Rs 100 spent, capped at 400 points (reached at Rs 4,000 spend)
        // Base: 1.3333 per Rs 100 spent
        const result = calculateRewards(card!, {
          fuel: 10000,
          grocery: 5000,
          base: 15000
        });

        // Fuel: 700 points (capped)
        // Grocery: 400 points (capped)
        // Base: 15000 * 1.3333 / 100 = 200 points
        // Total: 700 + 400 + 200 = 1300 points
        expect(result.monthlyUnits).toBeCloseTo(1300, 1);
      });
    });

    describe("IDFC FIRST Mayura Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-mayura");
        expect(card).toBeTruthy();

        // Base: 3.3333 per Rs 100 spent
        // Travel: 6.6667 per Rs 100 spent
        // Utilities: 0.6667 per Rs 100 spent
        const result = calculateRewards(card!, {
          base: 15000,
          travel: 15000,
          utilities: 15000
        });

        // Base: 15000 * 3.3333 / 100 = 500 points
        // Travel: 15000 * 6.6667 / 100 = 1000 points
        // Utilities: 15000 * 0.6667 / 100 = 100 points
        // Total: 500 + 1000 + 100 = 1600 points
        expect(result.monthlyUnits).toBeCloseTo(1600, 1);
      });
    });

    describe("IDFC FIRST Ashva Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-ashva");
        expect(card).toBeTruthy();

        // Base: 3.3333 per Rs 100 spent
        // Travel: 6.6667 per Rs 100 spent
        // Utilities: 0.6667 per Rs 100 spent
        const result = calculateRewards(card!, {
          base: 15000,
          travel: 15000,
          utilities: 15000
        });

        // Base: 15000 * 3.3333 / 100 = 500 points
        // Travel: 15000 * 6.6667 / 100 = 1000 points
        // Utilities: 15000 * 0.6667 / 100 = 100 points
        // Total: 500 + 1000 + 100 = 1600 points
        expect(result.monthlyUnits).toBeCloseTo(1600, 1);
      });
    });

    describe("IDFC FIRST EA₹N Credit Card", () => {
      it("earns rewards and applies caps correctly", () => {
        const card = getCardById("idfc-first-earn");
        expect(card).toBeTruthy();

        // UPI (via IDFC app): 1.0% cashback, capped at Rs 500
        // Online / base: 0.5% cashback, capped at Rs 500
        const result = calculateRewards(card!, {
          upi: 20000,
          online: 20000,
          base: 20000
        });

        // UPI: 20000 * 1% = 200
        // Online: 20000 * 0.5% = 100
        // Base: 20000 * 0.5% = 100
        // Total: 200 + 100 + 100 = 400 cashback
        expect(result.monthlyUnits).toBe(400);
      });
    });

    describe("IndiGo IDFC FIRST Credit Card", () => {
      it("earns rewards at correct rates", () => {
        const card = getCardById("idfc-indigo");
        expect(card).toBeTruthy();

        // Airlines (IndiGo): 6.0 per Rs 100 spent
        // Base: 3.0 per Rs 100 spent
        // UPI / Utility: 0.5 per Rs 100 spent
        const result = calculateRewards(card!, {
          airlines: 10000,
          base: 10000,
          upi: 10000
        });

        // Airlines: 10000 * 6 / 100 = 600 BluChips
        // Base: 10000 * 3 / 100 = 300 BluChips
        // UPI: 10000 * 0.5 / 100 = 50 BluChips
        // Total: 600 + 300 + 50 = 950 BluChips
        expect(result.monthlyUnits).toBe(950);
      });
    });

    describe("IndusInd Bank Platinum Aura Edge Credit Card", () => {
      it("earns rewards at correct rates including utility reduction", () => {
        const card = getCardById("indusind-aura-edge");
        expect(card).toBeTruthy();

        // grocery: 10000 * 1.6% = 160
        // base: 10000 * 0.2% = 20
        // utilities: 10000 * 0.28% = 28
        const result = calculateRewards(card!, {
          grocery: 10000,
          base: 10000,
          utilities: 10000
        });

        // Total: 160 + 20 + 28 = 208 value return
        expect(result.monthlyUnits).toBe(208);
      });
    });

    describe("IndusInd Bank Celesta Credit Card", () => {
      it("earns rewards at correct rates including utility reduction", () => {
        const card = getCardById("indusind-celesta");
        expect(card).toBeTruthy();

        // base: 10000 * 1.05% = 105
        // utilities: 10000 * 0.49% = 49
        const result = calculateRewards(card!, {
          base: 10000,
          utilities: 10000
        });

        // Total: 105 + 49 = 154 value return
        expect(result.monthlyUnits).toBe(154);
      });
    });

    describe("IndusInd Bank Crest Credit Card", () => {
      it("earns rewards at correct rates including utility reduction", () => {
        const card = getCardById("indusind-crest");
        expect(card).toBeTruthy();

        // base: 10000 * 1.05% = 105
        // utilities: 10000 * 0.49% = 49
        const result = calculateRewards(card!, {
          base: 10000,
          utilities: 10000
        });

        // Total: 105 + 49 = 154 value return
        expect(result.monthlyUnits).toBe(154);
      });
    });

    describe("IndusInd Bank Indulge Credit Card", () => {
      it("earns rewards at correct rates including utility reduction", () => {
        const card = getCardById("indusind-indulge");
        expect(card).toBeTruthy();

        // base: 10000 * 1.05% = 105
        // utilities: 10000 * 0.49% = 49
        const result = calculateRewards(card!, {
          base: 10000,
          utilities: 10000
        });

        // Total: 105 + 49 = 154 value return
        expect(result.monthlyUnits).toBe(154);
      });
    });

    describe("IndusInd Bank Nexxt Credit Card", () => {
      it("earns rewards at correct base rates", () => {
        const card = getCardById("indusind-nexxt");
        expect(card).toBeTruthy();

        // base: 15000 * 0.2% = 30
        const result = calculateRewards(card!, {
          base: 15000
        });

        // Total: 30 value return
        expect(result.monthlyUnits).toBeCloseTo(30, 1);
      });
    });

    describe("Kotak Solitaire Credit Card", () => {
      it("earns rewards at correct rates (10 Air Miles per Rs 100 on travel via Kotak Unbox, 3 Air Miles per Rs 100 base)", () => {
        const card = getCardById("kotak-solitaire");
        expect(card).toBeTruthy();

        // travel: 10000 -> 1000 Air Miles
        // base: 10000 -> 300 Air Miles
        const result = calculateRewards(card!, {
          travel: 10000,
          base: 10000
        });

        expect(result.rows.find((r) => r.category === "travel")!.monthlyUnits).toBe(1000);
        expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(300);
        expect(result.monthlyUnits).toBe(1300);
      });

      it("enforces monthly cap of 1,00,000 Air Miles on travel and postCapRate of 3 Air Miles per Rs 100", () => {
        const card = getCardById("kotak-solitaire");
        expect(card).toBeTruthy();

        // travel: 11,00,000 spend -> 1,00,000 capped at travel rate, plus 1,00,000 * 3 / 100 = 3000 at post-cap rate.
        // Total travel units: 1,00,000 + 3000 = 1,03,000 Air Miles.
        const result = calculateRewards(card!, {
          travel: 1100000
        });

        expect(result.rows.find((r) => r.category === "travel")!.monthlyUnits).toBe(103000);
      });

      it("excludes fuel, rent, wallet load, utilities, insurance, education, government, and gaming", () => {
        const card = getCardById("kotak-solitaire");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          insurance: 10000,
          education: 10000,
          government: 10000,
          utilities: 10000
        });

        expect(result.monthlyUnits).toBe(0);
        expect(result.rows.every((row) => row.monthlyUnits === 0)).toBe(true);
      });
    });

    describe("Kotak Zen Signature Credit Card", () => {
      it("earns rewards at correct rates (5 Zen Points per Rs 150 base)", () => {
        const card = getCardById("kotak-zen-signature");
        expect(card).toBeTruthy();

        // base: 15000 spend -> 1000 Zen Points (matches the first 'base' row which is the shopping row at 10 Zen Points / Rs 150)
        const result = calculateRewards(card!, {
          base: 15000
        });

        // 15000 * (10/150) = 1000 Zen Points
        expect(result.monthlyUnits).toBeCloseTo(1000, 1);
      });

      it("excludes wallet load, fuel, rent, gaming, and EMI", () => {
        const card = getCardById("kotak-zen-signature");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000
        });

        expect(result.monthlyUnits).toBe(0);
      });
    });

    describe("Kotak 811 Credit Card", () => {
      it("earns rewards at correct rates (2 points / Rs 100 online, 1 point / Rs 100 base/offline)", () => {
        const card = getCardById("kotak-811");
        expect(card).toBeTruthy();

        // online: 10000 -> 200 Reward Points
        // base: 10000 -> 100 Reward Points
        const result = calculateRewards(card!, {
          online: 10000,
          base: 10000
        });

        expect(result.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(200);
        expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(100);
        expect(result.monthlyUnits).toBe(300);
      });

      it("excludes education, wallet load, fuel, rent, government, and insurance spends", () => {
        const card = getCardById("kotak-811");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          insurance: 10000,
          education: 10000,
          government: 10000
        });

        expect(result.monthlyUnits).toBe(0);
        expect(result.rows.every((row) => row.monthlyUnits === 0)).toBe(true);
      });
    });

    describe("Kotak Infinite Credit Card", () => {
      it("earns rewards at correct base rate (1 point / Rs 250 spent)", () => {
        const card = getCardById("kotak-infinite");
        expect(card).toBeTruthy();

        // base: 10000 -> 40 Reward Points
        const result = calculateRewards(card!, {
          base: 10000
        });

        expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(40);
        expect(result.monthlyUnits).toBe(40);
      });

      it("excludes wallet, fuel, rent, insurance, utilities, education, government, and gaming spends", () => {
        const card = getCardById("kotak-infinite");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          insurance: 10000,
          utilities: 10000,
          education: 10000,
          government: 10000
        });

        expect(result.monthlyUnits).toBe(0);
        expect(result.rows.every((row) => row.monthlyUnits === 0)).toBe(true);
      });

      it("annualises the monthly milestone correctly", () => {
        const card = getCardById("kotak-infinite");
        expect(card).toBeTruthy();

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(1);
        expect(rules[0].threshold).toBe(0);
        expect(rules[0].value).toBe(9600);
      });
    });

    describe("811 Dream Different Credit Card", () => {
      it("earns rewards at correct rates (2 points / Rs 100 online, 1 point / Rs 100 base/offline/utilities)", () => {
        const card = getCardById("kotak-811-dream-different");
        expect(card).toBeTruthy();

        // online: 10000 -> 200 Reward Points
        // utilities: 10000 -> 100 Reward Points
        // base: 10000 -> 100 Reward Points
        const result = calculateRewards(card!, {
          online: 10000,
          utilities: 10000,
          base: 10000
        });

        expect(result.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(200);
        expect(result.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(100);
        expect(result.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(100);
        expect(result.monthlyUnits).toBe(400);
      });

      it("excludes education, wallet load, fuel, rent, government, and insurance spends", () => {
        const card = getCardById("kotak-811-dream-different");
        expect(card).toBeTruthy();

        const result = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          insurance: 10000,
          education: 10000,
          government: 10000
        });

        expect(result.monthlyUnits).toBe(0);
        expect(result.rows.every((row) => row.monthlyUnits === 0)).toBe(true);
      });

      it("does not have active milestone rules", () => {
        const card = getCardById("kotak-811-dream-different");
        expect(card).toBeTruthy();

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(0);
      });
    });

    describe("Federal Bank Celesta Credit Card", () => {
      it("earns rewards at correct rates (3x travel/intl, 2x dining, 1x base, 1x insurance capped at 250)", () => {
        const card = getCardById("federal-celesta");
        expect(card).toBeTruthy();

        const resultAccelerated = calculateRewards(card!, {
          travel: 10000,
          dining: 10000,
          base: 10000
        });
        expect(resultAccelerated.rows.find((r) => r.category === "travel")!.monthlyUnits).toBe(300);
        expect(resultAccelerated.rows.find((r) => r.category === "dining")!.monthlyUnits).toBe(200);
        expect(resultAccelerated.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(100);
        expect(resultAccelerated.monthlyUnits).toBe(600);

        const resultInsuranceCapped = calculateRewards(card!, {
          insurance: 50000
        });
        expect(resultInsuranceCapped.rows.find((r) => r.category === "insurance")!.monthlyUnits).toBe(250);
        expect(resultInsuranceCapped.monthlyUnits).toBe(250);

        const resultCombined = calculateRewards(card!, {
          travel: 5000,
          dining: 10000,
          base: 5000,
          insurance: 10000
        });
        expect(resultCombined.monthlyUnits).toBe(500);

        const resultExclusions = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          government: 10000
        });
        expect(resultExclusions.monthlyUnits).toBe(0);

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(0);
      });
    });

    describe("Federal Bank Imperio Credit Card", () => {
      it("earns rewards at correct rates (3% grocery, 2% utilities, 3% base, 1% insurance capped at 250)", () => {
        const card = getCardById("federal-imperio");
        expect(card).toBeTruthy();

        const resultRates = calculateRewards(card!, {
          grocery: 10000,
          utilities: 10000,
          base: 10000
        });
        expect(resultRates.rows.find((r) => r.category === "grocery")!.monthlyUnits).toBe(300);
        expect(resultRates.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(200);
        expect(resultRates.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(300);
        expect(resultRates.monthlyUnits).toBe(800);

        const resultInsuranceCapped = calculateRewards(card!, {
          insurance: 50000
        });
        expect(resultInsuranceCapped.rows.find((r) => r.category === "insurance")!.monthlyUnits).toBe(250);
        expect(resultInsuranceCapped.monthlyUnits).toBe(250);

        const resultCombined = calculateRewards(card!, {
          grocery: 5000,
          utilities: 5000,
          base: 5000,
          insurance: 10000
        });
        expect(resultCombined.monthlyUnits).toBe(500);

        const resultExclusions = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          government: 10000
        });
        expect(resultExclusions.monthlyUnits).toBe(0);

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(1);
        expect(rules[0].threshold).toBe(200000);
        expect(rules[0].value).toBe(600); // Rs 300 BigBasket voucher (net Rs 150) × 4 quarters
        expect(rules[0].isVoucher).toBe(true);
      });
    });

    describe("Federal Bank Signet Credit Card", () => {
      it("earns rewards at correct rates (3% base, 1% insurance capped at 250)", () => {
        const card = getCardById("federal-signet");
        expect(card).toBeTruthy();

        const resultRates = calculateRewards(card!, {
          base: 10000
        });
        expect(resultRates.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(300);
        expect(resultRates.monthlyUnits).toBe(300);

        const resultInsuranceCapped = calculateRewards(card!, {
          insurance: 50000
        });
        expect(resultInsuranceCapped.rows.find((r) => r.category === "insurance")!.monthlyUnits).toBe(250);
        expect(resultInsuranceCapped.monthlyUnits).toBe(250);

        const resultExclusions = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          government: 10000
        });
        expect(resultExclusions.monthlyUnits).toBe(0);

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(0);
      });
    });

    describe("Federal Bank Wave RuPay Credit Card", () => {
      it("earns rewards at correct rates (0.5% upi, 0.5% base, 0.5% insurance capped at 250)", () => {
        const card = getCardById("federal-wave");
        expect(card).toBeTruthy();

        const resultRates = calculateRewards(card!, {
          upi: 10000,
          base: 10000
        });
        expect(resultRates.rows.find((r) => r.category === "upi")!.monthlyUnits).toBe(50);
        expect(resultRates.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(50);
        expect(resultRates.monthlyUnits).toBe(100);

        const resultInsuranceCapped = calculateRewards(card!, {
          insurance: 100000
        });
        expect(resultInsuranceCapped.rows.find((r) => r.category === "insurance")!.monthlyUnits).toBe(250);
        expect(resultInsuranceCapped.monthlyUnits).toBe(250);

        const resultExclusions = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000,
          government: 10000
        });
        expect(resultExclusions.monthlyUnits).toBe(0);

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(1);
        expect(rules[0].threshold).toBe(200000);
        expect(rules[0].value).toBe(1000);
        expect(rules[0].isVoucher).toBe(false);
      });
    });

    describe("OneCard Partner Banks", () => {
      it("earns rewards at correct rates (10% online, 2% base)", () => {
        const card = getCardById("onecard");
        expect(card).toBeTruthy();

        const resultRates = calculateRewards(card!, {
          online: 10000,
          base: 10000
        });
        expect(resultRates.rows.find((r) => r.category === "online")!.monthlyUnits).toBe(1000);
        expect(resultRates.rows.find((r) => r.category === "base")!.monthlyUnits).toBe(200);
        expect(resultRates.monthlyUnits).toBe(1200);

        const resultExclusions = calculateRewards(card!, {
          fuel: 10000,
          rent: 10000
        });
        expect(resultExclusions.monthlyUnits).toBe(0);
        expect(resultExclusions.rows.every((row) => row.monthlyUnits === 0)).toBe(true);

        const resultBaseFallback = calculateRewards(card!, {
          utilities: 10000,
          insurance: 10000,
          education: 10000,
          government: 10000
        });
        expect(resultBaseFallback.rows.find((r) => r.category === "utilities")!.monthlyUnits).toBe(200);
        expect(resultBaseFallback.rows.find((r) => r.category === "insurance")!.monthlyUnits).toBe(200);
        expect(resultBaseFallback.rows.find((r) => r.category === "education")!.monthlyUnits).toBe(200);
        expect(resultBaseFallback.rows.find((r) => r.category === "government")!.monthlyUnits).toBe(200);
        expect(resultBaseFallback.monthlyUnits).toBe(800);

        const rules = milestoneRulesForCard(card!);
        expect(rules.length).toBe(0);
      });
    });
  });
});






