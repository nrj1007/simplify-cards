import fs from "node:fs/promises";
import path from "node:path";
import { cards, getCardById } from "./cards";
import { answerFromCards, defaultSpendProfile, getAirMilesValue, requestedTopCardCount, scoreCards, isBroadGenericRankingQuery } from "./recommend";
import type { CardScore } from "./types";
import type { RecommendationInput } from "./types";
import { SPLIT_SCOPE } from "./result-strategies";
import { unsupportedQuestionLogPath } from "./question-logs";
import type { UnsupportedQuestionLogEntry } from "./question-logs";
import { parseQueryIntent } from "./query-intent";
import { callAiWithSchemaDetailed, type AiCallTrace } from "./ai-provider";
import { getTotalLoungeAccess } from "./lounge";
import { askCacheKey, getAskCache, setAskCache, type AskCacheStatus } from "./ask-cache";

export type AskIntent =
  | "specific-card"
  | "card-detail"
  | "card-family"
  | "top-cards"
  | "best-fit"
  | "unsupported";

export type AskConfidence = "high" | "medium-high" | "medium" | "exploratory" | "low";

export type AskResultMeta = {
  intent: AskIntent;
  intentLabel: string;
  confidence: AskConfidence;
  confidenceLabel: string;
  needsFollowUp: boolean;
  /** True when the top recommendation barely edges out the runner-up (a near-tie race). */
  closeCall?: boolean;
  ai?: AskAiAnalyticsSummary;
};

export type AskAiAnalyticsSummary = {
  aiUsed: boolean;
  providersUsed: Array<"openai" | "gemini">;
  fallbackUsed: boolean;
  calls: Array<{
    purpose: string;
    schema_name: string;
    primary_provider: "openai" | "gemini";
    provider_used: "openai" | "gemini" | null;
    fallback_provider: "openai" | "gemini";
    fallback_used: boolean;
    success: boolean;
    primary_model: string;
    fallback_model: string;
  }>;
};

export type AskAiResult = ReturnType<typeof answerFromCards> & {
  highlights?: string[];
  needsDatabaseUpdate?: boolean;
  unsupportedReason?: string;
  displayMode?: "default" | "ranked-list";
  meta?: AskResultMeta;
};

const askCacheStatusSymbol = Symbol("ask-cache-status");

type AskAiResultWithCacheStatus = AskAiResult & {
  [askCacheStatusSymbol]?: AskCacheStatus;
};

const ASK_INTENT_LABELS: Record<AskIntent, string> = {
  "specific-card": "Specific card lookup",
  "card-detail": "Card detail answer",
  "card-family": "Card family lookup",
  "top-cards": "Mixed recommendation",
  "best-fit": "Best-fit recommendation",
  unsupported: "No confident match"
};

const ASK_CONFIDENCE_LABELS: Record<AskConfidence, string> = {
  high: "High",
  "medium-high": "Medium-high",
  medium: "Medium",
  exploratory: "Exploratory",
  low: "Low"
};

const ASK_INTENT_FOLLOWUP: Record<AskIntent, boolean> = {
  "specific-card": false,
  "card-detail": false,
  "card-family": true,
  "top-cards": true,
  "best-fit": false,
  unsupported: true
};

// Confidence for ranked recommendations is the DECISIVENESS of the win — how far the top card's
// fitScore sits above the runner-up (a scale-invariant ratio), not the raw score magnitude. A clear
// leader is "high"; a near-tie is "exploratory". (fitScore is raw and unbounded, so the old
// absolute thresholds always read "high" — using the relative gap fixes that.)
const closeCallGapThreshold = 0.03;

export function confidenceFromGap(topFit?: number, runnerUpFit?: number): AskConfidence {
  if (topFit === undefined || topFit <= 0) return "low";
  if (runnerUpFit === undefined) return "high"; // only one candidate → decisive
  const gap = (topFit - runnerUpFit) / topFit;
  if (gap >= 0.15) return "high";
  if (gap >= 0.07) return "medium-high";
  if (gap >= closeCallGapThreshold) return "medium";
  return "exploratory";
}

function relativeGap(topFit?: number, runnerUpFit?: number): number | undefined {
  if (topFit === undefined || topFit <= 0 || runnerUpFit === undefined) return undefined;
  return (topFit - runnerUpFit) / topFit;
}

function buildAskMeta(
  intent: AskIntent,
  options?: { topFit?: number; runnerUpFit?: number; needsFollowUp?: boolean }
): AskResultMeta {
  const usesGapConfidence = !(
    intent === "unsupported" ||
    intent === "specific-card" ||
    intent === "card-detail" ||
    intent === "card-family"
  );
  const confidence: AskConfidence =
    intent === "unsupported"
      ? "low"
      : intent === "specific-card" || intent === "card-detail"
        ? "high"
        : intent === "card-family"
          ? "medium-high"
          : confidenceFromGap(options?.topFit, options?.runnerUpFit);

  const gap = relativeGap(options?.topFit, options?.runnerUpFit);
  const closeCall = usesGapConfidence && gap !== undefined && gap < closeCallGapThreshold;

  return {
    intent,
    intentLabel: ASK_INTENT_LABELS[intent],
    confidence,
    confidenceLabel: ASK_CONFIDENCE_LABELS[confidence],
    needsFollowUp: options?.needsFollowUp ?? ASK_INTENT_FOLLOWUP[intent],
    closeCall
  };
}

function summarizeAiTraces(
  traces: Array<{ purpose: string; trace: AiCallTrace }>
): AskAiAnalyticsSummary {
  const successfulCalls = traces.filter(({ trace }) => trace.success && trace.providerUsed);
  const providersUsed = [...new Set(successfulCalls.map(({ trace }) => trace.providerUsed).filter(Boolean))] as Array<
    "openai" | "gemini"
  >;

  return {
    aiUsed: successfulCalls.length > 0,
    providersUsed,
    fallbackUsed: traces.some(({ trace }) => trace.fallbackUsed),
    calls: traces.map(({ purpose, trace }) => ({
      purpose,
      schema_name: trace.schemaName,
      primary_provider: trace.primaryProvider,
      provider_used: trace.providerUsed,
      fallback_provider: trace.fallbackProvider,
      fallback_used: trace.fallbackUsed,
      success: trace.success,
      primary_model: trace.primaryModel,
      fallback_model: trace.fallbackModel
    }))
  };
}

type ParsedCardQuestion = {
  questionType:
    | "rewards_eligibility"
    | "exclusion_check"
    | "lounge"
    | "fee_waiver"
    | "forex"
    | "milestone"
    | "redemption"
    | "eligibility"
    | "generic";
  spendSubject?: string;
};

const genericLookupWords = new Set([
  "best",
  "top",
  "card",
  "cards",
  "credit",
  "bank",
  "india",
  "indian",
  "for",
  "under",
  "with",
  "without",
  "vs",
  "compare",
  "good",
  "do",
  "does",
  "did",
  "get",
  "gets",
  "got",
  "on",
  "using",
  "use",
  "can",
  "will",
  "is",
  "are",
  "i",
  "me",
  "my",
  "purchase",
  "purchases",
  "spend",
  "spends",
  "transaction",
  "transactions",
  "reward",
  "rewards",
  "and",
  "or",
  "the",
  "of",
  "in",
  "at",
  "by",
  "an",
  "to",
  "a"
]);

const genericCardNameWords = new Set([
  "travel",
  "cashback",
  "lounge",
  "premium",
  "platinum",
  "gold",
  "signature",
  "rewards",
  "reward",
  "visa",
  "mastercard",
  "rupay",
  "metal",
  "club",
  "miles",
  "air",
  "premier"
]);

const queryTokenCanonicalMap: Record<string, string> = {
  mmt: "makemytrip",
  mrcc: "membership rewards",
  millenia: "millennia",
  milenia: "millennia"
};

const queryPhraseCardIdMap: Array<{ phrases: string[]; cardId: string }> = [
  { phrases: ["icici mmt", "mmt icici"], cardId: "icici-makemytrip" },
  { phrases: ["amex mrcc", "mrcc amex", "american express mrcc"], cardId: "amex-membership-rewards" },
  { phrases: ["platinum reserve", "amex platinum reserve", "american express platinum reserve"], cardId: "amex-platinum-reserve" },
  { phrases: ["hdfc millenia", "millenia hdfc", "hdfc milenia", "milenia hdfc"], cardId: "hdfc-millennia" },
  { phrases: ["idfc millenia", "millenia idfc", "idfc first millenia", "idfc milenia", "milenia idfc", "idfc first milenia"], cardId: "idfc-first-millennia" }
];

function normalizeQuery(query?: string) {
  return query?.toLowerCase().trim() ?? "";
}

function normalizeCompact(value?: string) {
  return normalizeForMatch(value).replace(/\s+/g, "");
}

