import { describe, expect, it } from "vitest";
import {
  EQUITAS_PRIVILEGE_BENEFITS,
  EQUITAS_PRIVILEGE_TIERS,
  equitasPrivilegeTierForMonthlySpend,
  equitasPrivilegeTierNote
} from "../lib/equitas-privilege";

describe("Equitas Privilege Program", () => {
  it.each([
    [0, "Blue"],
    [19999, "Blue"],
    [20000, "Silver"],
    [39999, "Silver"],
    [40000, "Gold"],
    [59999, "Gold"],
    [60000, "Platinum"],
    [99999, "Platinum"],
    [100000, "Diamond"]
  ] as const)("maps Rs %i monthly spend to %s", (monthlySpend, expectedTier) => {
    expect(equitasPrivilegeTierForMonthlySpend(monthlySpend)).toBe(expectedTier);
  });

  it("explains the even monthly-spend assumption for an upgraded tier", () => {
    expect(equitasPrivilegeTierNote("Gold")).toBe(
      "Considering Gold tier assumes your total spend is distributed evenly and the monthly threshold is met in all three months of each calendar quarter."
    );
  });

  it("exposes the official monthly and quarterly qualification thresholds", () => {
    expect(EQUITAS_PRIVILEGE_TIERS).toEqual([
      { tier: "Blue", monthlySpend: 0, quarterlySpend: 0 },
      { tier: "Silver", monthlySpend: 20000, quarterlySpend: 60000 },
      { tier: "Gold", monthlySpend: 40000, quarterlySpend: 120000 },
      { tier: "Platinum", monthlySpend: 60000, quarterlySpend: 180000 },
      { tier: "Diamond", monthlySpend: 100000, quarterlySpend: 300000 }
    ]);
  });

  it("lists the benefit categories described by Equitas", () => {
    expect(EQUITAS_PRIVILEGE_BENEFITS).toContain("Higher reward redemption value");
    expect(EQUITAS_PRIVILEGE_BENEFITS).toContain("Hotel room night worth Rs 3,500");
  });
});
