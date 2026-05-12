import fs from "node:fs/promises";
import path from "node:path";
import { cards, getCardById } from "./cards";
import type { CardContentEntry, CardContentMap, CardTip, CardUpdate } from "./card-content";
import type { CreditCard } from "./types";

export type CommunitySignalType =
  | "terms-change"
  | "launch-or-offer"
  | "merchant-reward-behavior"
  | "lounge"
  | "discussion";

export type PendingTechnofinoSignal = {
  title: string;
  url: string;
  signalType: CommunitySignalType | string;
  candidateText: string;
  requiresOfficialVerification: boolean;
  approvedForCardDb: boolean;
  approvedForCardContent?: boolean;
  cardIds?: string[];
  contentType?: "update" | "tip";
  publishedAt?: string;
  summary?: string;
  tipText?: string;
};

export type PendingTechnofinoFile = {
  fileName: string;
  generatedAt: string;
  source: string;
  reviewQueue: PendingTechnofinoSignal[];
};

export type CommunitySignalCardMatch = {
  cardId: string;
  cardName: string;
  issuer: string;
  score: number;
};

export type CommunitySignalDraft = {
  fileName: string;
  generatedAt: string;
  signal: PendingTechnofinoSignal;
  suggestedContentType: "update" | "tip";
  matchedCards: CommunitySignalCardMatch[];
  approvedCardNames: string[];
  readyToIngest: boolean;
  missingFields: string[];
  suggestedPublishedAt: string;
  suggestedSummary: string;
  suggestedTipText: string;
};