function normalizeForMatch(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNormalizedPhrase(haystack: string, phrase?: string) {
  const normalizedPhrase = normalizeForMatch(phrase);
  if (!normalizedPhrase) return false;

  const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedPhrase).replace(/ /g, "\\s+")}(?=\\s|$)`);
  return pattern.test(haystack);
}

const bareSpendCategoryPhrases = new Set([
  "travel",
  "flights",
  "hotels",
  "grocery",
  "groceries",
  "utilities",
  "utility",
  "utility bills",
  "bill payment",
  "bill payments",
  "bills",
  "dining",
  "restaurants",
  "fuel",
  "petrol",
  "online shopping",
  "online spends",
  "amazon",
  "upi",
  "rent",
  "rent payments",
  "insurance",
  "education payments",
  "school fees",
  "gold",
  "government payments",
  "international spends",
  "forex"
]);

function formatRupees(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function joinNatural(parts: string[]) {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function buildImportantFeatures(cardScore: CardScore) {
  const { card } = cardScore;
  const features: string[] = [];

  if (card.bestFor.length > 0) {
    features.push(`Built for ${joinNatural(card.bestFor.slice(0, 3))}`);
  }

  if (card.rewardType) {
    features.push(`Earns ${card.rewardType}`);
  }

  const totalLoungeAccess = getTotalLoungeAccess(card);
  if (totalLoungeAccess === "unlimited") {
    features.push("Unlimited lounge access");
  } else if (card.combinedLoungeAccess !== undefined && typeof totalLoungeAccess === "number" && totalLoungeAccess > 0) {
    features.push(`${totalLoungeAccess} lounge visits each year`);
  } else {
    const loungeParts = [
      typeof card.loungeDomestic === "number" && card.loungeDomestic > 0 ? `${card.loungeDomestic} domestic lounge visits` : "",
      typeof card.loungeInternational === "number" && card.loungeInternational > 0 ? `${card.loungeInternational} international lounge visits` : ""
    ].filter(Boolean);

    if (loungeParts.length > 0) {
      features.push(joinNatural(loungeParts));
    }
  }

  if (card.forexMarkup <= 2) {
    features.push(`${card.forexMarkup}% forex markup`);
  }

  if (card.annualFee === 0) {
    features.push("No annual fee");
  }

  return features.slice(0, 3);
}

function buildBestFitHighlights(topCard: CardScore, alternativeNames: string[], scenarioHighlights: string[]) {
  // Keep the "take" skimmable: a single headline feature, then the decision guidance and the closest
  // alternative — deduped and capped, instead of dumping every card spec, scenario, and fee-waiver.
  const headlineFeature = buildImportantFeatures(topCard).slice(0, 1);
  const alternativeLine =
    alternativeNames.length > 0
      ? [`${alternativeNames.length === 1 ? "Closest alternative" : "Closest alternatives"}: ${joinNatural(alternativeNames)}.`]
      : [];
  return [...new Set([...headlineFeature, ...scenarioHighlights, ...alternativeLine])].slice(0, 4);
}

function monthlySpendTotal(spend: RecommendationInput["spend"] | Record<string, number>) {
  return Object.values(spend ?? {}).reduce((total, amount) => total + (amount ?? 0), 0);
}

function scaleSpendProfileToAnnual(baseSpend: typeof defaultSpendProfile, annualTarget: number) {
  const monthlyTarget = annualTarget / 12;
  const baseMonthly = monthlySpendTotal(baseSpend);
  const factor = baseMonthly > 0 ? monthlyTarget / baseMonthly : 1;

  return Object.fromEntries(
    Object.entries(baseSpend).map(([category, amount]) => [category, Math.round((amount ?? 0) * factor)])
  );
}

function formatAnnualSpendLabel(annualTarget: number, suffixPlus = false) {
  const lakhValue = annualTarget / 100000;
  const formattedLakh = Number.isInteger(lakhValue) ? `${lakhValue}` : lakhValue.toFixed(1);
  return `${formattedLakh}L${suffixPlus ? "+" : ""}`;
}

function formatWaiverRupees(value: number) {
  return `₹${formatAnnualSpendLabel(value)}`;
}

function determineScenarioTargets(input: RecommendationInput, answerCards: CardScore[]) {
  const intent = parseQueryIntent(input);
  const candidateCards = answerCards.map((item) => item.card);

  const isLtfComparison =
    intent.segments.includes("ltf") ||
    (candidateCards.length > 0 && candidateCards.every((card) => card.annualFee === 0));

  const isSuperPremiumComparison =
    intent.segments.includes("super-premium") ||
    candidateCards.some(
      (card) =>
        card.annualFee >= 10000 ||
        card.bestFor.some((item) => normalizeForMatch(item).includes("super premium")) ||
        card.bestFor.some((item) => normalizeForMatch(item).includes("invite only")) ||
        card.tags.some((item) => normalizeForMatch(item).includes("super premium"))
    );

  if (isLtfComparison) {
    return [
      { annualTarget: 100000, label: "1L" },
      { annualTarget: 300000, label: "3L" },
      { annualTarget: 500000, label: "5L" }
    ];
  }

  if (isSuperPremiumComparison) {
    return [
      { annualTarget: 500000, label: "5L" },
      { annualTarget: 1000000, label: "10L" },
      { annualTarget: 1500000, label: "15L+" }
    ];
  }

  return [
    { annualTarget: 300000, label: "3L" },
    { annualTarget: 500000, label: "5L" },
    { annualTarget: 1000000, label: "10L" },
    { annualTarget: 1500000, label: "15L" }
  ];
}

function pickScenarioWinner(input: RecommendationInput, spend: RecommendationInput["spend"]) {
  return scoreCards({ ...input, spend })[0] ?? null;
}

function buildBalancedScenarioHighlights(input: RecommendationInput, answerCards: CardScore[]) {
  const scenarioResults = determineScenarioTargets(input, answerCards).flatMap(({ annualTarget, label }) => {
    const winner = pickScenarioWinner(input, scaleSpendProfileToAnnual(defaultSpendProfile, annualTarget));
    return winner ? [{ label, winner }] : [];
  });

  const winnerIds = new Set(scenarioResults.map((result) => result.winner.card.id));
  if (winnerIds.size <= 1) return [];

  const groupedByWinner = new Map<string, { cardName: string; labels: string[] }>();
  for (const result of scenarioResults) {
    const existing = groupedByWinner.get(result.winner.card.id);
    if (existing) {
      existing.labels.push(result.label);
    } else {
      groupedByWinner.set(result.winner.card.id, {
        cardName: result.winner.card.name,
        labels: [result.label]
      });
    }
  }

  const groupedEntries = [...groupedByWinner.values()].map(({ cardName, labels }) => `${cardName} at ${labels.join("/")}`);

  return [`Best by yearly spend — ${groupedEntries.join("; ")}.`];
}

function buildTopCardsHighlights(input: RecommendationInput, answerCards: CardScore[]) {
  // No spend was given, so cards are ranked on blended all-round value across light/mid/heavy spend
  // (not a single "strongest" tier). One short framing line, then the scenario guidance — capped.
  const framing = answerCards.some((score) => score.envelopeScoring)
    ? ["No monthly spend was given, so these are ranked on all-round value across light, mid, and heavy spend."]
    : [];

  return [...framing, ...buildScenarioHighlights(input, answerCards)].slice(0, 4);
}

function getBalancedScenarioWinnerCards(input: RecommendationInput, answerCards: CardScore[]) {
  const scenarioResults = determineScenarioTargets(input, answerCards).flatMap(({ annualTarget }) => {
    const winner = pickScenarioWinner(input, scaleSpendProfileToAnnual(defaultSpendProfile, annualTarget));
    return winner ? [winner] : [];
  });

  const winnerIds = new Set(scenarioResults.map((result) => result.card.id));
  if (winnerIds.size <= 1) return [];

  const winners: CardScore[] = [];
  for (const result of scenarioResults) {
    if (winners.some((item) => item.card.id === result.card.id)) continue;
    winners.push(result);
  }

  return winners;
}

function buildScenarioHighlights(
  input: RecommendationInput,
  answerCards: CardScore[],
  options?: {
    skip?: boolean;
  }
) {
  if (options?.skip) return [];

  const intent = parseQueryIntent(input);
  const hasSpendContext = Boolean(input.spend) || Boolean(intent.inferredSpend);
  if (hasSpendContext) return [];

  const balancedHighlights = buildBalancedScenarioHighlights(input, answerCards);

  const smartbuyHeavySpend = {
    online: 32000,
    travel: 10000,
    dining: 5000,
    base: 6000,
    grocery: 0,
    fuel: 0,
    amazon: 0,
    upi: 0,
    utilities: 0
  };

  const travelHeavySpend = {
    online: 5000,
    travel: 32000,
    dining: 4000,
    base: 6000,
    grocery: 3000,
    fuel: 0,
    amazon: 0,
    upi: 0,
    utilities: 3000
  };

  const smartbuyWinner = pickScenarioWinner(input, smartbuyHeavySpend);
  const travelWinner = pickScenarioWinner(input, travelHeavySpend);
  const scenarioHighlights = [...balancedHighlights];
  const topCardId = answerCards[0]?.card.id;
  const answerCardIds = new Set(answerCards.map((item) => item.card.id));

  const isAltWinner = (winner: CardScore | null): winner is CardScore =>
    Boolean(winner && winner.card.id !== topCardId && answerCardIds.has(winner.card.id));
  const smartbuyAlt = isAltWinner(smartbuyWinner) ? smartbuyWinner : null;
  const travelAlt = isAltWinner(travelWinner) ? travelWinner : null;

  // Collapse to a single guidance line when both scenarios point to the same alternative.
  if (smartbuyAlt && travelAlt && smartbuyAlt.card.id === travelAlt.card.id) {
    scenarioHighlights.push(`For heavier online or travel spend, ${smartbuyAlt.card.name} pulls ahead.`);
  } else {
    if (smartbuyAlt) scenarioHighlights.push(`For online and partner-brand spend, ${smartbuyAlt.card.name} pulls ahead.`);
    if (travelAlt) scenarioHighlights.push(`For travel-heavy spend, ${travelAlt.card.name} pulls ahead.`);
  }

  // Consolidate fee-waiver thresholds into one line instead of one bullet per card.
  const cardsToInspect = [...answerCards, ...(smartbuyWinner ? [smartbuyWinner] : []), ...(travelWinner ? [travelWinner] : [])];
  const seenThresholdCards = new Set<string>();
  const waiverParts: Array<{ name: string; amount: string }> = [];
  for (const score of cardsToInspect) {
    if (!score?.card.feeWaiverSpend || seenThresholdCards.has(score.card.id)) continue;
    if (score.card.feeWaiverSpend < 500000 || score.card.feeWaiverSpend > 1500000) continue;
    seenThresholdCards.add(score.card.id);
    waiverParts.push({ name: score.card.name, amount: formatWaiverRupees(score.card.feeWaiverSpend) });
  }
  if (waiverParts.length === 1) {
    scenarioHighlights.push(`Fee waiver kicks in around ${waiverParts[0].amount}/year spend.`);
  } else if (waiverParts.length > 1) {
    // Cap the list so a large top-N answer doesn't produce a 10-card line.
    const shown = waiverParts.slice(0, 3).map((part) => `${part.name}: ${part.amount}`);
    const suffix = waiverParts.length > 3 ? " · and more" : "";
    scenarioHighlights.push(`Fee waivers per year — ${shown.join(" · ")}${suffix}.`);
  }

  return [...new Set(scenarioHighlights)];
}

function containsAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function getAlternativeNames(cardScore: CardScore, shortlistedCards?: CardScore[]) {
  return (cardScore.card.alternativeCardIds ?? [])
    .map((cardId) => shortlistedCards?.find((item) => item.card.id === cardId)?.card.name ?? getCardById(cardId)?.name ?? null)
    .filter((name): name is string => Boolean(name) && name !== cardScore.card.name);
}

function isTopBestCardsQuery(query?: string) {
  const normalized = normalizeForMatch(query);
  if (!normalized) return false;
  return /\b(top|best|recommend|recommended|suggest)\b/.test(normalized) && /\bcards?\b/.test(normalized);
}

export function buildFallbackSummary(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const topCard = shortlistedCards[0];
  if (!topCard) {
    return "I could not find a good match for that question.";
  }

  const isRanking = isTopBestCardsQuery(input.query) || input.resultStrategy === "reward-type-split";
  if (isRanking && shortlistedCards.length > 1) {
    const requestedCount = requestedTopCardCount(input.query, input.resultStrategy);
    const topThreeText = shortlistedCards.length >= requestedCount ? `Top ${requestedCount} picks` : "Top picks";

    return `${topThreeText} for this query.`;
  }

  const lowerQuery = normalizeQuery(input.query);
  const compactQuery = normalizeCompact(input.query);
  const compactName = normalizeCompact(topCard.card.name);
  const compactId = normalizeCompact(topCard.card.id.replace(/-/g, " "));
  const normalizedName = normalizeForMatch(topCard.card.name);
  const normalizedId = normalizeForMatch(topCard.card.id.replace(/-/g, " "));
  const queryWords = lowerQuery.split(/\s+/).filter(Boolean);
  const topCardNameTokens = new Set(`${normalizedName} ${normalizedId}`.split(" ").filter(Boolean));
  const exactNameAsked =
    containsNormalizedPhrase(normalizedName, input.query) ||
    containsNormalizedPhrase(normalizedId, input.query) ||
    (compactQuery.length > 0 && queryWords.length > 1 && (compactName.includes(compactQuery) || compactId.includes(compactQuery))) ||
    (lowerQuery.length > 0 && queryWords.every((token) => token.length > 2 && topCardNameTokens.has(token)));

  const fitReasons = topCard.reasons
    .filter(
      (reason) =>
        !reason.startsWith("Strong card-name match") &&
        !reason.startsWith("Matches ") &&
        !reason.startsWith("Best at ") &&
        !reason.startsWith("Fee waiver needs") &&
        !/\buses\b.*\brewards\b/i.test(reason) // skip mechanical "<category> uses <type> rewards"
    )
    .slice(0, 2);

  const curatedAlternativeNames = getAlternativeNames(topCard, shortlistedCards);

  const fallbackAlternativeNames = shortlistedCards
    .slice(1, 3)
    .map((item) => item.card.name)
    .filter((name) => name !== topCard.card.name);

  const alternativeNames = curatedAlternativeNames.length > 0 ? curatedAlternativeNames : fallbackAlternativeNames;

  const opener = exactNameAsked
    ? `If you specifically mean ${topCard.card.name}, that looks like the right fit.`
    : `${topCard.card.name} looks like the best fit.`;

  // Lowercase only each reason's leading letter so the clause reads naturally after "because"
  // while preserving units and proper nouns inside (e.g. "Rs 5,000", card names).
  const whyItFits =
    fitReasons.length > 0
      ? `It stands out because ${joinNatural(fitReasons.map((reason) => reason.charAt(0).toLowerCase() + reason.slice(1)))}.`
      : "";

  return [opener, whyItFits].filter(Boolean).join(" ");
}

function getMeaningfulQueryTokens(query?: string) {
  return normalizeForMatch(query)
    .split(" ")
    .map((token) => queryTokenCanonicalMap[token] ?? token)
    .filter((token) => token.length > 1 && !genericLookupWords.has(token));
}

function isBareSpendCategoryQuery(query?: string) {
  const normalized = normalizeForMatch(query);
  if (!normalized) return false;
  return bareSpendCategoryPhrases.has(normalized);
}

function findExactCardNameOrIdMatch(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  const compactQuery = normalizeCompact(query);
  if (!normalizedQuery) return null;

  const directPhraseMatch = queryPhraseCardIdMap.find((entry) =>
    entry.phrases.some((phrase) => normalizeForMatch(phrase) === normalizedQuery)
  );
  if (directPhraseMatch) return directPhraseMatch.cardId;

  const exactMatch = cards.find((card) => {
    const nameText = normalizeForMatch(card.name);
    const idText = normalizeForMatch(card.id.replace(/-/g, " "));
    return (
      nameText === normalizedQuery ||
      idText === normalizedQuery ||
      (compactQuery.length > 0 && (normalizeCompact(card.name) === compactQuery || normalizeCompact(card.id.replace(/-/g, " ")) === compactQuery))
    );
  });

  return exactMatch?.id ?? null;
}

function getMeaningfulCardTokens(card: { name: string; issuer: string; id: string }) {
  const issuerTokens = new Set(normalizeForMatch(card.issuer).split(" ").filter(Boolean));

  return normalizeForMatch(`${card.name} ${card.id.replace(/-/g, " ")}`)
    .split(" ")
    .filter(
      (token) =>
        token.length > 2 &&
        !genericLookupWords.has(token) &&
        !genericCardNameWords.has(token) &&
        !issuerTokens.has(token)
    );
}

function editDistanceWithinOne(left: string, right: string) {
  if (left === right) return true;
  const lengthDelta = Math.abs(left.length - right.length);
  if (lengthDelta > 1) return false;
  if (left.length < 5 || right.length < 5) return false;

  let i = 0;
  let j = 0;
  let differences = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }

    differences += 1;
    if (differences > 1) return false;

    if (left.length > right.length) {
      i += 1;
    } else if (right.length > left.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < left.length || j < right.length) differences += 1;
  return differences <= 1;
}

function findMentionedCardId(query?: string) {
  const normalizedQuery = normalizeForMatch(query);
  const compactQuery = normalizeCompact(query);
  const queryTokens = getMeaningfulQueryTokens(query);

  if (!normalizedQuery || queryTokens.length === 0) return null;

  const directPhraseMatch = queryPhraseCardIdMap.find((entry) =>
    entry.phrases.some((phrase) => normalizeForMatch(phrase) === normalizedQuery)
  );
  if (directPhraseMatch) return directPhraseMatch.cardId;

  const intent = parseQueryIntent({ query });
  const queryIssuers = intent.issuers;

  let bestMatch: { id: string; score: number; matchedCardTokens: number; exactMatch: boolean } | null = null;

  for (const card of cards) {
    if (queryIssuers.length > 0 && !queryIssuers.includes(card.issuer)) {
      continue;
    }

    const nameText = normalizeForMatch(card.name);
    const idText = normalizeForMatch(card.id.replace(/-/g, " "));
    const compactName = normalizeCompact(card.name);
    const compactId = normalizeCompact(card.id.replace(/-/g, " "));
    const compactTags = card.tags.map((tag) => normalizeCompact(tag)).filter(Boolean);
    const searchTokens = new Set(
      normalizeForMatch(`${card.issuer} ${card.name} ${card.id.replace(/-/g, " ")}`).split(" ").filter(Boolean)
    );
    const cardTokens = getMeaningfulCardTokens(card);

    let score = 0;
    let exactMatch = false;

    if (nameText === normalizedQuery || idText === normalizedQuery) {
      score += 200;
      exactMatch = true;
    }

    if (compactQuery && (compactName === compactQuery || compactId === compactQuery || compactTags.includes(compactQuery))) {
      score += 180;
      exactMatch = true;
    }

    for (const token of queryTokens) {
      if (cardTokens.includes(token)) {
        score += 35;
        continue;
      }

      const fuzzyTokenMatch =
        queryTokens.length === 1 &&
        cardTokens.some((cardToken) => editDistanceWithinOne(token, cardToken));

      if (fuzzyTokenMatch) {
        score += 36;
        continue;
      }

      if (searchTokens.has(token)) score += 8;
    }

    const matchedCardTokens = cardTokens.filter((token) => queryTokens.includes(token)).length;
    if (matchedCardTokens > 0 && matchedCardTokens === cardTokens.length) {
      score += 90;
    }

    if (
      score > 0 &&
      (!bestMatch ||
        score > bestMatch.score ||
        (score === bestMatch.score && matchedCardTokens > bestMatch.matchedCardTokens))
    ) {
      bestMatch = { id: card.id, score, matchedCardTokens, exactMatch };
    }
  }

  if (!bestMatch) return null;
  if (bestMatch.exactMatch) return bestMatch.id;

  if (bestMatch.matchedCardTokens >= 1 && bestMatch.score >= 35) return bestMatch.id;
  if (queryTokens.length === 1 && bestMatch.score >= 35) return bestMatch.id;

  return null;
}

function buildShortlistFromMentionedCard(scoredCards: CardScore[], mentionedCardId: string | null) {
  const fallbackCount = 3;
  if (!mentionedCardId) {
    return {
      cards: scoredCards.slice(0, fallbackCount),
      mentionedCardId: null
    };
  }

  const mentionedCard = scoredCards.find((item) => item.card.id === mentionedCardId);
  if (!mentionedCard) {
    return {
      cards: scoredCards.slice(0, fallbackCount),
      mentionedCardId
    };
  }

  return {
    cards: [mentionedCard, ...scoredCards.filter((item) => item.card.id !== mentionedCardId).slice(0, fallbackCount - 1)],
    mentionedCardId
  };
}

function boostContextCards(scoredCards: CardScore[], input: RecommendationInput, sourceCards: CardScore[] = scoredCards) {
  if (!input.contextCardIds?.length) return scoredCards;

  const contextSet = new Set(input.contextCardIds);
  const contextCards = sourceCards.filter((item) => contextSet.has(item.card.id));
  if (contextCards.length === 0) return scoredCards;

  return [
    ...contextCards,
    ...scoredCards.filter((item) => !contextSet.has(item.card.id))
  ].slice(0, scoredCards.length);
}

function buildContextSourceCards(input: RecommendationInput, scoredCards: CardScore[]) {
  if (!input.contextCardIds?.length) return scoredCards;

  const contextQuery = input.previousQuery ?? input.query ?? "best overall";
  const previousQueryScores = scoreCards({
    ...input,
    query: contextQuery,
    previousQuery: undefined,
    contextCardIds: undefined
  });
  const seenIds = new Set<string>();

  return [...scoredCards, ...previousQueryScores].filter((item) => {
    if (seenIds.has(item.card.id)) return false;
    seenIds.add(item.card.id);
    return true;
  });
}

function shortlistCardsForQuestion(input: RecommendationInput, scoredCards = boostContextCards(scoreCards(input), input)) {
  let mentionedCardId =
    isBareSpendCategoryQuery(input.query)
      ? findExactCardNameOrIdMatch(input.query)
      : findMentionedCardId(input.query);

  if (input.contextCardIds?.length && mentionedCardId && !findExactCardNameOrIdMatch(input.query)) {
    mentionedCardId = null;
  }

  return buildShortlistFromMentionedCard(scoredCards, mentionedCardId);
}

function isNamedCardQuestion(input: RecommendationInput, mentionedCardId?: string | null) {
  if (!mentionedCardId) return false;

  const intent = parseQueryIntent(input);
  const normalizedQuery = normalizeForMatch(input.query);

  if (/\b(best|top|recommended|recommend)\b/.test(normalizedQuery)) return false;
  if (intent.useCases.length > 0 || intent.redemptionBuckets.length > 0 || intent.networks.length > 0) return false;
  if (input.maxAnnualFee !== undefined || intent.maxAnnualFee !== undefined) return false;
  if (input.wantsLounge || input.wantsLifetimeFree) return false;

  return true;
}

function isSpecificCardLookup(input: RecommendationInput) {
  const intent = parseQueryIntent(input);
  const normalizedQuery = normalizeForMatch(input.query);
  const meaningfulTokens = getMeaningfulQueryTokens(input.query);

  if (isTopBestCardsQuery(input.query)) return false;
  if (isBareSpendCategoryQuery(input.query) && !findExactCardNameOrIdMatch(input.query)) return false;
  if (meaningfulTokens.length === 0 || meaningfulTokens.length > 3) return false;
  if (meaningfulTokens.every((token) => /^\d+$/.test(token))) return false;
  if (intent.useCases.length > 0 || intent.segments.length > 0 || intent.redemptionBuckets.length > 0 || intent.networks.length > 0) return false;
  if (intent.tags.some((tag) => tag !== "premium")) return false;
  if (/\b(under|below|less than|upto|up to|above|over)\b/.test(normalizedQuery)) return false;

  if (intent.issuers.length > 0) {
    const issuerTokens = new Set(
      intent.issuers.flatMap((issuer) => normalizeForMatch(issuer).split(" ").filter((token) => token.length > 1))
    );

    if (meaningfulTokens.every((token) => issuerTokens.has(token))) {
      return false;
    }
  }

  const queryIsIssuerOnly = cards.some((card) => normalizeQuery(card.issuer) === intent.normalizedQuery);
  if (queryIsIssuerOnly) return false;

  return true;
}

function shouldTryAiCardResolution(input: RecommendationInput, mentionedCardId?: string | null) {
  if (mentionedCardId) return false;

  const normalizedQuery = normalizeForMatch(input.query);
  const meaningfulTokens = getMeaningfulQueryTokens(input.query);
  const intent = parseQueryIntent(input);

  if (!normalizedQuery || meaningfulTokens.length === 0 || meaningfulTokens.length > 3) return false;
  if (isBareSpendCategoryQuery(input.query) && !findExactCardNameOrIdMatch(input.query)) return false;
  if (/\b(top|best|recommend|recommended|suggest|compare|vs)\b/.test(normalizedQuery)) return false;
  if (/\b(under|below|less than|upto|up to|above|over)\b/.test(normalizedQuery)) return false;
  if (input.maxAnnualFee !== undefined || intent.maxAnnualFee !== undefined) return false;
  if (input.wantsLounge || input.wantsLifetimeFree) return false;
  if (input.spend || intent.inferredSpend) return false;

  return true;
}

function topCardMatchesSpecificLookup(input: RecommendationInput, topCard: CardScore) {
  const meaningfulTokens = getMeaningfulQueryTokens(input.query);
  if (meaningfulTokens.length === 0) return false;

  const nameText = normalizeForMatch(topCard.card.name);
  const idText = normalizeForMatch(topCard.card.id.replace(/-/g, " "));

  return meaningfulTokens.every((token) => nameText.includes(token) || idText.includes(token));
}

function extractRewardsPolicySubject(query?: string) {
  const normalized = normalizeForMatch(query);
  if (!normalized) return null;

  const patterns = [
    /rewards?\s+on\s+(.+?)(?:\s+purchase|\s+purchases|\s+spend|\s+spends|\s+transaction|\s+transactions|\s+using|$)/,
    /(?:earn|earning)\s+(?:points|rewards?|miles)\s+(?:on|for)\s+(.+?)(?:\s+purchase|\s+purchases|\s+spend|\s+spends|\s+with|\s+using|$)/,
    /give(?:s)?\s+(?:points|rewards?|miles)\s+(?:on|for)\s+(.+?)(?:\s+purchase|\s+purchases|\s+spend|\s+spends|\s+with|\s+using|$)/
  ];

  const match = patterns.map((pattern) => normalized.match(pattern)).find(Boolean);
  if (!match?.[1]) return null;

  const subject = match[1].trim();
  return subject || null;
}

function extractExclusionSubject(query?: string) {
  const normalized = normalizeForMatch(query);
  if (!normalized) return null;

  const patterns = [
    /is\s+(.+?)\s+excluded(?:\s+on|\s+for|\s+with|\s+using|$)/,
    /are\s+(.+?)\s+excluded(?:\s+on|\s+for|\s+with|\s+using|$)/,
    /does\s+.+?\s+exclude\s+(.+?)(?:\s+for|\s+on|\s+with|\s+using|$)/
  ];

  const match = patterns.map((pattern) => normalized.match(pattern)).find(Boolean);
  if (!match?.[1]) return null;

  return match[1].trim() || null;
}

function parseSpecificCardQuestion(query?: string): ParsedCardQuestion {
  const normalized = normalizeForMatch(query);
  if (!normalized) return { questionType: "generic" };

  if (
    (normalized.includes("get reward") ||
      normalized.includes("get points") ||
      normalized.includes("earn points") ||
      normalized.includes("earn miles") ||
      normalized.includes("give rewards") ||
      normalized.includes("gives rewards") ||
      normalized.includes("earn reward") ||
      normalized.includes("reward on") ||
      normalized.includes("rewards on")) &&
    (normalized.includes("purchase") ||
      normalized.includes("spend") ||
      normalized.includes("transaction") ||
      normalized.includes("using") ||
      normalized.includes(" on "))
  ) {
    return {
      questionType: "rewards_eligibility",
      spendSubject: extractRewardsPolicySubject(query) ?? undefined
    };
  }

  if (normalized.includes("excluded") || normalized.includes("exclude")) {
    return {
      questionType: "exclusion_check",
      spendSubject: extractExclusionSubject(query) ?? undefined
    };
  }

  if (normalized.includes("lounge")) return { questionType: "lounge" };
  if (normalized.includes("fee waiver") || normalized.includes("waive annual fee")) return { questionType: "fee_waiver" };
  if (normalized.includes("forex")) return { questionType: "forex" };
  if (normalized.includes("milestone")) return { questionType: "milestone" };
  if (normalized.includes("redeem") || normalized.includes("redemption")) return { questionType: "redemption" };
  if (normalized.includes("eligible") || normalized.includes("eligibility")) return { questionType: "eligibility" };

  return { questionType: "generic" };
}

function inferSpendCategory(subject: string) {
  const normalized = normalizeForMatch(subject);

  if (containsAny(normalized, ["gold", "jewellery", "jewelry", "jewel"])) return "base";
  if (containsAny(normalized, ["rent", "rental", "landlord"])) return "rent";
  if (containsAny(normalized, ["fuel", "petrol", "diesel"])) return "fuel";
  if (containsAny(normalized, ["grocery", "groceries"])) return "grocery";
  if (containsAny(normalized, ["dining", "restaurant", "food", "swiggy", "zomato"])) return "dining";
  if (containsAny(normalized, ["flight", "hotel", "travel", "train", "airline"])) return "travel";
  if (containsAny(normalized, ["amazon"])) return "amazon";
  if (containsAny(normalized, ["upi", "rupay"])) return "upi";
  if (containsAny(normalized, ["utility", "electricity", "water", "bill", "recharge"])) return "utilities";
  if (containsAny(normalized, ["online", "ecommerce", "shopping"])) return "online";

  return null;
}

function getSubjectAliases(subject: string) {
  const normalized = normalizeForMatch(subject);
  const aliases = new Set<string>(normalized.split(" ").filter((token) => token.length > 1));

  const aliasGroups: Array<{ match: string[]; aliases: string[] }> = [
    { match: ["rent", "rental", "landlord"], aliases: ["rent", "rental", "rental payments", "landlord"] },
    { match: ["wallet", "wallet load", "wallet loads"], aliases: ["wallet", "wallet load", "wallet loads"] },
    { match: ["gold", "jewellery", "jewelry", "jewel"], aliases: ["gold", "jewellery", "jewelry", "jewel"] },
    { match: ["insurance", "premium"], aliases: ["insurance", "premium"] },
    { match: ["government", "govt"], aliases: ["government", "govt"] },
    { match: ["utility", "utilities", "bill", "bills"], aliases: ["utility", "utilities", "bill", "bills", "utility bills"] }
  ];

  for (const group of aliasGroups) {
    if (group.match.some((token) => normalized.includes(token))) {
      for (const alias of group.aliases) aliases.add(alias);
    }
  }

  return [...aliases];
}

function subjectMatchesExclusions(exclusions: string[], subject: string) {
  const exclusionText = normalizeForMatch(exclusions.join(" "));
  return getSubjectAliases(subject).some((alias) => exclusionText.includes(normalizeForMatch(alias)));
}

function rewardRateLabelForAnswer(cardScore: CardScore, rate: number) {
  // `rate` is the canonical earn rate and may carry full precision (e.g. 3.3333333333333335 for a
  // "5 points / Rs 150" row); round for display so the user sees a clean figure.
  const display = Number(rate.toFixed(2));
  const rewardTypeLower = cardScore.card.rewardType.toLowerCase();
  if (rewardTypeLower.includes("point") || rewardTypeLower.includes("mile")) {
    return `${display} ${cardScore.card.rewardType} per ₹100`;
  }

  return `${display}%`;
}

function buildSpecificQuestionAnswer(input: RecommendationInput, topCard: CardScore) {
  const parsed = parseSpecificCardQuestion(input.query);
  if (parsed.questionType === "generic") return null;

  if (parsed.questionType === "rewards_eligibility" && parsed.spendSubject) {
    const subject = parsed.spendSubject;
    const subjectCategory = inferSpendCategory(subject);
    const normalizedSubject = normalizeForMatch(subject);
    const rewardMatch =
      topCard.card.rewards.find((reward) => normalizeForMatch(reward.category).includes(normalizedSubject)) ??
      (subjectCategory
        ? topCard.card.rewards.find((reward) => normalizeForMatch(reward.category).includes(subjectCategory))
        : null);

    if (subjectMatchesExclusions(topCard.card.exclusions, subject)) {
      return {
        summary: `No, ${topCard.card.name} does not appear to earn rewards on ${subject} purchases based on the listed exclusions.`,
        highlights: [
          `Excluded category match found for ${subject}.`,
          `Relevant exclusion: ${topCard.card.exclusions.find((entry) => subjectMatchesExclusions([entry], subject)) ?? topCard.card.exclusions[0] ?? "Issuer exclusions listed for this card."}`
        ]
      };
    }

    if (rewardMatch) {
      const directMatch = normalizeForMatch(rewardMatch.category).includes(normalizedSubject);
      const answerPrefix = directMatch ? "Yes" : "Based on the current dataset, yes";
      const answerPrefixClean = directMatch ? "Yes" : "Yes";
      const confidenceLine = directMatch
        ? `The card has a matching rewards bucket for ${rewardMatch.category}.`
        : `${subject} purchases would generally fall under ${rewardMatch.category} spends and are not listed in exclusions.`;

      return {
        summary: `${answerPrefixClean}, ${topCard.card.name} should earn rewards on ${subject} purchases.`,
        highlights: [
          confidenceLine,
          `Expected earn rate: ${rewardRateLabelForAnswer(topCard, rewardMatch.rate)}.`
        ]
      };
    }

    return null;
  }

  if (parsed.questionType === "exclusion_check" && parsed.spendSubject) {
    const subject = parsed.spendSubject;

    if (subjectMatchesExclusions(topCard.card.exclusions, subject)) {
      return {
        summary: `Yes, ${subject} is part of the listed exclusions on ${topCard.card.name}.`,
        highlights: [
          `Excluded category match found for ${subject}.`,
          `Relevant exclusion: ${topCard.card.exclusions.find((entry) => subjectMatchesExclusions([entry], subject)) ?? topCard.card.exclusions[0] ?? "Issuer exclusions listed for this card."}`
        ]
      };
    }

    return {
      summary: `No, ${subject} is not explicitly listed in the exclusions for ${topCard.card.name}.`,
      highlights: ["No matching exclusion entry was found for that category."]
    };
  }

  if (parsed.questionType === "lounge") {
    return {
      summary: `${topCard.card.name} lists ${topCard.card.loungeDomestic === "unlimited" ? "unlimited" : topCard.card.loungeDomestic} domestic and ${topCard.card.loungeInternational === "unlimited" ? "unlimited" : topCard.card.loungeInternational} international lounge accesses.`,
      highlights: buildImportantFeatures(topCard)
    };
  }

  if (parsed.questionType === "fee_waiver") {
    return {
      summary:
        topCard.card.feeWaiverSpend !== null
          ? `${topCard.card.name} lists an annual fee waiver spend target of ${formatWaiverRupees(topCard.card.feeWaiverSpend)}.`
          : `${topCard.card.name} does not list a fee-waiver spend target.`,
      highlights: topCard.card.feeWaiverSpend !== null ? [`Fee waiver threshold: ${formatWaiverRupees(topCard.card.feeWaiverSpend)}.`] : []
    };
  }

  if (parsed.questionType === "forex") {
    return {
      summary: `${topCard.card.name} lists a forex markup of ${topCard.card.forexMarkup}%.`,
      highlights: topCard.card.forexMarkup <= 2 ? ["This is relatively low for an Indian credit card."] : []
    };
  }

  if (parsed.questionType === "milestone") {
    if (topCard.card.milestoneBenefits?.length) {
      return {
        summary: `${topCard.card.name} does include milestone benefits.`,
        highlights: topCard.card.milestoneBenefits.slice(0, 3)
      };
    }

    return null;
  }

  if (parsed.questionType === "redemption") {
    if (topCard.card.redemption) {
      const highlights = [
        typeof topCard.card.redemption.smartBuyFlightHotelValue === "number"
          ? `SmartBuy travel value: ₹${topCard.card.redemption.smartBuyFlightHotelValue} per point.`
          : "",
        typeof topCard.card.redemption.travelEdgeValue === "number"
          ? `Travel EDGE travel value: ₹${topCard.card.redemption.travelEdgeValue} per point.`
          : "",
        typeof getAirMilesValue(topCard.card) === "number"
          ? `Air miles value: ${getAirMilesValue(topCard.card)} per point.`
          : "",
        typeof topCard.card.redemption.statementBalanceValue === "number"
          ? `Statement credit value: ₹${topCard.card.redemption.statementBalanceValue} per point.`
          : ""
      ].filter(Boolean);

      return {
        summary: `${topCard.card.name} has redemption details available.`,
        highlights
      };
    }

    return null;
  }

  if (parsed.questionType === "eligibility") {
    if (topCard.card.eligibility?.salaried?.length || topCard.card.eligibility?.selfEmployed?.length) {
      return {
        summary: `${topCard.card.name} does have eligibility criteria available.`,
        highlights: [...(topCard.card.eligibility?.salaried ?? []), ...(topCard.card.eligibility?.selfEmployed ?? [])].slice(0, 3)
      };
    }

    return null;
  }

  return null;
}

function cardMentionsPolicySubject(cardScore: CardScore, subject: string) {
  const haystack = normalizeForMatch(
    [
      cardScore.card.name,
      cardScore.card.id,
      ...cardScore.card.tags,
      ...cardScore.card.bestFor,
      ...cardScore.card.exclusions,
      ...(cardScore.card.additionalBenefits ?? []),
      ...(cardScore.card.additionalDetails ?? []),
      ...(cardScore.card.internalNotes ?? []),
      ...(cardScore.card.milestoneBenefits ?? []),
      ...cardScore.card.rewards.map((reward) => reward.category)
    ].join(" ")
  );

  return subject
    .split(" ")
    .filter((token) => token.length > 1)
    .every((token) => haystack.includes(token));
}

function buildUnsupportedPolicySummary(input: RecommendationInput, topCard?: CardScore, subject?: string) {
  if (topCard && subject) {
    return `I could not verify whether ${topCard.card.name} earns rewards on ${subject} purchases.`;
  }

  return "I could not verify that rewards-policy detail.";
}

function buildDisplayCards(
  scoredCards: CardScore[],
  preferredCardId?: string | null,
  importantCards: CardScore[] = [],
  options?: { includeFallback?: boolean }
) {
  const includeFallback = options?.includeFallback ?? true;
  const primaryCard =
    (preferredCardId ? scoredCards.find((item) => item.card.id === preferredCardId) : undefined) ?? scoredCards[0];

  if (!primaryCard) return [];

  const curatedAlternatives = (primaryCard.card.alternativeCardIds ?? [])
    .flatMap((cardId) => {
      const item = scoredCards.find((entry) => entry.card.id === cardId);
      return item && item.card.id !== primaryCard.card.id ? [item] : [];
    });

  // For a specific named-card lookup we only show the matched card and any
  // curated alternatives. Padding with arbitrary top-scored cards would surface
  // unrelated cards (e.g. Infinia/DCB) as "alternatives" to a card they don't relate to.
  const fallbackCards = includeFallback
    ? scoredCards.filter(
        (item) =>
          item.card.id !== primaryCard.card.id &&
          !curatedAlternatives.some((alternative) => alternative.card.id === item.card.id)
      )
    : [];

  const orderedCards: CardScore[] = [];
  for (const item of [primaryCard, ...importantCards, ...curatedAlternatives, ...fallbackCards]) {
    if (orderedCards.some((entry) => entry.card.id === item.card.id)) continue;
    orderedCards.push(item);
  }

  return orderedCards.slice(0, 3);
}

function findCardLookupMatches(query?: string) {
  const queryTokens = getMeaningfulQueryTokens(query);
  if (queryTokens.length === 0) return [];

  return cards.filter((card) => {
    const haystack = normalizeForMatch(
      [
        card.issuer,
        card.name,
        card.id.replace(/-/g, " "),
        ...(card.tags ?? []),
        ...(card.bestFor ?? [])
      ].join(" ")
    );

    return queryTokens.every((token) => haystack.includes(token));
  });
}

function buildCardFamilyLookupResult(input: RecommendationInput, scoredCards: CardScore[]) {
  const normalizedQuery = normalizeForMatch(input.query);
  if (!normalizedQuery || /\b(top|best|recommend|recommended|suggest|compare|vs)\b/.test(normalizedQuery)) {
    return null;
  }

  const meaningfulTokens = getMeaningfulQueryTokens(input.query);
  if (meaningfulTokens.length === 0 || meaningfulTokens.length > 3) return null;

  const matchingCards = findCardLookupMatches(input.query);
  if (matchingCards.length <= 1) return null;

  const matchingIds = new Set(matchingCards.map((card) => card.id));
  const familyCards = scoredCards.filter((item) => matchingIds.has(item.card.id)).slice(0, 3);
  if (familyCards.length === 0) return null;

  const label = input.query?.trim() || "this";

  return {
    summary: `I found multiple matching ${label} cards in our database.`,
    cards: familyCards,
    highlights: [
      ...familyCards.map((item, index) => `#${index + 1}: ${item.card.name}`),
      "Open a specific card if you want exact rewards, lounge, forex, or exclusion details."
    ],
    displayMode: "ranked-list" as const
  };
}

