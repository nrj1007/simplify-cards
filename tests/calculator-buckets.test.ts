import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import {
  calculatorBucketsForCard,
  moreCategoriesForCard,
  calculateRewardsByBucket,
  calculateRewards,
  CALCULATOR_CATEGORIES
} from "../lib/reward-calculator";

describe("calculator buckets", () => {
  it("computes buckets for Axis Flipkart correctly", () => {
    const card = getCardById("axis-flipkart");
    expect(card).toBeTruthy();
    const buckets = calculatorBucketsForCard(card!);
    
    // Labels should match what is expected
    // Myntra, Flipkart, Cleartrip, Preferred merchants, Other spends
    const labels = buckets.map((b) => b.label);
    expect(labels).toEqual([
      "Myntra",
      "Flipkart",
      "Cleartrip",
      "Preferred merchants",
      "Other spends"
    ]);

    // Check properties
    expect(buckets[0].isBase).toBe(false);
    expect(buckets[4].isBase).toBe(true);
    expect(buckets[4].id).toBe("base");
  });

  it("yields a PhonePe bucket instead of utilities for hdfc-phonepe-uno", () => {
    const card = getCardById("hdfc-phonepe-uno");
    expect(card).toBeTruthy();
    const buckets = calculatorBucketsForCard(card!);
    const labels = buckets.map((b) => b.label);
    
    // Should have PhonePe (not Utility bills)
    const hasPhonePe = labels.some((l) => l.includes("PhonePe"));
    expect(hasPhonePe).toBe(true);
    expect(labels).not.toContain("Utility bills");
    
    const phonepeBucket = buckets.find((b) => b.label.includes("PhonePe"));
    expect(phonepeBucket).toBeTruthy();
    expect(phonepeBucket!.id).toBe("phonepe");
  });

  it("omits the base bucket when the card has no base reward row (e.g. hdfc-phonepe-uno)", () => {
    const card = getCardById("hdfc-phonepe-uno");
    expect(card).toBeTruthy();
    const buckets = calculatorBucketsForCard(card!);
    
    // Should not contain "base" bucket
    const hasBase = buckets.some((b) => b.id === "base");
    expect(hasBase).toBe(false);
  });

  it("collapses tiered same-category rows and excludes hidden rows", () => {
    // E.g. axis-cashback has 3 online rows, which collapse to one "Online"
    const card = getCardById("axis-cashback");
    expect(card).toBeTruthy();
    const buckets = calculatorBucketsForCard(card!);
    const labels = buckets.map((b) => b.label);
    
    expect(labels).toContain("Online");
    // Ensure only one "Online" bucket
    const onlineBuckets = buckets.filter((b) => b.label === "Online");
    expect(onlineBuckets.length).toBe(1);
    
    // Hidden rows should be excluded
    const hasHidden = buckets.some((b) => b.rewards.some((r) => r.hidden));
    expect(hasHidden).toBe(false);
  });

  it("moreCategoriesForCard returns only uncovered categories that are not excluded", () => {
    const card = getCardById("axis-cashback");
    expect(card).toBeTruthy();
    const buckets = calculatorBucketsForCard(card!);
    const moreCats = moreCategoriesForCard(card!);

    expect(moreCats.every((cat) => !buckets.some((bucket) => bucket.id === cat))).toBe(true);
    expect(moreCats.every((cat) => !calculateRewards(card!, { [cat]: 1000 }).rows.some((row) => row.category === cat && row.excluded))).toBe(true);

    // Test that au-ixigo (which has a dedicated insurance row) does not return insurance in moreCategoriesForCard
    const auIxigo = getCardById("au-ixigo");
    expect(auIxigo).toBeTruthy();
    const auIxigoMoreCats = moreCategoriesForCard(auIxigo!);
    expect(auIxigoMoreCats).not.toContain("insurance");
  });

  it("calculates rewards by bucket correctly and compares row-level parity", () => {
    const card = getCardById("axis-cashback");
    expect(card).toBeTruthy();

    const spendProfile = {
      online: 10000,
      dining: 5000,
      travel: 4000,
      hotels: 0,
      airlines: 0,
      fuel: 0,
      grocery: 0,
      utilities: 3000,
      upi: 0,
      amazon: 0,
      international: 0,
      base: 8000,
      rent: 0,
      insurance: 0,
      education: 0,
      gold: 0,
      government: 0
    };

    const resultCanonical = calculateRewards(card!, spendProfile);
    
    // Convert spend profile to bucket spends
    const bucketSpend: Record<string, number> = {
      online: 10000,
      utilities: 3000,
      base: 8000 + 5000 + 4000 // dining, travel, base all go to base bucket on axis-cashback
    };
    
    const resultBucket = calculateRewardsByBucket(card!, bucketSpend);

    // Sum of monthly units should match because the calculations are mathematically equivalent
    expect(resultBucket.monthlyUnits).toBeCloseTo(resultCanonical.monthlyUnits, 2);
    expect(resultBucket.annualUnits).toBeCloseTo(resultCanonical.annualUnits, 2);

    // Row-level assertions for non-base rows
    const nonBaseBucketRows = resultBucket.rows.filter(r => r.category !== "base");
    for (const bucketRow of nonBaseBucketRows) {
      const canonicalRow = resultCanonical.rows.find((r) => r.category === bucketRow.category);
      expect(canonicalRow).toBeTruthy();
      expect(bucketRow.monthlySpend).toBe(canonicalRow!.monthlySpend);
      expect(bucketRow.monthlyUnits).toBeCloseTo(canonicalRow!.monthlyUnits, 2);
      expect(bucketRow.excluded).toBe(canonicalRow!.excluded);
      expect(bucketRow.earnsBaseRateOnly).toBe(canonicalRow!.earnsBaseRateOnly);
    }

    // Row-level assertions for base row (combines base + dining + travel)
    const baseBucketRow = resultBucket.rows.find(r => r.category === "base");
    expect(baseBucketRow).toBeTruthy();
    
    const canonicalBaseRows = resultCanonical.rows.filter(r => 
      r.category === "base" || r.category === "dining" || r.category === "travel"
    );
    const sumCanonicalSpend = canonicalBaseRows.reduce((sum, r) => sum + r.monthlySpend, 0);
    const sumCanonicalUnits = canonicalBaseRows.reduce((sum, r) => sum + r.monthlyUnits, 0);

    expect(baseBucketRow!.monthlySpend).toBe(sumCanonicalSpend);
    expect(baseBucketRow!.monthlyUnits).toBeCloseTo(sumCanonicalUnits, 2);
  });

  it("calculateRewardsByBucket skips MORE_CATEGORIES when covered by a bucket to avoid double-processing", () => {
    const card = getCardById("au-ixigo");
    expect(card).toBeTruthy();

    const buckets = calculatorBucketsForCard(card!);
    const insuranceBucket = buckets.find((b) => b.id === "insurance");
    expect(insuranceBucket).toBeTruthy();

    const bucketSpend = {
      insurance: 5000
    };

    const result = calculateRewardsByBucket(card!, bucketSpend);

    const insuranceRows = result.rows.filter((r) => r.category === "insurance");
    expect(insuranceRows.length).toBe(1);
    expect(insuranceRows[0].monthlySpend).toBe(5000);
  });
});
