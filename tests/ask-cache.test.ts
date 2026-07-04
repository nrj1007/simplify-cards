import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { answerQuestion, getAskResultCacheStatus } from "../lib/ask-ai";
import { clearAskCache } from "../lib/ask-cache";

const logPath = path.join(process.cwd(), "data", "question-logs", "unsupported-questions.json");
const originalApiKey = process.env.OPENAI_API_KEY;

function cleanupLogFile() {
  if (fs.existsSync(logPath)) fs.rmSync(logPath, { force: true });
}

describe("ask intent cache", () => {
  beforeEach(() => {
    clearAskCache();
    cleanupLogFile();
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    clearAskCache();
    cleanupLogFile();
    if (originalApiKey) process.env.OPENAI_API_KEY = originalApiKey;
    else delete process.env.OPENAI_API_KEY;
  });

  it("reuses answers for different phrasings that resolve to the same intent and card list", async () => {
    const first = await answerQuestion({ query: "best cashback card" });
    const second = await answerQuestion({ query: "top cashback card" });

    expect(getAskResultCacheStatus(first)).toBe("MISS");
    expect(getAskResultCacheStatus(second)).toBe("HIT");
    expect(second.cards.map((item) => item.card.id)).toEqual(first.cards.map((item) => item.card.id));
  });

  it("keeps distinct filters in separate cache entries", async () => {
    const unfiltered = await answerQuestion({ query: "best cashback card" });
    const filtered = await answerQuestion({ query: "best cashback card", maxAnnualFee: 0 });

    expect(getAskResultCacheStatus(unfiltered)).toBe("MISS");
    expect(getAskResultCacheStatus(filtered)).toBe("MISS");
    expect(filtered.cards.every((item) => item.card.annualFee === 0)).toBe(true);
  });

  it("does not cache unsupported or follow-up questions", async () => {
    const unsupported = await answerQuestion({ query: "latest update on HDFC Infinia" });
    const followUp = await answerQuestion({
      query: "which has lounge access too?",
      previousQuery: "best card for online cashback",
      contextCardIds: ["sbi-cashback"]
    });

    expect(getAskResultCacheStatus(unsupported)).toBeUndefined();
    expect(getAskResultCacheStatus(followUp)).toBe("SKIP");
  });
});
