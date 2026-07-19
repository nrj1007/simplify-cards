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

  it("uses the max profit affiliate link from applyLinks", () => {
    const card = {
      applyUrl: "https://issuer.example/card",
      applyLinks: [
        { url: "https://issuer.example/card", provider: "official" },
        { url: "https://affiliate1.example/card", provider: "earnkaro", earnings: "Flat Rs 500 Profit" },
        { url: "https://affiliate2.example/card", provider: "earnkaro", earnings: "Flat Rs 1000 Profit" },
        { url: "https://affiliate3.example/card", provider: "earnkaro", earnings: "Flat Rs 750 Profit" }
      ]
    };

    expect(cardCtaHref(card)).toBe("https://affiliate2.example/card");
    expect(cardCtaLabel(card)).toBe("Apply");
    expect(cardCtaRel(card)).toBe("sponsored nofollow");
  });

  it("uses the official link from applyLinks if no affiliate link is present", () => {
    const card = {
      applyUrl: "https://issuer.example/card",
      applyLinks: [
        { url: "https://issuer.example/card", provider: "official" }
      ]
    };

    expect(cardCtaHref(card)).toBe("https://issuer.example/card");
    expect(cardCtaLabel(card)).toBe("Check official site");
    expect(cardCtaRel(card)).toBe("nofollow");
  });

  it("compares profit between earnkaro and cuelinks and selects the highest", () => {
    const card = {
      applyUrl: "https://issuer.example/card",
      applyLinks: [
        { url: "https://issuer.example/card", provider: "official" },
        { url: "https://earnkaro.example/card", provider: "earnkaro", earnings: "Flat Rs 1000 Profit" },
        { url: "https://cuelinks.example/card", provider: "cuelinks", earnings: "1200.00 / Lead" }
      ]
    };

    expect(cardCtaHref(card)).toBe("https://cuelinks.example/card");
    expect(cardCtaLabel(card)).toBe("Apply");
    expect(cardCtaRel(card)).toBe("sponsored nofollow");
  });
});
