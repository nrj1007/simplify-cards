import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendUnsupportedQuestionLog,
  readUnsupportedQuestionLog,
} from "../lib/question-logs";

const testLogPath = path.join(process.cwd(), "data", "question-logs", "unsupported-questions.test.json");
const logDir = path.dirname(testLogPath);

function cleanupLogFile() {
  if (fs.existsSync(testLogPath)) fs.rmSync(testLogPath, { force: true });
}

describe("question log helpers", () => {
  beforeEach(() => {
    vi.stubEnv("UNSUPPORTED_QUESTION_LOG_PATH", testLogPath);
    fs.mkdirSync(logDir, { recursive: true });
    cleanupLogFile();
  });

  afterEach(() => {
    cleanupLogFile();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns an empty list when no log file exists", async () => {
    await expect(readUnsupportedQuestionLog()).resolves.toEqual([]);
  });

  it("returns log entries newest first", async () => {
    fs.writeFileSync(
      testLogPath,
      JSON.stringify(
        [
          {
            query: "older question",
            loggedAt: "2026-05-11T10:00:00.000Z",
            reason: "older",
            input: { query: "older question" }
          },
          {
            query: "newer question",
            loggedAt: "2026-05-12T10:00:00.000Z",
            reason: "newer",
            input: { query: "newer question" }
          }
        ],
        null,
        2
      )
    );

    const entries = await readUnsupportedQuestionLog();

    expect(entries).toHaveLength(2);
    expect(entries[0].query).toBe("newer question");
    expect(entries[1].query).toBe("older question");
  });

  it("persists unsupported questions to the local JSON log", async () => {
    const entry = {
      query: "latest lounge rules",
      loggedAt: "2026-07-22T10:00:00.000Z",
      reason: "Needs current information",
      input: { query: "latest lounge rules" }
    };

    await appendUnsupportedQuestionLog(entry);

    await expect(readUnsupportedQuestionLog()).resolves.toEqual([entry]);
  });

  it("emits a structured console log instead of writing on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const entry = {
      query: "latest devaluation",
      loggedAt: "2026-07-22T10:00:00.000Z",
      reason: "Needs current information",
      input: { query: "latest devaluation" }
    };

    await appendUnsupportedQuestionLog(entry);

    expect(fs.existsSync(testLogPath)).toBe(false);
    expect(consoleInfo).toHaveBeenCalledOnce();
    expect(JSON.parse(String(consoleInfo.mock.calls[0][0]))).toEqual({
      log_type: "unsupported_question",
      ...entry
    });
  });
});
