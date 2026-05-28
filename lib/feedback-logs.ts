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

export async function logAskFeedback(entry: AskFeedbackEntry) {
  const logDir = path.dirname(askFeedbackLogPath);
  await fs.mkdir(logDir, { recursive: true });

  let existingEntries: AskFeedbackEntry[] = [];

  try {
    const existingContent = await fs.readFile(askFeedbackLogPath, "utf8");
    existingEntries = JSON.parse(existingContent) as AskFeedbackEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  existingEntries.push(entry);
  await fs.writeFile(askFeedbackLogPath, JSON.stringify(existingEntries, null, 2));

  return entry;
}
