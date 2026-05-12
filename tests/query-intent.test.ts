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
});
