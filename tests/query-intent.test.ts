import { describe, expect, it } from "vitest";
import { parseQueryIntent } from "../lib/query-intent";

describe("query intent parser", () => {
  it("parses cashback, lounge, and fee-cap intent", () => {
    const intent = parseQueryIntent({
      query: "best cashback card with lounge access under Rs 5000"
    });

    expect(intent.useCases).toContain("cashback");
    expect(intent.tags).toContain("lounge");
    expect(intent.maxAnnualFee).toBe(5000);
    expect(intent.wantsLounge).toBe(true);
  });

  it("parses issuer, network, and ltf signals", () => {
    const intent = parseQueryIntent({
      query: "best hdfc rupay ltf card for upi"
    });

    expect(intent.issuers).toContain("HDFC Bank");
    expect(intent.networks).toContain("RuPay");
    expect(intent.segments).toContain("ltf");
    expect(intent.tags).toContain("upi");
  });

  it("parses redemption ecosystems and travel intent", () => {
    const intent = parseQueryIntent({
      query: "best travel card for accor and air india redemption"
    });

    expect(intent.useCases).toContain("travel");
    expect(intent.redemptionBuckets).toContain("accor");
    expect(intent.redemptionBuckets).toContain("air-india");
  });

  it("parses beginner and secured-card intent", () => {
    const intent = parseQueryIntent({
      query: "beginner secured credit builder card"
    });

    expect(intent.segments).toContain("beginner");
    expect(intent.tags).toContain("secured");
  });

  it("parses latest-info questions for no-web-search policy", () => {
    const intent = parseQueryIntent({
      query: "latest devaluation on sbi cashback card"
    });

    expect(intent.needsLatestInfo).toBe(true);
    expect(intent.issuers).toContain("SBI Card");
  });

  it("parses issuer-led recommendation questions with fee caps", () => {
    const intent = parseQueryIntent({
      query: "top icici card under 5000"
    });

    expect(intent.issuers).toContain("ICICI Bank");
    expect(intent.maxAnnualFee).toBe(5000);
    expect(intent.useCases).toHaveLength(0);
  });

  it("parses issuer-led travel recommendation questions", () => {
    const intent = parseQueryIntent({
      query: "best axis travel card"
    });

    expect(intent.issuers).toContain("Axis Bank");
    expect(intent.useCases).toContain("travel");
  });

  it("normalizes HSBC issuer-led recommendation questions to the stored bank issuer name", () => {
    const intent = parseQueryIntent({
      query: "best hsbc card"
    });

    expect(intent.issuers).toContain("HSBC Bank");
    expect(intent.useCases).toHaveLength(0);
  });

  it("parses life time free phrasing and focused spend intent", () => {
    const intent = parseQueryIntent({
      query: "top life time free cards for grocery spends"
    });

    expect(intent.segments).toContain("ltf");
    expect(intent.inferredSpend?.grocery).toBe(53000);
    expect(Object.entries(intent.inferredSpend ?? {}).every(([category, amount]) => category === "grocery" || amount === 0)).toBe(true);
  });

  it("parses spend-mix percentages into a spend profile", () => {
    const intent = parseQueryIntent({
      query: "my spends are 50% travel, 25% grocery, 25% utilities, suggest a card for me"
    });

    expect(intent.inferredSpend).toMatchObject({
      travel: 26500,
      grocery: 13250,
      utilities: 13250
    });
  });
});
