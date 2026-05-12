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
