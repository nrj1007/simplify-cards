import fs from "node:fs/promises";
import path from "node:path";
import { answerFromCards } from "./recommend";
import type { RecommendationInput } from "./types";

export type AskAiResult = ReturnType<typeof answerFromCards> & {
  needsDatabaseUpdate?: boolean;
  unsupportedReason?: string;
};

export type UnsupportedQuestionLogEntry = {
  query: string;
  loggedAt: string;
  reason: string;
  input: RecommendationInput;
};

const temporalKeywords = [
  "latest",
  "today",
  "recent",
  "currently",
  "current offer",
  "devaluation",
  "updated",
  "update",
  "changed",
  "news",
  "new launch",
  "launched",
  "still active",
  "discontinued",
  "now"
];

const unsupportedQuestionLogPath = path.join(process.cwd(), "data", "question-logs", "unsupported-questions.json");

function normalizeQuery(query?: string) {
  return query?.toLowerCase().trim() ?? "";
}

export function getUnsupportedQuestionReason(input: RecommendationInput) {
  const query = normalizeQuery(input.query);

  if (!query) return "Empty question";

  if (temporalKeywords.some((keyword) => query.includes(keyword))) {
    return "Question needs live/latest information that is intentionally not answered via web search";
  }

  return null;
}

export async function logUnsupportedQuestion(input: RecommendationInput, reason: string) {
  const entry: UnsupportedQuestionLogEntry = {
    query: input.query?.trim() ?? "",
    loggedAt: new Date().toISOString(),
    reason,
    input
  };

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

  return entry;
}

export async function answerQuestion(input: RecommendationInput): Promise<AskAiResult> {
  const unsupportedReason = getUnsupportedQuestionReason(input);

  if (unsupportedReason) {
    await logUnsupportedQuestion(input, unsupportedReason);

    return {
      summary:
        "I am not using live web search here. I logged this question for a database update so the next answer can come from our verified card dataset.",
      cards: [],
      needsDatabaseUpdate: true,
      unsupportedReason
    };
  }

  const answer = answerFromCards(input);
  const topCard = answer.cards[0];

  if (!topCard) {
    const reason = "No matching cards found in the current database for this question and filters";
    await logUnsupportedQuestion(input, reason);

    return {
      ...answer,
      needsDatabaseUpdate: true,
      unsupportedReason: reason
    };
  }

  return answer;
}
