import fs from "node:fs/promises";
import path from "node:path";
import type { RecommendationInput } from "./types";

export type UnsupportedQuestionLogEntry = {
  query: string;
  loggedAt: string;
  reason: string;
  input: RecommendationInput;
};

export const unsupportedQuestionLogPath = path.join(process.cwd(), "data", "question-logs", "unsupported-questions.json");

function canPersistQuestionLogsToFilesystem() {
  return process.env.VERCEL !== "1";
}

function logUnsupportedQuestionToConsole(entry: UnsupportedQuestionLogEntry) {
  console.info(JSON.stringify({ log_type: "unsupported_question", ...entry }));
}

export async function appendUnsupportedQuestionLog(entry: UnsupportedQuestionLogEntry) {
  if (!canPersistQuestionLogsToFilesystem()) {
    logUnsupportedQuestionToConsole(entry);
    return entry;
  }

  try {
    const logDir = path.dirname(unsupportedQuestionLogPath);
    await fs.mkdir(logDir, { recursive: true });

    let existingEntries: UnsupportedQuestionLogEntry[] = [];

    try {
      const existingContent = await fs.readFile(unsupportedQuestionLogPath, "utf8");
      existingEntries = JSON.parse(existingContent) as UnsupportedQuestionLogEntry[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    existingEntries.push(entry);
    await fs.writeFile(unsupportedQuestionLogPath, JSON.stringify(existingEntries, null, 2));
  } catch (error) {
    console.error("Failed to write to unsupported question log; logging to console instead:", error);
    logUnsupportedQuestionToConsole(entry);
  }

  return entry;
}

export async function readUnsupportedQuestionLog() {
  try {
    const content = await fs.readFile(unsupportedQuestionLogPath, "utf8");
    const entries = JSON.parse(content) as UnsupportedQuestionLogEntry[];

    return [...entries].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
