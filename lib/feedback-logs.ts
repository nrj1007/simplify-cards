import fs from "node:fs/promises";
import path from "node:path";
import {
  isDurableRecordStorageConfigured,
  isVercelRuntime,
  readDurableRecords,
  writeUniqueDurableRecord
} from "./durable-records";
import type { RecommendationInput } from "./types";

export type AskFeedbackValue = "up" | "down";

export type AskFeedbackEntry = {
  query: string;
  submittedAt: string;
  feedback: AskFeedbackValue;
  summary: string;
  cardIds: string[];
  input: RecommendationInput;
  comment?: string;
  source?: "ask" | "details";
};

export const askFeedbackLogPath = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "data",
  "question-logs",
  "ask-feedback.json"
);

function getAskFeedbackLogPath() {
  if (process.env.NODE_ENV === "test" && process.env.ASK_FEEDBACK_LOG_PATH) {
    return path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "data",
      "question-logs",
      path.basename(process.env.ASK_FEEDBACK_LOG_PATH)
    );
  }

  return askFeedbackLogPath;
}

function canPersistFeedbackLogsToFilesystem() {
  return !isVercelRuntime();
}

function logAskFeedbackToConsole(entry: AskFeedbackEntry) {
  console.info(JSON.stringify({ log_type: "feedback_submission", ...entry }));
}

export async function logAskFeedback(entry: AskFeedbackEntry) {
  if (!canPersistFeedbackLogsToFilesystem()) {
    if (isDurableRecordStorageConfigured()) {
      try {
        await writeUniqueDurableRecord("feedback", entry, entry.submittedAt);
      } catch (error) {
        console.error("Failed to persist feedback to durable storage:", error);
        logAskFeedbackToConsole(entry);
        throw error;
      }
    } else {
      logAskFeedbackToConsole(entry);
      throw new Error("Durable record storage is not configured");
    }

    logAskFeedbackToConsole(entry);
    return entry;
  }

  try {
    const logPath = getAskFeedbackLogPath();
    const logDir = path.dirname(logPath);
    await fs.mkdir(logDir, { recursive: true });

    let existingEntries: AskFeedbackEntry[] = [];

    try {
      const existingContent = await fs.readFile(logPath, "utf8");
      existingEntries = JSON.parse(existingContent) as AskFeedbackEntry[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    existingEntries.push(entry);
    await fs.writeFile(logPath, JSON.stringify(existingEntries, null, 2));
  } catch (error) {
    console.error("Failed to write to ask feedback log; logging to console instead:", error);
    logAskFeedbackToConsole(entry);
  }

  return entry;
}

export async function readAskFeedbackLog() {
  if (isVercelRuntime()) {
    if (!isDurableRecordStorageConfigured()) {
      throw new Error("Durable record storage is not configured");
    }

    const entries = await readDurableRecords<AskFeedbackEntry>("feedback");
    return entries.sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  }

  try {
    const content = await fs.readFile(getAskFeedbackLogPath(), "utf8");
    const entries = JSON.parse(content) as AskFeedbackEntry[];
    return [...entries].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
