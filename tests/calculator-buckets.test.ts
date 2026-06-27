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

  it("moreCategoriesForCard returns the fixed 5 minus any already present as a bucket ID", () => {
    const card = getCardById("axis-cashback");
    expect(card).toBeTruthy();
    const buckets = calculatorBucketsForCard(card!);
    const bucketIds = new Set(buckets.map((b) => b.id));
    const moreCats = moreCategoriesForCard(card!);
    
    // Axis Cashback has:
    // bucket IDs: online, utilities, base.
    // Fixed 5: ["rent", "insurance", "education", "gold", "government"]
    // None of these 5 are in the bucket IDs for axis-cashback, so it should return all 5.
    expect(moreCats).toEqual(["rent", "insurance", "education", "gold", "government"]);

    const hasAnyInBuckets = ["rent", "insurance", "education", "gold", "government"].some(cat => bucketIds.has(cat));
    expect(moreCats.length).toBe(5 - (hasAnyInBuckets ? 1 : 0)); // simple check
  });

  it("calculates rewards by bucket correctly and compares parity", () => {
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
  });
});