export function resolveDirectCardDetailQuery(input: Pick<RecommendationInput, "query" | "previousQuery" | "contextCardIds">) {
  if (input.previousQuery || input.contextCardIds?.length) return null;
  if (getUnsupportedQuestionReason({ query: input.query })) return null;

  const normalizedQuery = normalizeForMatch(input.query);
  if (!normalizedQuery || /\b(top|best|recommend|recommended|suggest|compare|vs|versus)\b/.test(normalizedQuery)) {
    return null;
  }

  if (parseSpecificCardQuestion(input.query).questionType !== "generic") return null;

  const exactMatch = findExactCardNameOrIdMatch(input.query);
  if (exactMatch) return exactMatch;

  if (!isSpecificCardLookup({ query: input.query })) return null;

  const matchingCards = findCardLookupMatches(input.query);
  return matchingCards.length === 1 ? matchingCards[0].id : null;
}

export function getUnsupportedQuestionReason(input: RecommendationInput) {
  const query = normalizeQuery(input.query);
  const intent = parseQueryIntent(input);

  if (!query) return "Empty question";

  if (intent.needsLatestInfo) {
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
    console.error("Failed to write to unsupported question log:", error);
  }

  return entry;
}

function buildGroundedAskPrompt(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const hasUserSpend = Boolean(input.spend);
  const cardFacts = shortlistedCards.slice(0, 3).map((item, index) => {
    const base = {
      rank: index + 1,
      id: item.card.id,
      name: item.card.name,
      issuer: item.card.issuer,
      annualFee: item.card.annualFee,
      joiningFee: item.card.joiningFee,
      feeWaiverSpend: item.card.feeWaiverSpend ?? null,
      bestFor: item.card.bestFor,
      tags: item.card.tags,
      loungeDomestic: item.card.loungeDomestic,
      loungeInternational: item.card.loungeInternational,
      forexMarkup: item.card.forexMarkup,
      milestoneBenefits: item.card.milestoneBenefits ?? [],
      matchedTags: item.matchedTags,
      reasons: item.reasons.slice(0, 4),
      sourceUrl: item.card.sourceUrl
    };
    if (hasUserSpend) {
      return {
        ...base,
        estimatedAnnualRewards: item.displayAnnualRewards,
        estimatedAnnualFee: item.estimatedAnnualFee,
        estimatedNetValue: item.displayNetValue
      };
    }
    return base;
  });

  return JSON.stringify(
    {
      userQuestion: input.query ?? "",
      previousQuestion: input.previousQuery ?? null,
      isFollowUpQuestion: Boolean(input.previousQuery),
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

async function generateGroundedSummary(
  input: RecommendationInput,
  shortlistedCards: CardScore[],
  aiTraces?: Array<{ purpose: string; trace: AiCallTrace }>
) {
  const response = await callAiWithSchemaDetailed<{ summary: string }>({
    systemPrompt:
      "You are a grounded Indian credit-card assistant. Use only the provided shortlisted card data. Do not invent facts, do not use live web search, and do not mention cards outside the provided shortlist. Answer like a helpful expert, not like a scoring engine. In one short paragraph: directly answer the user's query, explain why the top card fits, mention the most important features of that card, mention the fee/tradeoff if relevant, and optionally mention one nearby alternative. Rules: (1) Only cite estimated annual rewards or net value figures if they are present in the card data — never invent reward amounts. (2) Never make value-judgement claims like 'the fee is worth it' or 'value exceeds the cost' unless spend data was provided by the user. (3) When mentioning milestone benefits, always state the spend threshold required to unlock them.",
    userPrompt: buildGroundedAskPrompt(input, shortlistedCards),
    schemaName: "grounded_card_answer",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" }
      },
      required: ["summary"]
    }
  });

  aiTraces?.push({ purpose: "answer_summary", trace: response.trace });

  return typeof response.result?.summary === "string" && response.result.summary.trim() ? response.result.summary.trim() : null;
}

function buildGroundedTopCardsPrompt(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const cardFacts = shortlistedCards.slice(0, 5).map((item, index) => ({
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
    combinedLoungeAccess: item.card.combinedLoungeAccess ?? null,
    forexMarkup: item.card.forexMarkup,
    envelopeBestSpend: item.envelopeScoring?.bestSpendLabel ?? null,
    estimatedAnnualRewards: item.displayAnnualRewards,
    estimatedMilestoneValue: item.estimatedMilestoneValue,
    estimatedAnnualFee: item.estimatedAnnualFee,
    estimatedNetValue: item.displayNetValue,
    reasons: item.reasons.slice(0, 5),
    sourceUrl: item.card.sourceUrl
  }));

  return JSON.stringify(
    {
      userQuestion: input.query ?? "",
      previousQuestion: input.previousQuery ?? null,
      isFollowUpQuestion: Boolean(input.previousQuery),
      requestedCount: requestedTopCardCount(input.query),
      constraints: {
        maxAnnualFee: input.maxAnnualFee ?? null,
        wantsLounge: input.wantsLounge ?? false,
        wantsLifetimeFree: input.wantsLifetimeFree ?? false
      },
      rankedCards: cardFacts
    },
    null,
    2
  );
}

async function generateTopCardsSummary(
  input: RecommendationInput,
  shortlistedCards: CardScore[],
  aiTraces?: Array<{ purpose: string; trace: AiCallTrace }>
) {
  const response = await callAiWithSchemaDetailed<{ summary: string }>({
    systemPrompt:
      "You are a grounded Indian credit-card assistant. Use only the provided ranked card shortlist. Do not change the ranking, do not invent facts, and do not mention cards outside the provided list. Write one short paragraph for a broad top-cards query. Mention the top card first, mention one or two nearby alternatives if helpful, and if envelope spend data is present, briefly note that rankings reflect each card at its strongest spend level. Keep it clean and readable, not robotic.",
    userPrompt: buildGroundedTopCardsPrompt(input, shortlistedCards),
    schemaName: "grounded_top_cards_answer",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" }
      },
      required: ["summary"]
    }
  });

  aiTraces?.push({ purpose: "top_cards_summary", trace: response.trace });
  return typeof response.result?.summary === "string" && response.result.summary.trim() ? response.result.summary.trim() : null;
}

