import { describe, expect, it } from "vitest";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "../lib/card-links";

describe("card link CTA helpers", () => {
  it("uses official-site CTA copy and no sponsored rel for non-affiliate links", () => {
    const card = { applyUrl: "https://issuer.example/card" };

    expect(cardCtaHref(card)).toBe("https://issuer.example/card");
    expect(cardCtaLabel(card)).toBe("Check official site");
    expect(cardCtaRel(card)).toBe("nofollow");
  });

  it("uses Apply copy and sponsored rel for affiliate links", () => {
    const card = {
      applyUrl: "https://issuer.example/card",
      affiliateUrl: "https://affiliate.example/card"
    };

    expect(cardCtaHref(card)).toBe("https://affiliate.example/card");
    expect(cardCtaLabel(card)).toBe("Apply");
    expect(cardCtaRel(card)).toBe("sponsored nofollow");
  });
});
