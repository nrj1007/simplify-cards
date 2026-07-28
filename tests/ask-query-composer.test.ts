import { describe, expect, it } from "vitest";
import {
  ASK_SPEND_CHIPS,
  applyMatterChip,
  applySpendChip,
  isMatterChipActive,
  isSpendChipActive
} from "../lib/ask-query-composer";

describe("ask query composer", () => {
  it("replaces an existing matter without losing fee constraints", () => {
    expect(applyMatterChip("Best travel card under ₹5000 fee", "Cashback")).toBe(
      "Best cashback card under ₹5000 fee"
    );
  });

  it("adds a matter when the query does not already contain one", () => {
    expect(applyMatterChip("Best HDFC card", "Travel")).toBe("Best HDFC card for travel");
  });

  it("does not duplicate a selected matter", () => {
    expect(applyMatterChip("Best card for cashback", "Cashback")).toBe("Best card for cashback");
  });

  it("cleans up legacy accumulated matter suffixes", () => {
    expect(applyMatterChip("Best card for travel for cashback", "Lounge access")).toBe(
      "Best card for lounge access"
    );
  });

  it("changes an annual fee constraint to the low-fee cap", () => {
    expect(applyMatterChip("Best travel card under ₹5000 fee", "Low annual fee")).toBe(
      "Best travel card under ₹1000 annual fee"
    );
  });

  it("adds the low-fee cap when the query has no fee constraint", () => {
    expect(applyMatterChip("Best cashback card", "Low annual fee")).toBe(
      "Best cashback card under ₹1000 annual fee"
    );
  });

  it("adds and replaces one monthly spend clause", () => {
    const first = applySpendChip("Best cashback card", ASK_SPEND_CHIPS[0]);
    expect(first).toBe("Best cashback card with monthly spend under ₹25k");

    const changed = applySpendChip(first, ASK_SPEND_CHIPS[1]);
    expect(changed).toBe("Best cashback card with monthly spend ₹25k-75k");
    expect(applySpendChip(changed, ASK_SPEND_CHIPS[1])).toBe(changed);
  });

  it("detects active matter and spend chips", () => {
    const query = "Best cashback card under ₹1000 annual fee with monthly spend ₹75k+";
    expect(isMatterChipActive(query, "Cashback")).toBe(true);
    expect(isMatterChipActive(query, "Low annual fee")).toBe(true);
    expect(isSpendChipActive(query, ASK_SPEND_CHIPS[2])).toBe(true);
    expect(isSpendChipActive(query, ASK_SPEND_CHIPS[0])).toBe(false);
  });
});
