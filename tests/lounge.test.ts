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
});
