import { describe, expect, it } from "vitest";
import { getLoungeConditions } from "@/lib/lounge";
import { getCardById } from "@/lib/cards";

describe("getLoungeConditions", () => {
  it("surfaces spend-gated lounge rules for cards that have them", () => {
    const card = getCardById("hdfc-diners-club-privilege");
    expect(card).toBeTruthy();

    const conditions = getLoungeConditions(card!);

    expect(conditions.some((item) => item.includes("preceding calendar quarter"))).toBe(true);
    expect(conditions.some((item) => item.toLowerCase().includes("international"))).toBe(true);
  });

  it("returns an empty list when no lounge conditions are listed", () => {
    const card = getCardById("sbi-cashback");
    expect(card).toBeTruthy();

    expect(getLoungeConditions(card!)).toEqual([]);
  });

  it("filters domestic vs international lounge conditions if type is provided", () => {
    const card = getCardById("indusind-pinnacle");
    expect(card).toBeTruthy();

    const domesticConditions = getLoungeConditions(card!, "domestic");
    const internationalConditions = getLoungeConditions(card!, "international");

    expect(domesticConditions.every((item) => !item.toLowerCase().includes("priority pass"))).toBe(true);
    expect(domesticConditions.some((item) => item.includes("₹1.5 Lakh per quarter"))).toBe(true);

    expect(internationalConditions.some((item) => item.toLowerCase().includes("priority pass"))).toBe(true);
    expect(internationalConditions.every((item) => !item.includes("₹1.5 Lakh per quarter"))).toBe(true);
  });

  it("correctly separates domestic premium upgrades from international lounge conditions for Adani One Platinum", () => {
    const card = getCardById("icici-adani-one-platinum");
    expect(card).toBeTruthy();

    const domesticConditions = getLoungeConditions(card!, "domestic");
    const internationalConditions = getLoungeConditions(card!, "international");

    expect(domesticConditions.some((item) => item.includes("premium domestic lounge upgrades"))).toBe(true);
    expect(internationalConditions.every((item) => !item.includes("premium domestic lounge upgrades"))).toBe(true);
  });
});
