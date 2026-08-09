import { beforeEach, describe, expect, it } from "vitest";
import { clearAskBotSignals, detectAskBotSignals } from "../lib/ask-bot-signals";

describe("Ask bot signal detection", () => {
  beforeEach(() => {
    clearAskBotSignals();
  });

  it("flags generated repeated Ask templates in log-only mode", () => {
    const result = detectAskBotSignals(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.90",
          "user-agent": "Mozilla/5.0 Chrome/120.0"
        }
      }),
      {
        query:
          "Is the Smart Credit Card a good fit for me? with spend rs 75k+ with spend rs 25k-75k for travel for lounge access for low annual fee"
      }
    );

    expect(result).toMatchObject({
      suspicious: true,
      action: "log",
      ipDailyCount: 1,
      queryPatternDailyCount: 1
    });
    expect(result.riskScore).toBeGreaterThanOrEqual(4);
    expect(result.rules).toContain("generated_query_pattern");
    expect(result.rules).toContain("empty_referrer");
    expect(result.ipHash).toHaveLength(16);
    expect(result.queryHash).toHaveLength(16);
    expect(result.queryPatternHash).toHaveLength(16);
  });

  it("does not flag an ordinary browser Ask request with a referrer", () => {
    const result = detectAskBotSignals(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.91",
          "referer": "https://simplifycards.in/ask",
          "user-agent": "Mozilla/5.0 Chrome/120.0"
        }
      }),
      { query: "best travel credit cards in India" }
    );

    expect(result.suspicious).toBe(false);
    expect(result.action).toBe("allow");
    expect(result.riskScore).toBe(0);
  });
});
