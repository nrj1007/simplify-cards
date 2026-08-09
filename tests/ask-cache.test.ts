import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerQuestion, getAskResultCacheStatus } from "../lib/ask-ai";
import { askCacheSize, clearAskCache, getAskCache, setAskCache } from "../lib/ask-cache";

const logPath = path.join(process.cwd(), "data", "question-logs", "unsupported-questions.ask-cache.test.json");
const originalApiKey = process.env.OPENAI_API_KEY;
const originalFetch = global.fetch;

function cleanupLogFile() {
  if (fs.existsSync(logPath)) fs.rmSync(logPath, { force: true });
}

describe("ask intent cache", () => {
  beforeEach(() => {
    vi.stubEnv("UNSUPPORTED_QUESTION_LOG_PATH", logPath);
    clearAskCache();
    cleanupLogFile();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    global.fetch = vi.fn(async () =>
      Response.json({
        output_text: JSON.stringify({
          summary: "Mock summary"
        }),
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ summary: "Mock summary" }) }]
            }
          }
        ]
      })
    ) as typeof fetch;
  });

  afterEach(() => {
    clearAskCache();
    cleanupLogFile();
    if (originalApiKey) process.env.OPENAI_API_KEY = originalApiKey;
    else delete process.env.OPENAI_API_KEY;
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.useRealTimers();
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

  it("keeps cache entries for 30 days and expires them after the TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T00:00:00.000Z"));

    const result = {
      summary: "Cached answer",
      cards: [{ card: { id: "axis-atlas", name: "Axis Atlas" } }],
      highlights: [],
      meta: { intent: "top-cards" }
    };

    setAskCache("ttl-test", result as any);
    vi.setSystemTime(new Date("2026-09-07T23:59:59.000Z"));
    expect(getAskCache("ttl-test")?.summary).toBe("Cached answer");

    vi.setSystemTime(new Date("2026-09-08T00:00:01.000Z"));
    expect(getAskCache("ttl-test")).toBeNull();
    expect(askCacheSize()).toBe(0);
  });
});