async function tryAiDatabaseFallback(
  input: RecommendationInput,
  scoredCards: CardScore[],
  aiTraces?: Array<{ purpose: string; trace: AiCallTrace }>
) {
  if (isTopBestCardsQuery(input.query)) return null;

  const fallbackCards = scoredCards.slice(0, 3);
  if (fallbackCards.length === 0) return null;

  const generatedSummary = await generateGroundedSummary(input, fallbackCards, aiTraces);
  if (!generatedSummary) return null;

  return {
    summary: generatedSummary,
    cards: fallbackCards,
    highlights: ["Closest matches from the current verified database:"]
  };
}

function buildCardResolutionPrompt(query: string) {
  const candidateCards = cards.slice(0, 209).map((card) => ({
    id: card.id,
    name: card.name,
    issuer: card.issuer,
    tags: card.tags.slice(0, 6)
  }));

  return JSON.stringify(
    {
      userQuery: query,
      instruction:
        "Pick the single best matching card id only if the query is likely referring to a specific card name or branded card product. Prefer exact or near-exact branded matches, including cases where spaces and punctuation differ. Return null if this looks like a generic recommendation query.",
      cards: candidateCards
    },
    null,
    2
  );
}

async function resolveMentionedCardIdWithAi(
  query?: string,
  aiTraces?: Array<{ purpose: string; trace: AiCallTrace }>
) {
  if (!query?.trim()) return null;

  const response = await callAiWithSchemaDetailed<{ cardId: string | null }>({
    systemPrompt:
      "You resolve fuzzy Indian credit-card name mentions to a single stored card id. Use only the provided card list. Return a card id only when the query is likely a specific card lookup; otherwise return null.",
    userPrompt: buildCardResolutionPrompt(query),
    schemaName: "card_resolution",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        cardId: { anyOf: [{ type: "string" }, { type: "null" }] }
      },
      required: ["cardId"]
    }
  });

  aiTraces?.push({ purpose: "card_resolution", trace: response.trace });

  if (process.env.DEBUG_AI === "1") {
    console.warn("[ask-ai] card resolution result", {
      query,
      resolvedCardId: response.result?.cardId ?? null
    });
  }

  if (!response.result?.cardId) return null;
  return getCardById(response.result.cardId) ? response.result.cardId : null;
}