const pendingSignalsDir = path.join(process.cwd(), "data", "community-signals", "pending");

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function summarizeText(value: string, maxLength = 220) {
  const text = compactWhitespace(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function defaultContentType(signalType: string): "update" | "tip" {
  return signalType === "discussion" || signalType === "merchant-reward-behavior" ? "tip" : "update";
}

function cardAliases(card: CreditCard) {
  const fullName = normalize(card.name);
  const noCreditCard = normalize(card.name.replace(/\bcredit card\b/gi, ""));
  const noIssuer = normalize(
    card.name.replace(new RegExp(card.issuer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "").replace(/\bcredit card\b/gi, "")
  );

  return [fullName, noCreditCard, noIssuer, normalize(card.id.replace(/-/g, " "))]
    .filter((alias) => alias.length >= 4)
    .filter((alias, index, all) => all.indexOf(alias) === index);
}

function scoreCardMatch(text: string, card: CreditCard) {
  let score = 0;
  const haystack = normalize(text);
  const issuer = normalize(card.issuer);

  for (const alias of cardAliases(card)) {
    if (haystack.includes(alias)) score = Math.max(score, alias === normalize(card.name) ? 14 : 10);
  }

  if (issuer && haystack.includes(issuer)) score += 2;

  const keywords = normalize(card.name)
    .split(" ")
    .filter((token) => token.length >= 4)
    .filter((token) => !["credit", "card", "bank"].includes(token));

  const keywordMatches = keywords.filter((token) => haystack.includes(token)).length;
  if (keywordMatches >= 2) score += keywordMatches;

  return score;
}

function findMatchedCards(signal: PendingTechnofinoSignal) {
  const text = `${signal.title} ${signal.candidateText}`;

  return cards
    .map((card) => ({
      cardId: card.id,
      cardName: card.name,
      issuer: card.issuer,
      score: scoreCardMatch(text, card)
    }))
    .filter((match) => match.score >= 6)
    .sort((left, right) => right.score - left.score || left.cardName.localeCompare(right.cardName))
    .slice(0, 3);
}

function approvedCardNames(cardIds: string[]) {
  return cardIds.map((cardId) => getCardById(cardId)?.name ?? cardId);
}

export async function readPendingTechnofinoFiles(dir = pendingSignalsDir) {
  try {
    const names = (await fs.readdir(dir))
      .filter((name) => name.endsWith(".json"))
      .sort((left, right) => right.localeCompare(left));

    const files = await Promise.all(
      names.map(async (fileName) => {
        const fullPath = path.join(dir, fileName);
        const content = await fs.readFile(fullPath, "utf8");
        const parsed = JSON.parse(content) as Omit<PendingTechnofinoFile, "fileName">;

        return {
          fileName,
          generatedAt: parsed.generatedAt,
          source: parsed.source,
          reviewQueue: parsed.reviewQueue ?? []
        } satisfies PendingTechnofinoFile;
      })
    );

    return files.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export function buildCommunitySignalDraft(file: PendingTechnofinoFile, signal: PendingTechnofinoSignal): CommunitySignalDraft {
  const suggestedContentType = signal.contentType ?? defaultContentType(signal.signalType);
  const explicitCardIds = signal.cardIds ?? [];
  const missingFields: string[] = [];

  if (signal.approvedForCardContent && explicitCardIds.length === 0) {
    missingFields.push("cardIds");
  }

  if (signal.approvedForCardContent && suggestedContentType === "update" && !signal.publishedAt && !file.generatedAt) {
    missingFields.push("publishedAt");
  }

  return {
    fileName: file.fileName,
    generatedAt: file.generatedAt,
    signal,
    suggestedContentType,
    matchedCards: findMatchedCards(signal),
    approvedCardNames: approvedCardNames(explicitCardIds),
    readyToIngest: Boolean(signal.approvedForCardContent) && missingFields.length === 0,
    missingFields,
    suggestedPublishedAt: signal.publishedAt ?? dateOnly(file.generatedAt),
    suggestedSummary: signal.summary ?? summarizeText(signal.candidateText || signal.title),
    suggestedTipText: signal.tipText ?? summarizeText(signal.candidateText || signal.title)
  };
}

export function buildCommunitySignalDrafts(files: PendingTechnofinoFile[]) {
  return files.flatMap((file) => file.reviewQueue.map((signal) => buildCommunitySignalDraft(file, signal)));
}

function buildUpdateEntry(draft: CommunitySignalDraft): CardUpdate {
  return {
    title: draft.signal.title,
    summary: draft.suggestedSummary,
    sourceType: "technofino",
    sourceLabel: "TechnoFino",
    sourceUrl: draft.signal.url,
    publishedAt: draft.suggestedPublishedAt
  };
}

function buildTipEntry(draft: CommunitySignalDraft): CardTip {
  return {
    text: draft.suggestedTipText,
    sourceType: "technofino",
    sourceLabel: "TechnoFino",
    sourceUrl: draft.signal.url
  };
}

export function buildCardContentAdditions(drafts: CommunitySignalDraft[]) {
  const additions: CardContentMap = {};

  for (const draft of drafts) {
    if (!draft.readyToIngest) continue;

    for (const cardId of draft.signal.cardIds ?? []) {
      additions[cardId] ??= {};

      if (draft.suggestedContentType === "update") {
        additions[cardId].updates ??= [];
        additions[cardId].updates.push(buildUpdateEntry(draft));
      } else {
        additions[cardId].tips ??= [];
        additions[cardId].tips.push(buildTipEntry(draft));
      }
    }
  }

  return additions;
}

function dedupeUpdates(updates: CardUpdate[]) {
  const seen = new Set<string>();

  return updates.filter((update) => {
    const key = `${update.title}|${update.publishedAt}|${update.sourceUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeTips(tips: CardTip[]) {
  const seen = new Set<string>();

  return tips.filter((tip) => {
    const key = `${tip.text}|${tip.sourceUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeCardContent(base: CardContentMap, additions: CardContentMap) {
  const merged: CardContentMap = { ...base };

  for (const [cardId, addition] of Object.entries(additions)) {
    const current = merged[cardId] ?? {};
    const entry: CardContentEntry = {};

    if (current.updates || addition.updates) {
      entry.updates = dedupeUpdates([...(current.updates ?? []), ...(addition.updates ?? [])]);
    }

    if (current.tips || addition.tips) {
      entry.tips = dedupeTips([...(current.tips ?? []), ...(addition.tips ?? [])]);
    }

    merged[cardId] = entry;
  }

  return merged;
}
