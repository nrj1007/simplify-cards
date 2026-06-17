import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerQuestion, getUnsupportedQuestionReason } from "../lib/ask-ai";
import { scoreCards } from "../lib/recommend";

const logPath = path.join(process.cwd(), "data", "question-logs", "unsupported-questions.json");
const originalApiKey = process.env.OPENAI_API_KEY;
const originalFetch = global.fetch;

function cleanupLogFile() {
  if (fs.existsSync(logPath)) fs.rmSync(logPath, { force: true });
}

describe("ask ai fallback policy", () => {
  beforeEach(() => {
    cleanupLogFile();
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanupLogFile();
    if (originalApiKey) process.env.OPENAI_API_KEY = originalApiKey;
    else delete process.env.OPENAI_API_KEY;
    global.fetch = originalFetch;
  });

  it("flags latest-information questions as unsupported without web search", () => {
    expect(getUnsupportedQuestionReason({ query: "latest devaluation on SBI Cashback" })).toMatch(/live\/latest/i);
  });

  it("logs unsupported latest-information questions", async () => {
    const answer = await answerQuestion({ query: "latest update on HDFC Infinia" });

    expect(answer.cards).toHaveLength(0);
    expect(answer.needsDatabaseUpdate).toBe(true);
    expect(answer.summary).toMatch(/logged this question/i);
    expect(fs.existsSync(logPath)).toBe(true);

    const logEntries = JSON.parse(fs.readFileSync(logPath, "utf8")) as Array<{ query: string; reason: string }>;
    // Filter to this specific query since question-logs.test.ts may write concurrently
    const thisEntry = logEntries.find(e => e.query === "latest update on HDFC Infinia");
    expect(thisEntry).toBeDefined();
    expect(thisEntry!.query).toBe("latest update on HDFC Infinia");
  });

  it("returns normal answers for supported evergreen questions", async () => {
    const answer = await answerQuestion({ query: "best cashback card" });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.needsDatabaseUpdate).toBeUndefined();
    expect(answer.summary).toMatch(/Top 3 picks for this query/i);
  });

  it("produces a more natural fallback summary for direct card-name queries", async () => {
    const answer = await answerQuestion({ query: "Axis Atlas", maxAnnualFee: 5000 });

    expect(answer.summary).toMatch(/If you specifically mean Axis Bank Atlas Credit Card/i);
    // The take is kept skimmable: one headline feature + closest alternative, not a dump of every
    // card spec (lounge counts etc. are shown on the card tile/comparison table instead).
    expect(answer.highlights).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/travel, hotels, and flights/i),
        expect.stringMatching(/Closest alternative: HSBC TravelOne Credit Card/i)
      ])
    );
    expect(answer.highlights?.length).toBeLessThanOrEqual(4);
    expect(answer.highlights?.some((h: string) => /lounge visits/i.test(h))).toBe(false);
    expect(answer.cards[0]?.card.id).toBe("axis-atlas");
  });

  it("returns Infinia when the exact HDFC card is present in the dataset", async () => {
    const answer = await answerQuestion({ query: "Infinia" });

    expect(answer.cards[0]?.card.id).toBe("hdfc-infinia-metal");
    expect(answer.summary).toMatch(/Infinia Metal Edition/i);
  });

  it("resolves common single-token card-name misspellings like millenia to HDFC Millennia", async () => {
    const answer = await answerQuestion({ query: "millenia" });

    expect(answer.cards[0]?.card.id).toBe("hdfc-millennia");
    expect(answer.summary).toMatch(/HDFC Millennia Credit Card/i);
  });

  it("treats spaced brand queries like 'travel one' as HSBC TravelOne instead of One Credit Card", async () => {
    const answer = await answerQuestion({ query: "travel one" });

    expect(answer.cards[0]?.card.id).toBe("hsbc-travelone");
    expect(answer.summary).toMatch(/HSBC TravelOne Credit Card/i);
  });

  it("resolves shorthand issuer plus brand queries like 'icici mmt' to MakeMyTrip ICICI", async () => {
    const answer = await answerQuestion({ query: "icici mmt" });

    expect(answer.cards[0]?.card.id).toBe("icici-makemytrip");
    expect(answer.summary).toMatch(/MakeMyTrip ICICI Bank Credit Card/i);
  });

  it("resolves shorthand issuer plus brand queries like 'amex mrcc' to Membership Rewards Credit Card", async () => {
    const answer = await answerQuestion({ query: "amex mrcc" });

    expect(answer.cards[0]?.card.id).toBe("amex-membership-rewards");
    expect(answer.summary).toMatch(/Membership Rewards Credit Card/i);
  });

  it("resolves 'platinum reserve' to the Amex Platinum Reserve card", async () => {
    const answer = await answerQuestion({ query: "platinum reserve" });

    expect(answer.cards[0]?.card.id).toBe("amex-platinum-reserve");
    expect(answer.summary).toMatch(/Platinum Reserve Credit Card/i);
  });

  it("answers rewards-policy questions when current card rules support an inference", async () => {
    const answer = await answerQuestion({ query: "do i get rewards on gold purchase using infinia?" });

    expect(answer.cards[0]?.card.id).toBe("hdfc-infinia-metal");
    expect(answer.needsDatabaseUpdate).toBeUndefined();
    expect(answer.summary).toMatch(/should earn rewards on gold/i);
    expect(answer.summary).toMatch(/gold/i);
    expect(answer.highlights).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/not listed in exclusions/i),
        expect.stringMatching(/3\.33 reward points per Rs 100/i)
      ])
    );
  });

  it("answers exclusion questions from listed exclusions", async () => {
    const answer = await answerQuestion({ query: "is rent excluded on atlas?" });

    expect(answer.cards[0]?.card.id).toBe("axis-atlas");
    expect(answer.summary).toMatch(/rent is part of the listed exclusions/i);
    expect(answer.highlights).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/excluded category match found for rent/i),
        expect.stringMatching(/^Relevant exclusion: rent$/i)
      ])
    );
  });

  it("keeps issuer-led recommendation queries in the requested issuer family", async () => {
    const answer = await answerQuestion({ query: "top icici card under 5000", maxAnnualFee: 5000 });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.cards.every((item) => item.card.issuer === "ICICI Bank")).toBe(true);
    expect(answer.needsDatabaseUpdate).toBeUndefined();
  });

  it("prefers the strongest issuer-matched travel card for issuer travel asks", async () => {
    const answer = await answerQuestion({ query: "best axis travel card" });

    expect(answer.cards[0]?.card.id).toBe("axis-atlas");
    expect(answer.cards.every((item) => item.card.issuer === "Axis Bank")).toBe(true);
    expect(answer.summary).toMatch(/Top 3 picks for this query/i);
  });

  it("respects fee-cap questions even when the cap only appears in the query text", async () => {
    const answer = await answerQuestion({ query: "top card under 5000" });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.cards.every((item) => item.card.annualFee <= 5000)).toBe(true);
    expect(answer.needsDatabaseUpdate).toBeUndefined();
  });

  it("mentions three results for broad top-card questions", async () => {
    const answer = await answerQuestion({ query: "top card under 5000" });

    expect(answer.cards).toHaveLength(3);
    expect(answer.summary).toBe("Top 3 picks for this query.");
  });

  it("returns the requested number of cards for top-N broad ranking queries", { timeout: 45000 }, async () => {
    const answer = await answerQuestion({ query: "top 10 credit cards" });

    expect(answer.cards).toHaveLength(10);
    expect(answer.summary).toBe("Top 10 picks for this query.");
  });

  it("keeps the top-cards take skimmable and free of stale spend-tier framing", { timeout: 45000 }, async () => {
    const answer = await answerQuestion({ query: "top 10 credit cards" });
    const highlights = answer.highlights ?? [];

    expect(highlights.length).toBeLessThanOrEqual(4);
    // No per-card "best at <label>" lines and no stale "strongest spend level" framing.
    expect(highlights.some((h: string) => /best at/i.test(h) || /strongest spend level/i.test(h))).toBe(false);
    // The single framing line reflects the all-round (blended) ranking.
    expect(highlights.some((h: string) => /all-round value/i.test(h))).toBe(true);
  });

  it("uses AI to improve the summary for broad top-card queries when an OpenAI API key is configured", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    global.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    summary: "Axis Bank Magnus Credit Card for Burgundy leads this ranked list, with other strong options close behind depending on spend level."
                  })
                }
              ]
            }
          ]
        })
      }) as unknown as Response
    ) as typeof fetch;

    const answer = await answerQuestion({ query: "top 10 credit cards" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(answer.cards).toHaveLength(10);
    expect(answer.summary).toMatch(/Magnus Credit Card for Burgundy/i);
  });

  it("shows the actual top 3 ranked cards for broad top-card questions", { timeout: 45000 }, async () => {
    const answer = await answerQuestion({ query: "top cards under 5000" });
    const rawTopThreeIds = scoreCards({ query: "top cards under 5000" })
      .slice(0, 3)
      .map((item) => item.card.id);

    expect(answer.cards.map((item) => item.card.id)).toEqual(rawTopThreeIds);
  });

  it("handles grocery-spend recommendation questions", async () => {
    const answer = await answerQuestion({ query: "top card for grocery spends" });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.cards[0]?.card.id).not.toBe("landmark-rewards-sbi-prime");
    expect(answer.needsDatabaseUpdate).toBeUndefined();
    expect(answer.summary.length).toBeGreaterThan(20);
  });

  it("handles travel-spend recommendation questions", async () => {
    const answer = await answerQuestion({ query: "top card for travel spends" });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.needsDatabaseUpdate).toBeUndefined();
    expect(answer.summary.length).toBeGreaterThan(20);
  });

  it("handles life time free phrasing for ltf recommendations", async () => {
    const answer = await answerQuestion({ query: "top life time free cards" });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.cards.every((item) => item.card.annualFee === 0)).toBe(true);
    expect(`${answer.cards[0]?.card.bestFor.join(" ")} ${answer.cards[0]?.card.exclusions.join(" ")}`.toLowerCase()).not.toContain(
      "invite only"
    );
    expect(answer.needsDatabaseUpdate).toBeUndefined();
  });

  it("handles spend-mix recommendation questions", async () => {
    const answer = await answerQuestion({
      query: "my spends are 50% travel, 25% grocery, 25% utilities, suggest a card for me"
    });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.cards[0]?.card.id).not.toBe("amex-platinum-travel");
    expect(answer.needsDatabaseUpdate).toBeUndefined();
    expect(answer.summary.length).toBeGreaterThan(20);
  });

  it("adds scenario guidance for generic recommendation questions without spend context", async () => {
    const answer = await answerQuestion({ query: "top card" });

    expect(answer.highlights?.length).toBeGreaterThan(0);
    expect(answer.highlights?.join(" ")).not.toMatch(/Apollo SBI Card SELECT/);
    expect(answer.highlights?.join(" ")).not.toMatch(/IndiGo IDFC FIRST/);
  });

  it("does not show redundant LTF spend ladders when the balanced winner does not change", async () => {
    const answer = await answerQuestion({ query: "top OneCard life time free cards" });

    expect(answer.highlights?.join(" ")).not.toMatch(/best by yearly spend/i);
  });

  it("uses super-premium scenario ladders for super-premium asks", { timeout: 60000 }, async () => {
    const answer = await answerQuestion({ query: "best super premium card" });

    expect(answer.summary).toMatch(/Top 3 picks for this query/i);
    expect(answer.highlights?.join(" ")).not.toMatch(/Apollo SBI Card SELECT/);
  });

  it("answers negative rewards-policy questions from exclusions", async () => {
    const answer = await answerQuestion({ query: "do i get rewards on rent using atlas?" });

    expect(answer.cards[0]?.card.id).toBe("axis-atlas");
    expect(answer.summary).toMatch(/does not appear to earn rewards on rent purchases/i);
    expect(answer.highlights).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/excluded category match found for rent/i),
        expect.stringMatching(/^Relevant exclusion: rent$/i)
      ])
    );
  });

  it("answers lounge questions with the stored counts", async () => {
    const answer = await answerQuestion({ query: "how many international lounges does regalia gold have?" });

    expect(answer.cards[0]?.card.id).toBe("hdfc-regalia-gold");
    expect(answer.summary).toMatch(/12 domestic and 6 international lounge accesses/i);
  });

  it("answers forex questions with the stored markup", async () => {
    const answer = await answerQuestion({ query: "what is the forex markup on atlas?" });

    expect(answer.cards[0]?.card.id).toBe("axis-atlas");
    expect(answer.summary).toMatch(/forex markup of 3\.5%/i);
  });

  it("answers milestone questions for named cards", async () => {
    const answer = await answerQuestion({ query: "does regalia gold have milestone benefits?" });

    expect(answer.cards[0]?.card.id).toBe("hdfc-regalia-gold");
    expect(answer.summary).toMatch(/does include milestone benefits/i);
    expect(answer.highlights).toEqual(
      expect.arrayContaining([expect.stringMatching(/flight vouchers/i)])
    );
  });

  it("handles alternate exclusion phrasing for named-card questions", async () => {
    const answer = await answerQuestion({ query: "does atlas exclude rent?" });

    expect(answer.cards[0]?.card.id).toBe("axis-atlas");
    expect(answer.summary).toMatch(/rent is part of the listed exclusions/i);
  });

  it("does not guess when a specific card lookup is missing from the dataset", async () => {
    const answer = await answerQuestion({ query: "Centurion" });

    expect(answer.cards).toHaveLength(0);
    expect(answer.needsDatabaseUpdate).toBe(true);
    expect(answer.summary).toMatch(/couldn't find an exact match|could not find an exact match/i);
  });

  it("keeps broad top-card rankings deterministic even when AI improves the summary", { timeout: 45000 }, async () => {
    process.env.OPENAI_API_KEY = "test-key";
    global.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    summary: "Kotak Cashback+ Credit Card leads this ranked shortlist, with close alternatives for different spending patterns."
                  })
                }
              ]
            }
          ]
        })
      }) as unknown as Response
    ) as typeof fetch;

    const answer = await answerQuestion({ query: "best cashback card" });
    const rawTopThreeIds = scoreCards({ query: "best cashback card" }).slice(0, 3).map((item) => item.card.id);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(answer.summary).toMatch(/Kotak Cashback\+/i);
    expect(answer.cards).toHaveLength(3);
    expect(answer.cards.map((item) => item.card.id)).toEqual(rawTopThreeIds);
  });

  it("uses gpt-5-mini summary generation for non-ranking recommendation phrasing when an OpenAI API key is configured", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    global.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    summary: "SBI Cashback Credit Card looks strongest here based on the shortlisted card data."
                  })
                }
              ]
            }
          ]
        })
      }) as unknown as Response
    ) as typeof fetch;

    const answer = await answerQuestion({ query: "cashback card for online spends" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(answer.summary).toMatch(/SBI Cashback Credit Card/);
    expect(answer.cards.length).toBeGreaterThan(0);
  });

  it("uses AI as a fallback for fuzzy specific-card resolution when deterministic matching is weak", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    global.fetch = vi
      .fn()
      .mockImplementationOnce(
        async () =>
          ({
            ok: true,
            json: async () => ({
              output: [
                {
                  content: [
                    {
                      text: JSON.stringify({
                        cardId: "hsbc-travelone"
                      })
                    }
                  ]
                }
              ]
            })
          }) as unknown as Response
      )
      .mockImplementationOnce(
        async () =>
          ({
            ok: true,
            json: async () => ({
              output: [
                {
                  content: [
                    {
                      text: JSON.stringify({
                        summary: "HSBC TravelOne Credit Card looks like the right fit."
                      })
                    }
                  ]
                }
              ]
            })
          }) as unknown as Response
      ) as typeof fetch;

    const answer = await answerQuestion({ query: "travel1" });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(answer.cards[0]?.card.id).toBe("hsbc-travelone");
  });

  it("tries an AI/database fallback before returning a hard no-answer for unresolved specific lookups", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    global.fetch = vi.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                {
                  text: JSON.stringify({
                    summary: "The closest verified match in the current database is HSBC TravelOne Credit Card."
                  })
                }
              ]
            }
          ]
        })
      }) as unknown as Response
    ) as typeof fetch;

    const answer = await answerQuestion({ query: "centurionx" });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.summary).toMatch(/closest verified match/i);
    expect(answer.highlights).toEqual(expect.arrayContaining([expect.stringMatching(/Closest matches from the current verified database/i)]));
  });

  it("logs empty-match questions for later enrichment", async () => {
    const answer = await answerQuestion({ query: "best cashback card", maxAnnualFee: -1 });

    expect(answer.needsDatabaseUpdate).toBe(true);
    expect(fs.existsSync(logPath)).toBe(true);
  });
});