function sortedValues(values: readonly string[] | undefined) {
  return [...new Set(values ?? [])].sort();
}

function normalizedSpend(spend: RecommendationInput["spend"]) {
  if (!spend) return null;

  return Object.fromEntries(
    Object.entries(spend)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function aiProviderMode() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY)
  };
}

function buildResolvedAskCacheKey(input: RecommendationInput, context: {
  answerKind: AskIntent;
  intent: ReturnType<typeof parseQueryIntent>;
  mentionedCardId: string | null;
  questionType: ReturnType<typeof parseSpecificCardQuestion>["questionType"];
  rewardsPolicySubject: string | null;
  requestSplit: boolean;
}) {
  return askCacheKey({
    version: "ask-v1",
    aiProviderMode: aiProviderMode(),
    answerKind: context.answerKind,
    mentionedCardId: context.mentionedCardId,
    questionType: context.questionType,
    rewardsPolicySubject: context.rewardsPolicySubject,
    requestedTopCardCount: requestedTopCardCount(input.query, input.resultStrategy),
    requestSplit: context.requestSplit,
    intent: {
      useCases: sortedValues(context.intent.useCases),
      segments: sortedValues(context.intent.segments),
      redemptionBuckets: sortedValues(context.intent.redemptionBuckets),
      issuers: sortedValues(context.intent.issuers),
      networks: sortedValues(context.intent.networks),
      tags: sortedValues(context.intent.tags),
      maxAnnualFee: context.intent.maxAnnualFee ?? null,
      inferredSpend: normalizedSpend(context.intent.inferredSpend),
      wantsLounge: context.intent.wantsLounge,
      wantsLifetimeFree: context.intent.wantsLifetimeFree,
      wantsGuestLounge: context.intent.wantsGuestLounge,
      needsLatestInfo: context.intent.needsLatestInfo
    },
    inputControls: {
      maxAnnualFee: input.maxAnnualFee ?? null,
      wantsLounge: input.wantsLounge ?? null,
      wantsLifetimeFree: input.wantsLifetimeFree ?? null,
      spend: normalizedSpend(input.spend),
      rankingStrategy: input.rankingStrategy ?? null,
      resultStrategy: input.resultStrategy ?? null
    }
  });
}

