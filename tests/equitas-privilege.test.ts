import { describe, expect, it } from "vitest";
import {
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
});
