import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logAskFeedback, type AskFeedbackEntry } from "../lib/feedback-logs";

const testLogPath = path.join(process.cwd(), "data", "question-logs", "ask-feedback.test.json");
const logDir = path.dirname(testLogPath);

function cleanupLogFile() {
  if (fs.existsSync(testLogPath)) fs.rmSync(testLogPath, { force: true });
}

function buildFeedbackEntry(): AskFeedbackEntry {
  return {
    query: "best cashback card",
    submittedAt: "2026-07-22T10:00:00.000Z",
    feedback: "down",
    summary: "Suggested cards",
    cardIds: ["sbi-cashback"],
    input: { query: "best cashback card" },
    comment: "The result missed my preferred bank",
    source: "ask"
  };
}

describe("feedback log helpers", () => {
  beforeEach(() => {
    vi.stubEnv("ASK_FEEDBACK_LOG_PATH", testLogPath);
    fs.mkdirSync(logDir, { recursive: true });
    cleanupLogFile();
  });

  afterEach(() => {
    cleanupLogFile();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("persists feedback to the local JSON log", async () => {
    const entry = buildFeedbackEntry();

    await logAskFeedback(entry);

    expect(JSON.parse(fs.readFileSync(testLogPath, "utf8"))).toEqual([entry]);
  });

  it("emits a structured console log instead of writing on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const entry = buildFeedbackEntry();

    await expect(logAskFeedback(entry)).rejects.toThrow(/durable record storage/i);

    expect(fs.existsSync(testLogPath)).toBe(false);
    expect(consoleInfo).toHaveBeenCalledOnce();
    expect(JSON.parse(String(consoleInfo.mock.calls[0][0]))).toEqual({
      log_type: "feedback_submission",
      ...entry
    });
  });
});