function isCacheableAskAnswer(input: RecommendationInput, result: AskAiResult) {
  if (input.previousQuery || input.contextCardIds?.length) return false;
  if (result.needsDatabaseUpdate || result.meta?.intent === "unsupported") return false;
  if (!result.cards.length) return false;
  return true;
}

function setAskCacheStatus(result: AskAiResult, status: AskCacheStatus): AskAiResult {
  Object.defineProperty(result, askCacheStatusSymbol, {
    value: status,
    enumerable: false,
    configurable: true
  });
  return result;
}

function finalizeAskAnswer(input: RecommendationInput, cacheKey: string | null, result: AskAiResult): AskAiResult {
  if (!cacheKey || !isCacheableAskAnswer(input, result)) {
    return setAskCacheStatus(result, "SKIP");
  }

  setAskCache(cacheKey, result);
  return setAskCacheStatus(result, "MISS");
}

export function getAskResultCacheStatus(result: AskAiResult): AskCacheStatus | undefined {
  return (result as AskAiResultWithCacheStatus)[askCacheStatusSymbol];
}

export async function answerQuestion(input: RecommendationInput): Promise<AskAiResult> {
  const aiTraces: Array<{ purpose: string; trace: AiCallTrace }> = [];
  const unsupportedReason = getUnsupportedQuestionReason(input);

  if (unsupportedReason) {
    await logUnsupportedQuestion(input, unsupportedReason);

    return {
      summary:
        "I am not using live web search here. I logged this question for a database update so the next answer can come from our verified card dataset.",
      cards: [],
      needsDatabaseUpdate: true,
      unsupportedReason,
      meta: buildAskMeta("unsupported", { needsFollowUp: true })
    };
  }

  const rawScoredCards = scoreCards(input);
  const contextSourceCards = buildContextSourceCards(input, rawScoredCards);
  const scoredCards = boostContextCards(rawScoredCards, input, contextSourceCards);
  let shortlisted = shortlistCardsForQuestion(input, scoredCards);
  const hasFollowUpContext = Boolean(input.previousQuery || input.contextCardIds?.length);
  const exactMentionedCardId = findExactCardNameOrIdMatch(input.query);
  const specificCardLookup = (!hasFollowUpContext || Boolean(exactMentionedCardId)) && isSpecificCardLookup(input);
  const cardFamilyLookup = specificCardLookup ? buildCardFamilyLookupResult(input, scoredCards) : null;
  const parsedCardQuestion = parseSpecificCardQuestion(input.query);

  if (shouldTryAiCardResolution(input, shortlisted.mentionedCardId)) {
    const aiMentionedCardId = await resolveMentionedCardIdWithAi(input.query, aiTraces);
    if (aiMentionedCardId) {
      shortlisted = buildShortlistFromMentionedCard(scoredCards, aiMentionedCardId);
    }
  }

  const namedCardQuestion =
    isNamedCardQuestion(input, shortlisted.mentionedCardId) ||
    (Boolean(shortlisted.mentionedCardId) && parsedCardQuestion.questionType !== "generic" && !isTopBestCardsQuery(input.query));

  const topBestQuery = isTopBestCardsQuery(input.query);
  const intent = parseQueryIntent(input);
  const isMultipleResultsQuery = !shortlisted.mentionedCardId && !specificCardLookup && !namedCardQuestion && !cardFamilyLookup;
  const isRankingQuery = topBestQuery || isMultipleResultsQuery;
  const scenarioWinnerCards =
    isRankingQuery && !input.spend && !intent.inferredSpend
      ? getBalancedScenarioWinnerCards(input, shortlisted.cards)
      : [];
  let requestSplit = false;
  if (SPLIT_SCOPE === "any-query") {
    requestSplit = isRankingQuery;
  } else if (SPLIT_SCOPE === "broad-only") {
    requestSplit = isBroadGenericRankingQuery(input, intent);
  }
  const inputForAnswer = requestSplit
    ? { ...input, resultStrategy: "reward-type-split" as const }
    : input;
  const baseAnswer = answerFromCards(inputForAnswer);
  const answer = {
    ...baseAnswer,
    cards: isRankingQuery
      ? boostContextCards(baseAnswer.cards, input, scoredCards)
      : buildDisplayCards(
          scoredCards,
          shortlisted.mentionedCardId ?? shortlisted.cards[0]?.card.id ?? null,
          scenarioWinnerCards,
          { includeFallback: !(specificCardLookup || namedCardQuestion) }
        )
  };
  const topCard = answer.cards[0];
  const rewardsPolicySubject = extractRewardsPolicySubject(input.query);
  const genericScenarioHighlights = buildScenarioHighlights(input, answer.cards, {
    skip: specificCardLookup || namedCardQuestion
  });
  const resolvedCacheKey = (answerKind: AskIntent) =>
    buildResolvedAskCacheKey(input, {
      answerKind,
      intent,
      mentionedCardId: shortlisted.mentionedCardId,
      questionType: parsedCardQuestion.questionType,
      rewardsPolicySubject,
      requestSplit
    });

  const readResolvedCache = (answerKind: AskIntent) => {
    if (hasFollowUpContext) return null;
    const key = resolvedCacheKey(answerKind);
    const cached = getAskCache(key);
    return cached ? setAskCacheStatus(cached, "HIT") : null;
  };

  if (!topCard) {
    const reason = "No matching cards found in the current database for this question and filters";
    await logUnsupportedQuestion(input, reason);

    return {
      ...answer,
      highlights: [],
      needsDatabaseUpdate: true,
      unsupportedReason: reason,
      meta: buildAskMeta("unsupported", { needsFollowUp: true })
    };
  }

  if (cardFamilyLookup) {
    const cacheKey = resolvedCacheKey("card-family");
    const cached = getAskCache(cacheKey);
    if (cached) return setAskCacheStatus(cached, "HIT");

    return finalizeAskAnswer(input, cacheKey, {
      ...answer,
      summary: cardFamilyLookup.summary,
      cards: cardFamilyLookup.cards,
      highlights: cardFamilyLookup.highlights,
      displayMode: cardFamilyLookup.displayMode,
      meta: buildAskMeta("card-family", { topFit: cardFamilyLookup.cards[0]?.fitScore })
    });
  }

  if (namedCardQuestion && shortlisted.mentionedCardId && topCard.card.id !== shortlisted.mentionedCardId) {
    const reason = "Named card was not available under the current filters";
    await logUnsupportedQuestion(input, reason);

    return {
      summary:
        "I found a likely match, but it does not fit the current filters or available dataset well enough to answer confidently.",
      cards: [],
      highlights: [],
      needsDatabaseUpdate: true,
      unsupportedReason: reason,
      meta: buildAskMeta("unsupported")
    };
  }

  if (specificCardLookup && !namedCardQuestion && !topCardMatchesSpecificLookup(input, topCard)) {
    const aiFallback = await tryAiDatabaseFallback(input, scoredCards, aiTraces);
    if (aiFallback) {
      return {
        ...aiFallback,
        meta: {
          ...buildAskMeta("best-fit", {
            topFit: aiFallback.cards[0]?.fitScore,
            runnerUpFit: aiFallback.cards[1]?.fitScore
          }),
          ai: summarizeAiTraces(aiTraces)
        }
      };
    }

    const reason = "Specific card lookup is not covered in the current database yet";
    await logUnsupportedQuestion(input, reason);

    return {
      summary: "",
      cards: [],
      highlights: [],
      needsDatabaseUpdate: true,
      unsupportedReason: reason,
      meta: {
        ...buildAskMeta("unsupported", { needsFollowUp: true }),
        ai: summarizeAiTraces(aiTraces)
      }
    };
  }

  if (specificCardLookup || namedCardQuestion) {
    const specificAnswer = buildSpecificQuestionAnswer(input, topCard);
    if (specificAnswer) {
      const cacheKey = resolvedCacheKey("card-detail");
      const cached = getAskCache(cacheKey);
      if (cached) return setAskCacheStatus(cached, "HIT");

      return finalizeAskAnswer(input, cacheKey, {
        ...answer,
        summary: specificAnswer.summary,
        highlights: specificAnswer.highlights,
        meta: buildAskMeta("card-detail", { topFit: topCard.fitScore })
      });
    }

    if (rewardsPolicySubject && !cardMentionsPolicySubject(topCard, rewardsPolicySubject)) {
      const reason = `Specific rewards-policy query is not covered in the current database yet: ${rewardsPolicySubject}`;
      await logUnsupportedQuestion(input, reason);

      return {
        summary: buildUnsupportedPolicySummary(input, topCard, rewardsPolicySubject),
        cards: [],
        highlights: [],
        needsDatabaseUpdate: true,
        unsupportedReason: reason,
        meta: {
          ...buildAskMeta("unsupported", { needsFollowUp: true }),
          ai: summarizeAiTraces(aiTraces)
        }
      };
    }
  }

  if (isRankingQuery) {
    const cached = readResolvedCache("top-cards");
    if (cached) return cached;

    const topCardsSummary = await generateTopCardsSummary(input, answer.cards, aiTraces);
    return finalizeAskAnswer(input, resolvedCacheKey("top-cards"), {
      ...answer,
      summary: topCardsSummary ?? buildFallbackSummary(inputForAnswer, answer.cards),
      highlights: buildTopCardsHighlights(input, answer.cards),
      meta: {
        ...buildAskMeta("top-cards", {
          topFit: topCard.fitScore,
          runnerUpFit: answer.cards[1]?.fitScore
        }),
        ai: summarizeAiTraces(aiTraces)
      }
    });
  }

  const finalAnswerKind: AskIntent = specificCardLookup || namedCardQuestion ? "specific-card" : "best-fit";
  const cached = readResolvedCache(finalAnswerKind);
  if (cached) return cached;

  const generatedSummary = await generateGroundedSummary(input, answer.cards, aiTraces);

  if (generatedSummary) {
    const curatedAlternativeNames = getAlternativeNames(topCard, answer.cards);

    const fallbackAlternativeNames = answer.cards
      .slice(1, 3)
      .map((item) => item.card.name)
      .filter((name) => name !== topCard.card.name);

    return finalizeAskAnswer(input, resolvedCacheKey(finalAnswerKind), {
      ...answer,
      summary: generatedSummary,
      highlights: buildBestFitHighlights(
        topCard,
        curatedAlternativeNames.length > 0 ? curatedAlternativeNames : fallbackAlternativeNames,
        genericScenarioHighlights
      ),
      meta: {
        ...buildAskMeta(specificCardLookup || namedCardQuestion ? "specific-card" : "best-fit", {
          topFit: topCard.fitScore,
          runnerUpFit: answer.cards[1]?.fitScore
        }),
        ai: summarizeAiTraces(aiTraces)
      }
    });
  }

  const curatedAlternativeNames = getAlternativeNames(topCard, answer.cards);

  const fallbackAlternativeNames = answer.cards
    .slice(1, 3)
    .map((item) => item.card.name)
    .filter((name) => name !== topCard.card.name);

  return finalizeAskAnswer(input, resolvedCacheKey(finalAnswerKind), {
    ...answer,
    summary: buildFallbackSummary(inputForAnswer, answer.cards),
    highlights: buildBestFitHighlights(
      topCard,
      curatedAlternativeNames.length > 0 ? curatedAlternativeNames : fallbackAlternativeNames,
      genericScenarioHighlights
    ),
    meta: {
      ...buildAskMeta(specificCardLookup || namedCardQuestion ? "specific-card" : "best-fit", { topFit: topCard.fitScore }),
      ai: summarizeAiTraces(aiTraces)
    }
  });
}
