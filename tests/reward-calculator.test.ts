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
});

