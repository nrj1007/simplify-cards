import fs from "node:fs/promises";
import path from "node:path";
import { answerFromCards } from "./recommend";
import type { CardScore } from "./types";
import type { RecommendationInput } from "./types";
import { unsupportedQuestionLogPath } from "./question-logs";
import type { UnsupportedQuestionLogEntry } from "./question-logs";

export type AskAiResult = ReturnType<typeof answerFromCards> & {
  needsDatabaseUpdate?: boolean;
  unsupportedReason?: string;
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

const defaultAskModel = process.env.OPENAI_ASK_MODEL ?? "gpt-5-mini";

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

function buildGroundedAskPrompt(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const cardFacts = shortlistedCards.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    id: item.card.id,
    name: item.card.name,
    issuer: item.card.issuer,
    annualFee: item.card.annualFee,
    joiningFee: item.card.joiningFee,
    bestFor: item.card.bestFor,
    tags: item.card.tags,
    loungeDomestic: item.card.loungeDomestic,
    loungeInternational: item.card.loungeInternational,
    forexMarkup: item.card.forexMarkup,
    estimatedAnnualRewards: item.estimatedAnnualRewards,
    estimatedAnnualFee: item.estimatedAnnualFee,
    estimatedNetValue: item.estimatedNetValue,
    matchedTags: item.matchedTags,
    reasons: item.reasons.slice(0, 4),
    sourceUrl: item.card.sourceUrl
  }));

  return JSON.stringify(
    {
      userQuestion: input.query ?? "",
      constraints: {
        maxAnnualFee: input.maxAnnualFee ?? null,
        wantsLounge: input.wantsLounge ?? false,
        wantsLifetimeFree: input.wantsLifetimeFree ?? false
      },
      shortlistedCards: cardFacts
    },
    null,
    2
  );
}

function extractOpenAiText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const directOutputText = (payload as { output_text?: unknown }).output_text;
  if (typeof directOutputText === "string" && directOutputText.trim()) return directOutputText.trim();

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }

  return null;
}

async function generateGroundedSummary(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: defaultAskModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a grounded credit-card assistant. Use only the provided shortlisted card data. Do not invent facts, do not use live web search, and do not mention cards outside the provided shortlist. Write one concise recommendation paragraph for an Indian credit-card user."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildGroundedAskPrompt(input, shortlistedCards)
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "grounded_card_answer",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: {
                type: "string"
              }
            },
            required: ["summary"]
          }
        }
      }
    })
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as unknown;
  const rawText = extractOpenAiText(payload);
  if (!rawText) return null;

  try {
    const parsed = JSON.parse(rawText) as { summary?: unknown };
    return typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : null;
  } catch {
    return null;
  }
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

  const generatedSummary = await generateGroundedSummary(input, answer.cards);

  if (generatedSummary) {
    return {
      ...answer,
      summary: generatedSummary
    };
  }

  return answer;
}
