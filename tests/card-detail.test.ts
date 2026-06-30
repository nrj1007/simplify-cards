import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import { buildCardJsonLd, deriveLoungeMilestoneRules } from "../lib/card-detail";
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

  it("builds BreadcrumbList and FinancialProduct JSON-LD from card fields", () => {
    const [breadcrumb, product] = buildCardJsonLd(base);

    expect(breadcrumb).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.simplifycards.in/" },
        { "@type": "ListItem", position: 2, name: "Cards", item: "https://www.simplifycards.in/finder" },
        {
          "@type": "ListItem",
          position: 3,
          name: base.name,
          item: `https://www.simplifycards.in/cards/${base.id}`
        }
      ]
    });
    expect(product).toMatchObject({
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "@id": `https://www.simplifycards.in/cards/${base.id}`,
      name: base.name,
      url: `https://www.simplifycards.in/cards/${base.id}`,
      description: `${base.name} credit card by ${base.issuer}. Annual fee: ₹${base.annualFee}. Reward type: ${base.rewardType}.`,
      provider: {
        "@type": "BankOrCreditUnion",
        name: base.issuer
      },
      annualPercentageRate: {
        "@type": "QuantitativeValue",
        value: base.annualFee,
        unitText: "INR"
      },
      dateModified: base.lastVerified
    });
  });
});
