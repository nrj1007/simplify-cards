import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import { deriveLoungeMilestoneRules } from "../lib/card-detail";
import type { Milestone } from "../lib/types";

describe("card-detail milestone rules", () => {
  const base = getCardById("amex-platinum-travel")!;

  it("uses structured milestone labels when the milestones field is present", () => {
    const milestones: Milestone[] = [
      { threshold: 500000, period: "annual", value: 5000, kind: "voucher", label: "Structured milestone label" }
    ];
    const rules = deriveLoungeMilestoneRules({
      ...base,
      milestoneBenefits: ["Old free-text milestone line"],
      milestones
    });
    const milestoneTexts = rules.filter((rule) => rule.label === "Milestone").map((rule) => rule.text);
    expect(milestoneTexts).toContain("Structured milestone label");
    expect(milestoneTexts).not.toContain("Old free-text milestone line");
  });

  it("falls back to milestoneBenefits text when no structured field exists", () => {
    const card = { ...base, milestones: undefined, milestoneBenefits: ["Free-text fallback milestone"] };
    const rules = deriveLoungeMilestoneRules(card);
    const milestoneTexts = rules.filter((rule) => rule.label === "Milestone").map((rule) => rule.text);
    expect(milestoneTexts).toContain("Free-text fallback milestone");
  });
});
