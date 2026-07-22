import fs from "node:fs/promises";
import path from "node:path";
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

export const askFeedbackLogPath = path.join(process.cwd(), "data", "question-logs", "ask-feedback.json");

function getAskFeedbackLogPath() {
  if (process.env.NODE_ENV === "test" && process.env.ASK_FEEDBACK_LOG_PATH) {
    return process.env.ASK_FEEDBACK_LOG_PATH;
  }

  return askFeedbackLogPath;
}

function canPersistFeedbackLogsToFilesystem() {
  return process.env.VERCEL !== "1";
}

function logAskFeedbackToConsole(entry: AskFeedbackEntry) {
  console.info(JSON.stringify({ log_type: "feedback_submission", ...entry }));
}

export async function logAskFeedback(entry: AskFeedbackEntry) {
  if (!canPersistFeedbackLogsToFilesystem()) {
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
