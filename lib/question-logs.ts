import fs from "node:fs/promises";
import path from "node:path";
import {
  isDurableRecordStorageConfigured,
  isVercelRuntime,
  readDurableRecords,
  writeUniqueDurableRecord
} from "./durable-records";
import type { RecommendationInput } from "./types";

export type UnsupportedQuestionLogEntry = {
  query: string;
  loggedAt: string;
  reason: string;
  input: RecommendationInput;
};

export const unsupportedQuestionLogPath = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "data",
  "question-logs",
  "unsupported-questions.json"
);

function getUnsupportedQuestionLogPath() {
  if (process.env.NODE_ENV === "test" && process.env.UNSUPPORTED_QUESTION_LOG_PATH) {
    return path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "data",
      "question-logs",
      path.basename(process.env.UNSUPPORTED_QUESTION_LOG_PATH)
    );
  }

  return unsupportedQuestionLogPath;
}

function canPersistQuestionLogsToFilesystem() {
  return !isVercelRuntime();
}

function logUnsupportedQuestionToConsole(entry: UnsupportedQuestionLogEntry) {
  console.info(JSON.stringify({ log_type: "unsupported_question", ...entry }));
}

export async function appendUnsupportedQuestionLog(entry: UnsupportedQuestionLogEntry) {
  if (!canPersistQuestionLogsToFilesystem()) {
    if (isDurableRecordStorageConfigured()) {
      try {
        await writeUniqueDurableRecord("unsupported-questions", entry, entry.loggedAt);
      } catch (error) {
        console.error("Failed to persist unsupported question to durable storage:", error);
      }
    }

    logUnsupportedQuestionToConsole(entry);
    return entry;
  }

  try {
    const logPath = getUnsupportedQuestionLogPath();
    const logDir = path.dirname(logPath);
    await fs.mkdir(logDir, { recursive: true });

    let existingEntries: UnsupportedQuestionLogEntry[] = [];

    try {
      const existingContent = await fs.readFile(logPath, "utf8");
      existingEntries = JSON.parse(existingContent) as UnsupportedQuestionLogEntry[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    existingEntries.push(entry);
    await fs.writeFile(logPath, JSON.stringify(existingEntries, null, 2));
  } catch (error) {
    console.error("Failed to write to unsupported question log; logging to console instead:", error);
    logUnsupportedQuestionToConsole(entry);
  }

  return entry;
}

export async function readUnsupportedQuestionLog() {
  if (isVercelRuntime()) {
    if (!isDurableRecordStorageConfigured()) {
      throw new Error("Durable record storage is not configured");
    }

    const entries = await readDurableRecords<UnsupportedQuestionLogEntry>("unsupported-questions");
    return entries.sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
  }

  try {
    const content = await fs.readFile(getUnsupportedQuestionLogPath(), "utf8");
    const entries = JSON.parse(content) as UnsupportedQuestionLogEntry[];

    return [...entries].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
