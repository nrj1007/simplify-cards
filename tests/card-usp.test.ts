import { describe, expect, it } from "vitest";
import { getCardById } from "../lib/cards";
import { getCardShortUsp, getCardUsp } from "../lib/card-usp";

describe("card USP copy", () => {
  it("does not render sentence-ending full stops for curated USP copy", () => {
    const card = getCardById("indusind-tiger")!;

    expect(getCardUsp(card)).toBe(
      "Lifetime-free travel card featuring a low 1.5% forex markup, complimentary lounge access, and quarterly golf privileges"
    );
    expect(getCardShortUsp(card)).toBe("Lifetime-free travel card with 1.5% forex, lounge access, and quarterly golf");
  });
});

