import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readUnsupportedQuestionLog, unsupportedQuestionLogPath } from "../lib/question-logs";

const logDir = path.dirname(unsupportedQuestionLogPath);

function cleanupLogFile() {
  if (fs.existsSync(unsupportedQuestionLogPath)) fs.rmSync(unsupportedQuestionLogPath);
}

describe("question log helpers", () => {
  beforeEach(() => {
    fs.mkdirSync(logDir, { recursive: true });
    cleanupLogFile();
  });

  afterEach(() => {
    cleanupLogFile();
  });

  it("returns an empty list when no log file exists", async () => {
    await expect(readUnsupportedQuestionLog()).resolves.toEqual([]);
  });

  it("returns log entries newest first", async () => {
    fs.writeFileSync(
      unsupportedQuestionLogPath,
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
});
