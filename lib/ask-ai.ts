import fs from "node:fs/promises";
import path from "node:path";
import { cards, getCardById } from "./cards";
import { answerFromCards, defaultSpendProfile, requestedTopCardCount, scoreCards } from "./recommend";
import type { CardScore } from "./types";
import type { RecommendationInput } from "./types";
import { unsupportedQuestionLogPath } from "./question-logs";
import type { UnsupportedQuestionLogEntry } from "./question-logs";
import { parseQueryIntent } from "./query-intent";
import { callAiWithSchema } from "./ai-provider";
import { getTotalLoungeAccess } from "./lounge";

export type AskAiResult = ReturnType<typeof answerFromCards> & {
  highlights?: string[];
  needsDatabaseUpdate?: boolean;
  unsupportedReason?: string;
};

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

function normalizeQuery(query?: string) {
  return query?.toLowerCase().trim() ?? "";
}

function normalizeCompact(value?: string) {
  return normalizeForMatch(value).replace(/\s+/g, "");
}

function normalizeForMatch(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatRupees(value: number) {
  return `Rs ${value.toLocaleString("en-IN")}`;
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

function buildFallbackHighlights(topCard: CardScore, alternativeNames: string[]) {
  const highlights = [
    ...buildImportantFeatures(topCard),
    alternativeNames.length > 0
      ? `${alternativeNames.length === 1 ? "Closest alternative" : "Closest alternatives"}: ${joinNatural(alternativeNames)}.`
      : ""
  ].filter(Boolean);

  return highlights;
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
  return `Rs ${formatAnnualSpendLabel(value)}`;
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

  const groupedEntries = [...groupedByWinner.values()].map(({ cardName, labels }) => {
    const labelText = labels.length === 1 ? labels[0] : joinNatural(labels);
    return `around ${labelText}, ${cardName}`;
  });

  return [`By yearly spend on a balanced mix: ${groupedEntries.join("; ")}.`];
}

function buildTopCardsHighlights(input: RecommendationInput, answerCards: CardScore[]) {
  const envelopeCards = answerCards.filter((score) => score.envelopeScoring).slice(0, 3);
  const envelopeHighlights =
    envelopeCards.length > 0
      ? [
          "Since no monthly spend was mentioned, each card is ranked at its strongest spend level.",
          ...envelopeCards.map((score) => `${score.card.name}: best at ${score.envelopeScoring?.bestSpendLabel}.`)
        ]
      : [];

  return [...envelopeHighlights, ...buildScenarioHighlights(input, answerCards)];
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

  if (smartbuyWinner && smartbuyWinner.card.id !== topCardId && answerCardIds.has(smartbuyWinner.card.id)) {
    scenarioHighlights.push(`If you lean more on SmartBuy-style and partner-brand spending, ${smartbuyWinner.card.name} gets stronger.`);
  }

  if (travelWinner && travelWinner.card.id !== topCardId && answerCardIds.has(travelWinner.card.id)) {
    scenarioHighlights.push(`If your spending is more travel-heavy, ${travelWinner.card.name} gets stronger.`);
  }

  const cardsToInspect = [
    ...answerCards,
    ...(smartbuyWinner ? [smartbuyWinner] : []),
    ...(travelWinner ? [travelWinner] : [])
  ];

  const seenThresholdCards = new Set<string>();
  for (const score of cardsToInspect) {
    if (!score?.card.feeWaiverSpend || seenThresholdCards.has(score.card.id)) continue;
    if (score.card.feeWaiverSpend < 500000 || score.card.feeWaiverSpend > 1500000) continue;

    seenThresholdCards.add(score.card.id);
    scenarioHighlights.push(
      `${score.card.name}: fee waiver kicks in at ${formatWaiverRupees(score.card.feeWaiverSpend)}/year spend, making it even better for high spenders.`
    );
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

function buildFallbackSummary(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const topCard = shortlistedCards[0];
  if (!topCard) {
    return "I could not find a good match for that question.";
  }

  if (isTopBestCardsQuery(input.query) && shortlistedCards.length > 1) {
    const requestedCount = requestedTopCardCount(input.query);
    const topThreeText = shortlistedCards.length >= requestedCount ? `Top ${requestedCount} picks` : "Top picks";

    return `${topThreeText} for this query.`;
  }

  const lowerQuery = normalizeQuery(input.query);
  const compactQuery = normalizeCompact(input.query);
  const compactName = normalizeCompact(topCard.card.name);
  const exactNameAsked =
    (compactQuery.length > 0 && compactName.includes(compactQuery)) ||
    (lowerQuery.length > 0 &&
      (normalizeQuery(topCard.card.name).includes(lowerQuery) ||
        lowerQuery.split(/\s+/).every((token) => token.length > 2 && normalizeQuery(topCard.card.name).includes(token))));

  const fitReasons = topCard.reasons
    .filter((reason) => !reason.startsWith("Strong card-name match") && !reason.startsWith("Matches "))
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

  const whyItFits =
    fitReasons.length > 0 ? `It stands out because ${joinNatural(fitReasons).toLowerCase()}.` : "";

  return [opener, whyItFits].filter(Boolean).join(" ");
}

function getMeaningfulQueryTokens(query?: string) {
  return normalizeForMatch(query)
    .split(" ")
    .filter((token) => token.length > 1 && !genericLookupWords.has(token));
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

  let bestMatch: { id: string; score: number; matchedCardTokens: number; exactMatch: boolean } | null = null;

  for (const card of cards) {
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

function shortlistCardsForQuestion(input: RecommendationInput) {
  const scoredCards = scoreCards(input);
  const mentionedCardId = findMentionedCardId(input.query);

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
  const rewardTypeLower = cardScore.card.rewardType.toLowerCase();
  if (rewardTypeLower.includes("point") || rewardTypeLower.includes("mile")) {
    return `${rate} ${cardScore.card.rewardType} per Rs 100`;
  }

  return `${rate}%`;
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
          ? `SmartBuy travel value: Rs ${topCard.card.redemption.smartBuyFlightHotelValue} per point.`
          : "",
        typeof topCard.card.redemption.airMilesValue === "number"
          ? `Air miles value: ${topCard.card.redemption.airMilesValue} per point.`
          : "",
        typeof topCard.card.redemption.statementBalanceValue === "number"
          ? `Statement credit value: Rs ${topCard.card.redemption.statementBalanceValue} per point.`
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

function buildDisplayCards(scoredCards: CardScore[], preferredCardId?: string | null, importantCards: CardScore[] = []) {
  const primaryCard =
    (preferredCardId ? scoredCards.find((item) => item.card.id === preferredCardId) : undefined) ?? scoredCards[0];

  if (!primaryCard) return [];

  const curatedAlternatives = (primaryCard.card.alternativeCardIds ?? [])
    .flatMap((cardId) => {
      const item = scoredCards.find((entry) => entry.card.id === cardId);
      return item && item.card.id !== primaryCard.card.id ? [item] : [];
    });

  const fallbackCards = scoredCards.filter(
    (item) => item.card.id !== primaryCard.card.id && !curatedAlternatives.some((alternative) => alternative.card.id === item.card.id)
  );

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
      `Available matches: ${joinNatural(familyCards.map((item) => item.card.name))}.`,
      "Open a specific card if you want exact rewards, lounge, forex, or exclusion details."
    ]
  };
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
        estimatedAnnualRewards: item.estimatedAnnualRewards,
        estimatedAnnualFee: item.estimatedAnnualFee,
        estimatedNetValue: item.estimatedNetValue
      };
    }
    return base;
  });

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

async function generateGroundedSummary(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const result = await callAiWithSchema<{ summary: string }>({
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

  return typeof result?.summary === "string" && result.summary.trim() ? result.summary.trim() : null;
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
    estimatedAnnualRewards: item.estimatedAnnualRewards,
    estimatedMilestoneValue: item.estimatedMilestoneValue,
    estimatedAnnualFee: item.estimatedAnnualFee,
    estimatedNetValue: item.estimatedNetValue,
    reasons: item.reasons.slice(0, 5),
    sourceUrl: item.card.sourceUrl
  }));

  return JSON.stringify(
    {
      userQuestion: input.query ?? "",
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

async function generateTopCardsSummary(input: RecommendationInput, shortlistedCards: CardScore[]) {
  const result = await callAiWithSchema<{ summary: string }>({
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

  return typeof result?.summary === "string" && result.summary.trim() ? result.summary.trim() : null;
}

async function tryAiDatabaseFallback(input: RecommendationInput, scoredCards: CardScore[]) {
  if (isTopBestCardsQuery(input.query)) return null;

  const fallbackCards = scoredCards.slice(0, 3);
  if (fallbackCards.length === 0) return null;

  const generatedSummary = await generateGroundedSummary(input, fallbackCards);
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

async function resolveMentionedCardIdWithAi(query?: string) {
  if (!query?.trim()) return null;

  const result = await callAiWithSchema<{ cardId: string | null }>({
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

  if (process.env.DEBUG_AI === "1") {
    console.warn("[ask-ai] card resolution result", {
      query,
      resolvedCardId: result?.cardId ?? null
    });
  }

  if (!result?.cardId) return null;
  return getCardById(result.cardId) ? result.cardId : null;
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

  let shortlisted = shortlistCardsForQuestion(input);
  const scoredCards = scoreCards(input);
  const specificCardLookup = isSpecificCardLookup(input);
  const cardFamilyLookup = specificCardLookup ? buildCardFamilyLookupResult(input, scoredCards) : null;
  const parsedCardQuestion = parseSpecificCardQuestion(input.query);
  const namedCardQuestionInitial =
    isNamedCardQuestion(input, shortlisted.mentionedCardId) ||
    (Boolean(shortlisted.mentionedCardId) && parsedCardQuestion.questionType !== "generic" && !isTopBestCardsQuery(input.query));

  if (shouldTryAiCardResolution(input, shortlisted.mentionedCardId)) {
    const aiMentionedCardId = await resolveMentionedCardIdWithAi(input.query);
    if (aiMentionedCardId) {
      shortlisted = buildShortlistFromMentionedCard(scoredCards, aiMentionedCardId);
    }
  }

  const topBestQuery = isTopBestCardsQuery(input.query);
  const scenarioWinnerCards =
    topBestQuery && !input.spend && !parseQueryIntent(input).inferredSpend
      ? getBalancedScenarioWinnerCards(input, shortlisted.cards)
      : [];
  const baseAnswer = answerFromCards(input);
  const answer = {
    ...baseAnswer,
    cards: topBestQuery
      ? baseAnswer.cards
      : buildDisplayCards(
          scoredCards,
          shortlisted.mentionedCardId ?? shortlisted.cards[0]?.card.id ?? null,
          scenarioWinnerCards
        )
  };
  const topCard = answer.cards[0];
  const namedCardQuestion =
    isNamedCardQuestion(input, shortlisted.mentionedCardId) ||
    (Boolean(shortlisted.mentionedCardId) && parsedCardQuestion.questionType !== "generic" && !isTopBestCardsQuery(input.query));
  const rewardsPolicySubject = extractRewardsPolicySubject(input.query);
  const genericScenarioHighlights = buildScenarioHighlights(input, answer.cards, {
    skip: specificCardLookup || namedCardQuestion
  });

  if (!topCard) {
    const reason = "No matching cards found in the current database for this question and filters";
    await logUnsupportedQuestion(input, reason);

    return {
      ...answer,
      highlights: [],
      needsDatabaseUpdate: true,
      unsupportedReason: reason
    };
  }

  if (cardFamilyLookup) {
    return {
      ...answer,
      summary: cardFamilyLookup.summary,
      cards: cardFamilyLookup.cards,
      highlights: cardFamilyLookup.highlights
    };
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
      unsupportedReason: reason
    };
  }

  if (specificCardLookup && !namedCardQuestion && !topCardMatchesSpecificLookup(input, topCard)) {
    const aiFallback = await tryAiDatabaseFallback(input, scoredCards);
    if (aiFallback) {
      return aiFallback;
    }

    const reason = "Specific card lookup is not covered in the current database yet";
    await logUnsupportedQuestion(input, reason);

    return {
      summary:
        "I couldn't find an exact match for your query.",
      cards: [],
      highlights: [],
      needsDatabaseUpdate: true,
      unsupportedReason: reason
    };
  }

  if (specificCardLookup || namedCardQuestion) {
    const specificAnswer = buildSpecificQuestionAnswer(input, topCard);
    if (specificAnswer) {
      return {
        ...answer,
        summary: specificAnswer.summary,
        highlights: specificAnswer.highlights
      };
    }

    if (rewardsPolicySubject && !cardMentionsPolicySubject(topCard, rewardsPolicySubject)) {
      const reason = `Specific rewards-policy query is not covered in the current database yet: ${rewardsPolicySubject}`;
      await logUnsupportedQuestion(input, reason);

      return {
        summary: buildUnsupportedPolicySummary(input, topCard, rewardsPolicySubject),
        cards: [],
        highlights: [],
        needsDatabaseUpdate: true,
        unsupportedReason: reason
      };
    }
  }

  const generatedSummary = isTopBestCardsQuery(input.query) ? null : await generateGroundedSummary(input, answer.cards);

  if (topBestQuery) {
    const topCardsSummary = await generateTopCardsSummary(input, answer.cards);
    return {
      ...answer,
      summary: topCardsSummary ?? buildFallbackSummary(input, answer.cards),
      highlights: buildTopCardsHighlights(input, answer.cards)
    };
  }

  if (generatedSummary) {
    const curatedAlternativeNames = getAlternativeNames(topCard, answer.cards);

    const fallbackAlternativeNames = answer.cards
      .slice(1, 3)
      .map((item) => item.card.name)
      .filter((name) => name !== topCard.card.name);

    return {
      ...answer,
      summary: generatedSummary,
      highlights: [
        ...buildFallbackHighlights(topCard, curatedAlternativeNames.length > 0 ? curatedAlternativeNames : fallbackAlternativeNames),
        ...genericScenarioHighlights
      ]
    };
  }

  const curatedAlternativeNames = getAlternativeNames(topCard, answer.cards);

  const fallbackAlternativeNames = answer.cards
    .slice(1, 3)
    .map((item) => item.card.name)
    .filter((name) => name !== topCard.card.name);

  return {
    ...answer,
    summary: buildFallbackSummary(input, answer.cards),
    highlights: [
      ...buildFallbackHighlights(topCard, curatedAlternativeNames.length > 0 ? curatedAlternativeNames : fallbackAlternativeNames),
      ...genericScenarioHighlights
    ]
  };
}
