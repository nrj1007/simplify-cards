import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { answerQuestion, getUnsupportedQuestionReason } from "../lib/ask-ai";

const logPath = path.join(process.cwd(), "data", "question-logs", "unsupported-questions.json");

function cleanupLogFile() {
  if (fs.existsSync(logPath)) fs.rmSync(logPath);
}

describe("ask ai fallback policy", () => {
  beforeEach(() => {
    cleanupLogFile();
  });

  afterEach(() => {
    cleanupLogFile();
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
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].query).toBe("latest update on HDFC Infinia");
  });

  it("returns normal answers for supported evergreen questions", async () => {
    const answer = await answerQuestion({ query: "best cashback card" });

    expect(answer.cards.length).toBeGreaterThan(0);
    expect(answer.needsDatabaseUpdate).toBeUndefined();
  });

  it("logs empty-match questions for later enrichment", async () => {
    const answer = await answerQuestion({ query: "best cashback card", maxAnnualFee: -1 });

    expect(answer.needsDatabaseUpdate).toBe(true);
    expect(fs.existsSync(logPath)).toBe(true);
  });
});
