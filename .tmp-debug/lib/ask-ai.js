"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnsupportedQuestionReason = getUnsupportedQuestionReason;
exports.logUnsupportedQuestion = logUnsupportedQuestion;
exports.answerQuestion = answerQuestion;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const cards_1 = require("./cards");
const recommend_1 = require("./recommend");
const question_logs_1 = require("./question-logs");
const query_intent_1 = require("./query-intent");
const defaultAskModel = (_a = process.env.OPENAI_ASK_MODEL) !== null && _a !== void 0 ? _a : "gpt-5-mini";
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
    "rewards"
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
function normalizeQuery(query) {
    var _a;
    return (_a = query === null || query === void 0 ? void 0 : query.toLowerCase().trim()) !== null && _a !== void 0 ? _a : "";
}
function normalizeCompact(value) {
    return normalizeForMatch(value).replace(/\s+/g, "");
}
function normalizeForMatch(value = "") {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function formatRupees(value) {
    return `Rs ${value.toLocaleString("en-IN")}`;
}
function joinNatural(parts) {
    if (parts.length === 0)
        return "";
    if (parts.length === 1)
        return parts[0];
    if (parts.length === 2)
        return `${parts[0]} and ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}
function buildImportantFeatures(cardScore) {
    const { card } = cardScore;
    const features = [];
    if (card.bestFor.length > 0) {
        features.push(`Built for ${joinNatural(card.bestFor.slice(0, 3))}`);
    }
    if (card.rewardType) {
        features.push(`Earns ${card.rewardType}`);
    }
    if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") {
        features.push("Unlimited domestic and international lounge access");
    }
    else {
        const loungeParts = [
            card.loungeDomestic > 0 ? `${card.loungeDomestic} domestic lounge visits` : "",
            card.loungeInternational > 0 ? `${card.loungeInternational} international lounge visits` : ""
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
function buildFallbackHighlights(topCard, alternativeNames) {
    const highlights = [
        ...buildImportantFeatures(topCard),
        alternativeNames.length > 0
            ? `${alternativeNames.length === 1 ? "Closest alternative" : "Closest alternatives"}: ${joinNatural(alternativeNames)}.`
            : ""
    ].filter(Boolean);
    return highlights;
}
function monthlySpendTotal(spend) {
    return Object.values(spend !== null && spend !== void 0 ? spend : {}).reduce((total, amount) => total + (amount !== null && amount !== void 0 ? amount : 0), 0);
}
function scaleSpendProfileToAnnual(baseSpend, annualTarget) {
    const monthlyTarget = annualTarget / 12;
    const baseMonthly = monthlySpendTotal(baseSpend);
    const factor = baseMonthly > 0 ? monthlyTarget / baseMonthly : 1;
    return Object.fromEntries(Object.entries(baseSpend).map(([category, amount]) => [category, Math.round((amount !== null && amount !== void 0 ? amount : 0) * factor)]));
}
function formatAnnualSpendLabel(annualTarget, suffixPlus = false) {
    const lakhValue = annualTarget / 100000;
    const formattedLakh = Number.isInteger(lakhValue) ? `${lakhValue}` : lakhValue.toFixed(1);
    return `${formattedLakh}L${suffixPlus ? "+" : ""}`;
}
function determineScenarioTargets(input, answerCards) {
    const intent = (0, query_intent_1.parseQueryIntent)(input);
    const candidateCards = answerCards.map((item) => item.card);
    const isLtfComparison = intent.segments.includes("ltf") ||
        (candidateCards.length > 0 && candidateCards.every((card) => card.annualFee === 0));
    const isSuperPremiumComparison = intent.segments.includes("super-premium") ||
        candidateCards.some((card) => card.annualFee >= 10000 ||
            card.bestFor.some((item) => normalizeForMatch(item).includes("super premium")) ||
            card.bestFor.some((item) => normalizeForMatch(item).includes("invite only")) ||
            card.tags.some((item) => normalizeForMatch(item).includes("super premium")));
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
function pickScenarioWinner(input, spend) {
    var _a;
    return (_a = (0, recommend_1.scoreCards)(Object.assign(Object.assign({}, input), { spend }))[0]) !== null && _a !== void 0 ? _a : null;
}
function buildBalancedScenarioHighlights(input, answerCards) {
    const scenarioResults = determineScenarioTargets(input, answerCards).flatMap(({ annualTarget, label }) => {
        const winner = pickScenarioWinner(input, scaleSpendProfileToAnnual(recommend_1.defaultSpendProfile, annualTarget));
        return winner ? [{ label, winner }] : [];
    });
    const winnerIds = new Set(scenarioResults.map((result) => result.winner.card.id));
    if (winnerIds.size <= 1)
        return [];
    const groupedByWinner = new Map();
    for (const result of scenarioResults) {
        const existing = groupedByWinner.get(result.winner.card.id);
        if (existing) {
            existing.labels.push(result.label);
        }
        else {
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
function buildTopCardsHighlights(input, answerCards) {
    return [];
}
function getBalancedScenarioWinnerCards(input, answerCards) {
    const scenarioResults = determineScenarioTargets(input, answerCards).flatMap(({ annualTarget }) => {
        const winner = pickScenarioWinner(input, scaleSpendProfileToAnnual(recommend_1.defaultSpendProfile, annualTarget));
        return winner ? [winner] : [];
    });
    const winnerIds = new Set(scenarioResults.map((result) => result.card.id));
    if (winnerIds.size <= 1)
        return [];
    const winners = [];
    for (const result of scenarioResults) {
        if (winners.some((item) => item.card.id === result.card.id))
            continue;
        winners.push(result);
    }
    return winners;
}
function buildScenarioHighlights(input, answerCards, options) {
    var _a;
    if (options === null || options === void 0 ? void 0 : options.skip)
        return [];
    const intent = (0, query_intent_1.parseQueryIntent)(input);
    const hasSpendContext = Boolean(input.spend) || Boolean(intent.inferredSpend);
    if (hasSpendContext)
        return [];
    const balancedHighlights = buildBalancedScenarioHighlights(input, answerCards);
    const smartbuyHeavySpend = {
        online: 32000,
        travel: 10000,
        dining: 5000,
        offline: 6000,
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
        offline: 6000,
        grocery: 3000,
        fuel: 0,
        amazon: 0,
        upi: 0,
        utilities: 3000
    };
    const smartbuyWinner = pickScenarioWinner(input, smartbuyHeavySpend);
    const travelWinner = pickScenarioWinner(input, travelHeavySpend);
    const scenarioHighlights = [...balancedHighlights];
    const topCardId = (_a = answerCards[0]) === null || _a === void 0 ? void 0 : _a.card.id;
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
    const seenThresholdCards = new Set();
    for (const score of cardsToInspect) {
        if (!(score === null || score === void 0 ? void 0 : score.card.feeWaiverSpend) || seenThresholdCards.has(score.card.id))
            continue;
        if (score.card.feeWaiverSpend < 500000 || score.card.feeWaiverSpend > 1500000)
            continue;
        seenThresholdCards.add(score.card.id);
        scenarioHighlights.push(`${score.card.name} gets another lift closer to ${formatRupees(score.card.feeWaiverSpend)} yearly spend, where its fee waiver can start to matter.`);
    }
    return [...new Set(scenarioHighlights)];
}
function containsAny(text, values) {
    return values.some((value) => text.includes(value));
}
function getAlternativeNames(cardScore, shortlistedCards) {
    var _a;
    return ((_a = cardScore.card.alternativeCardIds) !== null && _a !== void 0 ? _a : [])
        .map((cardId) => { var _a, _b, _c, _d; return (_d = (_b = (_a = shortlistedCards === null || shortlistedCards === void 0 ? void 0 : shortlistedCards.find((item) => item.card.id === cardId)) === null || _a === void 0 ? void 0 : _a.card.name) !== null && _b !== void 0 ? _b : (_c = (0, cards_1.getCardById)(cardId)) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null; })
        .filter((name) => Boolean(name) && name !== cardScore.card.name);
}
function isTopBestCardsQuery(query) {
    const normalized = normalizeForMatch(query);
    if (!normalized)
        return false;
    return /\b(top|best|recommend|recommended|suggest)\b/.test(normalized) && /\bcards?\b/.test(normalized);
}
function buildFallbackSummary(input, shortlistedCards) {
    const topCard = shortlistedCards[0];
    if (!topCard) {
        return "I could not find a good match for that question.";
    }
    if (isTopBestCardsQuery(input.query) && shortlistedCards.length > 1) {
        const topThreeText = shortlistedCards.length >= 3 ? "Top 3 picks" : "Top picks";
        return `${topThreeText} for this query.`;
    }
    const lowerQuery = normalizeQuery(input.query);
    const compactQuery = normalizeCompact(input.query);
    const compactName = normalizeCompact(topCard.card.name);
    const exactNameAsked = (compactQuery.length > 0 && compactName.includes(compactQuery)) ||
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
    const whyItFits = fitReasons.length > 0 ? `It stands out because ${joinNatural(fitReasons).toLowerCase()}.` : "";
    return [opener, whyItFits].filter(Boolean).join(" ");
}
function getMeaningfulQueryTokens(query) {
    return normalizeForMatch(query)
        .split(" ")
        .filter((token) => token.length > 1 && !genericLookupWords.has(token));
}
function getMeaningfulCardTokens(card) {
    const issuerTokens = new Set(normalizeForMatch(card.issuer).split(" ").filter(Boolean));
    return normalizeForMatch(`${card.name} ${card.id.replace(/-/g, " ")}`)
        .split(" ")
        .filter((token) => token.length > 2 &&
        !genericLookupWords.has(token) &&
        !genericCardNameWords.has(token) &&
        !issuerTokens.has(token));
}
function findMentionedCardId(query) {
    const normalizedQuery = normalizeForMatch(query);
    const compactQuery = normalizeCompact(query);
    const queryTokens = getMeaningfulQueryTokens(query);
    if (!normalizedQuery || queryTokens.length === 0)
        return null;
    let bestMatch = null;
    for (const card of cards_1.cards) {
        const nameText = normalizeForMatch(card.name);
        const idText = normalizeForMatch(card.id.replace(/-/g, " "));
        const compactName = normalizeCompact(card.name);
        const compactId = normalizeCompact(card.id.replace(/-/g, " "));
        const compactTags = card.tags.map((tag) => normalizeCompact(tag)).filter(Boolean);
        const searchTokens = new Set(normalizeForMatch(`${card.issuer} ${card.name} ${card.id.replace(/-/g, " ")}`).split(" ").filter(Boolean));
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
            if (cardTokens.includes(token))
                score += 35;
            else if (searchTokens.has(token))
                score += 8;
        }
        const matchedCardTokens = cardTokens.filter((token) => queryTokens.includes(token)).length;
        if (matchedCardTokens > 0 && matchedCardTokens === cardTokens.length) {
            score += 90;
        }
        if (score > 0 &&
            (!bestMatch ||
                score > bestMatch.score ||
                (score === bestMatch.score && matchedCardTokens > bestMatch.matchedCardTokens))) {
            bestMatch = { id: card.id, score, matchedCardTokens, exactMatch };
        }
    }
    if (!bestMatch)
        return null;
    if (bestMatch.exactMatch)
        return bestMatch.id;
    if (bestMatch.matchedCardTokens >= 1 && bestMatch.score >= 35)
        return bestMatch.id;
    if (queryTokens.length === 1 && bestMatch.score >= 35)
        return bestMatch.id;
    return null;
}
function buildShortlistFromMentionedCard(scoredCards, mentionedCardId) {
    if (!mentionedCardId) {
        return {
            cards: scoredCards.slice(0, 3),
            mentionedCardId: null
        };
    }
    const mentionedCard = scoredCards.find((item) => item.card.id === mentionedCardId);
    if (!mentionedCard) {
        return {
            cards: scoredCards.slice(0, 3),
            mentionedCardId
        };
    }
    return {
        cards: [mentionedCard, ...scoredCards.filter((item) => item.card.id !== mentionedCardId).slice(0, 2)],
        mentionedCardId
    };
}
function shortlistCardsForQuestion(input) {
    const scoredCards = (0, recommend_1.scoreCards)(input);
    const mentionedCardId = findMentionedCardId(input.query);
    return buildShortlistFromMentionedCard(scoredCards, mentionedCardId);
}
function isNamedCardQuestion(input, mentionedCardId) {
    if (!mentionedCardId)
        return false;
    const intent = (0, query_intent_1.parseQueryIntent)(input);
    const normalizedQuery = normalizeForMatch(input.query);
    if (/\b(best|top|recommended|recommend)\b/.test(normalizedQuery))
        return false;
    if (intent.useCases.length > 0 || intent.redemptionBuckets.length > 0 || intent.networks.length > 0)
        return false;
    if (input.maxAnnualFee !== undefined || intent.maxAnnualFee !== undefined)
        return false;
    if (input.wantsLounge || input.wantsLifetimeFree)
        return false;
    return true;
}
function isSpecificCardLookup(input) {
    const intent = (0, query_intent_1.parseQueryIntent)(input);
    const normalizedQuery = normalizeForMatch(input.query);
    const meaningfulTokens = getMeaningfulQueryTokens(input.query);
    if (meaningfulTokens.length === 0 || meaningfulTokens.length > 3)
        return false;
    if (intent.useCases.length > 0 || intent.segments.length > 0 || intent.redemptionBuckets.length > 0 || intent.networks.length > 0)
        return false;
    if (intent.tags.some((tag) => tag !== "premium"))
        return false;
    if (/\b(under|below|less than|upto|up to|above|over)\b/.test(normalizedQuery))
        return false;
    if (intent.issuers.length > 0) {
        const issuerTokens = new Set(intent.issuers.flatMap((issuer) => normalizeForMatch(issuer).split(" ").filter((token) => token.length > 1)));
        if (meaningfulTokens.every((token) => issuerTokens.has(token))) {
            return false;
        }
    }
    const queryIsIssuerOnly = cards_1.cards.some((card) => normalizeQuery(card.issuer) === intent.normalizedQuery);
    if (queryIsIssuerOnly)
        return false;
    return true;
}
function shouldTryAiCardResolution(input, mentionedCardId) {
    if (mentionedCardId)
        return false;
    const normalizedQuery = normalizeForMatch(input.query);
    const meaningfulTokens = getMeaningfulQueryTokens(input.query);
    const intent = (0, query_intent_1.parseQueryIntent)(input);
    if (!normalizedQuery || meaningfulTokens.length === 0 || meaningfulTokens.length > 3)
        return false;
    if (/\b(top|best|recommend|recommended|suggest|compare|vs)\b/.test(normalizedQuery))
        return false;
    if (/\b(under|below|less than|upto|up to|above|over)\b/.test(normalizedQuery))
        return false;
    if (input.maxAnnualFee !== undefined || intent.maxAnnualFee !== undefined)
        return false;
    if (input.wantsLounge || input.wantsLifetimeFree)
        return false;
    if (input.spend || intent.inferredSpend)
        return false;
    return true;
}
function topCardMatchesSpecificLookup(input, topCard) {
    const meaningfulTokens = getMeaningfulQueryTokens(input.query);
    if (meaningfulTokens.length === 0)
        return false;
    const nameText = normalizeForMatch(topCard.card.name);
    const idText = normalizeForMatch(topCard.card.id.replace(/-/g, " "));
    return meaningfulTokens.every((token) => nameText.includes(token) || idText.includes(token));
}
function extractRewardsPolicySubject(query) {
    const normalized = normalizeForMatch(query);
    if (!normalized)
        return null;
    const patterns = [
        /rewards?\s+on\s+(.+?)(?:\s+purchase|\s+purchases|\s+spend|\s+spends|\s+transaction|\s+transactions|\s+using|$)/,
        /(?:earn|earning)\s+(?:points|rewards?|miles)\s+(?:on|for)\s+(.+?)(?:\s+purchase|\s+purchases|\s+spend|\s+spends|\s+with|\s+using|$)/,
        /give(?:s)?\s+(?:points|rewards?|miles)\s+(?:on|for)\s+(.+?)(?:\s+purchase|\s+purchases|\s+spend|\s+spends|\s+with|\s+using|$)/
    ];
    const match = patterns.map((pattern) => normalized.match(pattern)).find(Boolean);
    if (!(match === null || match === void 0 ? void 0 : match[1]))
        return null;
    const subject = match[1].trim();
    return subject || null;
}
function extractExclusionSubject(query) {
    const normalized = normalizeForMatch(query);
    if (!normalized)
        return null;
    const patterns = [
        /is\s+(.+?)\s+excluded(?:\s+on|\s+for|\s+with|\s+using|$)/,
        /are\s+(.+?)\s+excluded(?:\s+on|\s+for|\s+with|\s+using|$)/,
        /does\s+.+?\s+exclude\s+(.+?)(?:\s+for|\s+on|\s+with|\s+using|$)/
    ];
    const match = patterns.map((pattern) => normalized.match(pattern)).find(Boolean);
    if (!(match === null || match === void 0 ? void 0 : match[1]))
        return null;
    return match[1].trim() || null;
}
function parseSpecificCardQuestion(query) {
    var _a, _b;
    const normalized = normalizeForMatch(query);
    if (!normalized)
        return { questionType: "generic" };
    if ((normalized.includes("get reward") ||
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
            normalized.includes(" on "))) {
        return {
            questionType: "rewards_eligibility",
            spendSubject: (_a = extractRewardsPolicySubject(query)) !== null && _a !== void 0 ? _a : undefined
        };
    }
    if (normalized.includes("excluded") || normalized.includes("exclude")) {
        return {
            questionType: "exclusion_check",
            spendSubject: (_b = extractExclusionSubject(query)) !== null && _b !== void 0 ? _b : undefined
        };
    }
    if (normalized.includes("lounge"))
        return { questionType: "lounge" };
    if (normalized.includes("fee waiver") || normalized.includes("waive annual fee"))
        return { questionType: "fee_waiver" };
    if (normalized.includes("forex"))
        return { questionType: "forex" };
    if (normalized.includes("milestone"))
        return { questionType: "milestone" };
    if (normalized.includes("redeem") || normalized.includes("redemption"))
        return { questionType: "redemption" };
    if (normalized.includes("eligible") || normalized.includes("eligibility"))
        return { questionType: "eligibility" };
    return { questionType: "generic" };
}
function inferSpendCategory(subject) {
    const normalized = normalizeForMatch(subject);
    if (containsAny(normalized, ["gold", "jewellery", "jewelry", "jewel"]))
        return "offline";
    if (containsAny(normalized, ["rent", "rental", "landlord"]))
        return "rent";
    if (containsAny(normalized, ["fuel", "petrol", "diesel"]))
        return "fuel";
    if (containsAny(normalized, ["grocery", "groceries"]))
        return "grocery";
    if (containsAny(normalized, ["dining", "restaurant", "food", "swiggy", "zomato"]))
        return "dining";
    if (containsAny(normalized, ["flight", "hotel", "travel", "train", "airline"]))
        return "travel";
    if (containsAny(normalized, ["amazon"]))
        return "amazon";
    if (containsAny(normalized, ["upi", "rupay"]))
        return "upi";
    if (containsAny(normalized, ["utility", "electricity", "water", "bill", "recharge"]))
        return "utilities";
    if (containsAny(normalized, ["online", "ecommerce", "shopping"]))
        return "online";
    return null;
}
function getSubjectAliases(subject) {
    const normalized = normalizeForMatch(subject);
    const aliases = new Set(normalized.split(" ").filter((token) => token.length > 1));
    const aliasGroups = [
        { match: ["rent", "rental", "landlord"], aliases: ["rent", "rental", "rental payments", "landlord"] },
        { match: ["wallet", "wallet load", "wallet loads"], aliases: ["wallet", "wallet load", "wallet loads"] },
        { match: ["gold", "jewellery", "jewelry", "jewel"], aliases: ["gold", "jewellery", "jewelry", "jewel"] },
        { match: ["insurance", "premium"], aliases: ["insurance", "premium"] },
        { match: ["government", "govt"], aliases: ["government", "govt"] },
        { match: ["utility", "utilities", "bill", "bills"], aliases: ["utility", "utilities", "bill", "bills", "utility bills"] }
    ];
    for (const group of aliasGroups) {
        if (group.match.some((token) => normalized.includes(token))) {
            for (const alias of group.aliases)
                aliases.add(alias);
        }
    }
    return [...aliases];
}
function subjectMatchesExclusions(exclusions, subject) {
    const exclusionText = normalizeForMatch(exclusions.join(" "));
    return getSubjectAliases(subject).some((alias) => exclusionText.includes(normalizeForMatch(alias)));
}
function rewardRateLabelForAnswer(cardScore, rate) {
    const rewardTypeLower = cardScore.card.rewardType.toLowerCase();
    if (rewardTypeLower.includes("point") || rewardTypeLower.includes("mile")) {
        return `${rate} ${cardScore.card.rewardType} per Rs 100`;
    }
    return `${rate}%`;
}
function buildSpecificQuestionAnswer(input, topCard) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const parsed = parseSpecificCardQuestion(input.query);
    if (parsed.questionType === "generic")
        return null;
    if (parsed.questionType === "rewards_eligibility" && parsed.spendSubject) {
        const subject = parsed.spendSubject;
        const subjectCategory = inferSpendCategory(subject);
        const normalizedSubject = normalizeForMatch(subject);
        const rewardMatch = (_a = topCard.card.rewards.find((reward) => normalizeForMatch(reward.category).includes(normalizedSubject))) !== null && _a !== void 0 ? _a : (subjectCategory
            ? topCard.card.rewards.find((reward) => normalizeForMatch(reward.category).includes(subjectCategory))
            : null);
        if (subjectMatchesExclusions(topCard.card.exclusions, subject)) {
            return {
                summary: `No, ${topCard.card.name} does not appear to earn rewards on ${subject} purchases based on the listed exclusions.`,
                highlights: [
                    `Excluded category match found for ${subject}.`,
                    `Relevant exclusion: ${(_c = (_b = topCard.card.exclusions.find((entry) => subjectMatchesExclusions([entry], subject))) !== null && _b !== void 0 ? _b : topCard.card.exclusions[0]) !== null && _c !== void 0 ? _c : "Issuer exclusions listed for this card."}`
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
                    `Relevant exclusion: ${(_e = (_d = topCard.card.exclusions.find((entry) => subjectMatchesExclusions([entry], subject))) !== null && _d !== void 0 ? _d : topCard.card.exclusions[0]) !== null && _e !== void 0 ? _e : "Issuer exclusions listed for this card."}`
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
            summary: topCard.card.feeWaiverSpend !== null
                ? `${topCard.card.name} lists an annual fee waiver spend target of ${formatRupees(topCard.card.feeWaiverSpend)}.`
                : `${topCard.card.name} does not list a fee-waiver spend target.`,
            highlights: topCard.card.feeWaiverSpend !== null ? [`Fee waiver threshold: ${formatRupees(topCard.card.feeWaiverSpend)}.`] : []
        };
    }
    if (parsed.questionType === "forex") {
        return {
            summary: `${topCard.card.name} lists a forex markup of ${topCard.card.forexMarkup}%.`,
            highlights: topCard.card.forexMarkup <= 2 ? ["This is relatively low for an Indian credit card."] : []
        };
    }
    if (parsed.questionType === "milestone") {
        if ((_f = topCard.card.milestoneBenefits) === null || _f === void 0 ? void 0 : _f.length) {
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
        if (((_h = (_g = topCard.card.eligibility) === null || _g === void 0 ? void 0 : _g.salaried) === null || _h === void 0 ? void 0 : _h.length) || ((_k = (_j = topCard.card.eligibility) === null || _j === void 0 ? void 0 : _j.selfEmployed) === null || _k === void 0 ? void 0 : _k.length)) {
            return {
                summary: `${topCard.card.name} does have eligibility criteria available.`,
                highlights: [...((_m = (_l = topCard.card.eligibility) === null || _l === void 0 ? void 0 : _l.salaried) !== null && _m !== void 0 ? _m : []), ...((_p = (_o = topCard.card.eligibility) === null || _o === void 0 ? void 0 : _o.selfEmployed) !== null && _p !== void 0 ? _p : [])].slice(0, 3)
            };
        }
        return null;
    }
    return null;
}
function cardMentionsPolicySubject(cardScore, subject) {
    var _a, _b, _c, _d;
    const haystack = normalizeForMatch([
        cardScore.card.name,
        cardScore.card.id,
        ...cardScore.card.tags,
        ...cardScore.card.bestFor,
        ...cardScore.card.exclusions,
        ...((_a = cardScore.card.additionalBenefits) !== null && _a !== void 0 ? _a : []),
        ...((_b = cardScore.card.additionalDetails) !== null && _b !== void 0 ? _b : []),
        ...((_c = cardScore.card.internalNotes) !== null && _c !== void 0 ? _c : []),
        ...((_d = cardScore.card.milestoneBenefits) !== null && _d !== void 0 ? _d : []),
        ...cardScore.card.rewards.map((reward) => reward.category)
    ].join(" "));
    return subject
        .split(" ")
        .filter((token) => token.length > 1)
        .every((token) => haystack.includes(token));
}
function buildUnsupportedPolicySummary(input, topCard, subject) {
    if (topCard && subject) {
        return `I could not verify whether ${topCard.card.name} earns rewards on ${subject} purchases. I logged this for a database update instead of guessing.`;
    }
    return "I could not verify that rewards-policy detail. I logged it for a database update instead of guessing.";
}
function buildDisplayCards(scoredCards, preferredCardId, importantCards = []) {
    var _a, _b;
    const primaryCard = (_a = (preferredCardId ? scoredCards.find((item) => item.card.id === preferredCardId) : undefined)) !== null && _a !== void 0 ? _a : scoredCards[0];
    if (!primaryCard)
        return [];
    const curatedAlternatives = ((_b = primaryCard.card.alternativeCardIds) !== null && _b !== void 0 ? _b : [])
        .flatMap((cardId) => {
        const item = scoredCards.find((entry) => entry.card.id === cardId);
        return item && item.card.id !== primaryCard.card.id ? [item] : [];
    });
    const fallbackCards = scoredCards.filter((item) => item.card.id !== primaryCard.card.id && !curatedAlternatives.some((alternative) => alternative.card.id === item.card.id));
    const orderedCards = [];
    for (const item of [primaryCard, ...importantCards, ...curatedAlternatives, ...fallbackCards]) {
        if (orderedCards.some((entry) => entry.card.id === item.card.id))
            continue;
        orderedCards.push(item);
    }
    return orderedCards.slice(0, 3);
}
function getUnsupportedQuestionReason(input) {
    const query = normalizeQuery(input.query);
    const intent = (0, query_intent_1.parseQueryIntent)(input);
    if (!query)
        return "Empty question";
    if (intent.needsLatestInfo) {
        return "Question needs live/latest information that is intentionally not answered via web search";
    }
    return null;
}
async function logUnsupportedQuestion(input, reason) {
    var _a, _b;
    const entry = {
        query: (_b = (_a = input.query) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "",
        loggedAt: new Date().toISOString(),
        reason,
        input
    };
    const logDir = node_path_1.default.dirname(question_logs_1.unsupportedQuestionLogPath);
    await promises_1.default.mkdir(logDir, { recursive: true });
    let existingEntries = [];
    try {
        const existingContent = await promises_1.default.readFile(question_logs_1.unsupportedQuestionLogPath, "utf8");
        existingEntries = JSON.parse(existingContent);
    }
    catch (error) {
        if (error.code !== "ENOENT")
            throw error;
    }
    existingEntries.push(entry);
    await promises_1.default.writeFile(question_logs_1.unsupportedQuestionLogPath, JSON.stringify(existingEntries, null, 2));
    return entry;
}
function buildGroundedAskPrompt(input, shortlistedCards) {
    var _a, _b, _c, _d;
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
    return JSON.stringify({
        userQuestion: (_a = input.query) !== null && _a !== void 0 ? _a : "",
        constraints: {
            maxAnnualFee: (_b = input.maxAnnualFee) !== null && _b !== void 0 ? _b : null,
            wantsLounge: (_c = input.wantsLounge) !== null && _c !== void 0 ? _c : false,
            wantsLifetimeFree: (_d = input.wantsLifetimeFree) !== null && _d !== void 0 ? _d : false
        },
        shortlistedCards: cardFacts
    }, null, 2);
}
function extractOpenAiText(payload) {
    if (!payload || typeof payload !== "object")
        return null;
    const directOutputText = payload.output_text;
    if (typeof directOutputText === "string" && directOutputText.trim())
        return directOutputText.trim();
    const output = payload.output;
    if (!Array.isArray(output))
        return null;
    for (const item of output) {
        if (!item || typeof item !== "object")
            continue;
        const content = item.content;
        if (!Array.isArray(content))
            continue;
        for (const part of content) {
            if (!part || typeof part !== "object")
                continue;
            const text = part.text;
            if (typeof text === "string" && text.trim())
                return text.trim();
        }
    }
    return null;
}
async function generateGroundedSummary(input, shortlistedCards) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
        return null;
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
                            text: "You are a grounded Indian credit-card assistant. Use only the provided shortlisted card data. Do not invent facts, do not use live web search, and do not mention cards outside the provided shortlist. Answer like a helpful expert, not like a scoring engine. In one short paragraph: directly answer the user's query, explain why the top card fits, mention the most important features of that card, mention the fee/tradeoff if relevant, and optionally mention one nearby alternative."
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
    if (!response.ok)
        return null;
    const payload = (await response.json());
    const rawText = extractOpenAiText(payload);
    if (!rawText)
        return null;
    try {
        const parsed = JSON.parse(rawText);
        return typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : null;
    }
    catch (_a) {
        return null;
    }
}
function buildCardResolutionPrompt(query) {
    const candidateCards = cards_1.cards.slice(0, 209).map((card) => ({
        id: card.id,
        name: card.name,
        issuer: card.issuer,
        tags: card.tags.slice(0, 6)
    }));
    return JSON.stringify({
        userQuery: query,
        instruction: "Pick the single best matching card id only if the query is likely referring to a specific card name or branded card product. Prefer exact or near-exact branded matches, including cases where spaces and punctuation differ. Return null if this looks like a generic recommendation query.",
        cards: candidateCards
    }, null, 2);
}
async function resolveMentionedCardIdWithAi(query) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !(query === null || query === void 0 ? void 0 : query.trim()))
        return null;
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
                            text: "You resolve fuzzy Indian credit-card name mentions to a single stored card id. Use only the provided card list. Return a card id only when the query is likely a specific card lookup; otherwise return null."
                        }
                    ]
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: buildCardResolutionPrompt(query)
                        }
                    ]
                }
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "card_resolution",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            cardId: {
                                anyOf: [{ type: "string" }, { type: "null" }]
                            }
                        },
                        required: ["cardId"]
                    }
                }
            }
        })
    });
    if (!response.ok)
        return null;
    const payload = (await response.json());
    const text = extractOpenAiText(payload);
    if (!text)
        return null;
    try {
        const parsed = JSON.parse(text);
        if (!parsed.cardId)
            return null;
        return (0, cards_1.getCardById)(parsed.cardId) ? parsed.cardId : null;
    }
    catch (_a) {
        return null;
    }
}
async function answerQuestion(input) {
    var _a, _b, _c;
    const unsupportedReason = getUnsupportedQuestionReason(input);
    if (unsupportedReason) {
        await logUnsupportedQuestion(input, unsupportedReason);
        return {
            summary: "I am not using live web search here. I logged this question for a database update so the next answer can come from our verified card dataset.",
            cards: [],
            needsDatabaseUpdate: true,
            unsupportedReason
        };
    }
    let shortlisted = shortlistCardsForQuestion(input);
    const scoredCards = (0, recommend_1.scoreCards)(input);
    const specificCardLookup = isSpecificCardLookup(input);
    const parsedCardQuestion = parseSpecificCardQuestion(input.query);
    const namedCardQuestionInitial = isNamedCardQuestion(input, shortlisted.mentionedCardId) ||
        (Boolean(shortlisted.mentionedCardId) && parsedCardQuestion.questionType !== "generic");
    if (shouldTryAiCardResolution(input, shortlisted.mentionedCardId)) {
        const aiMentionedCardId = await resolveMentionedCardIdWithAi(input.query);
        if (aiMentionedCardId) {
            shortlisted = buildShortlistFromMentionedCard(scoredCards, aiMentionedCardId);
        }
    }
    const scenarioWinnerCards = isTopBestCardsQuery(input.query) && !input.spend && !(0, query_intent_1.parseQueryIntent)(input).inferredSpend
        ? getBalancedScenarioWinnerCards(input, shortlisted.cards)
        : [];
    const answer = Object.assign(Object.assign({}, (0, recommend_1.answerFromCards)(input)), { cards: buildDisplayCards(scoredCards, (_c = (_a = shortlisted.mentionedCardId) !== null && _a !== void 0 ? _a : (_b = shortlisted.cards[0]) === null || _b === void 0 ? void 0 : _b.card.id) !== null && _c !== void 0 ? _c : null, scenarioWinnerCards) });
    const topCard = answer.cards[0];
    const namedCardQuestion = isNamedCardQuestion(input, shortlisted.mentionedCardId) ||
        (Boolean(shortlisted.mentionedCardId) && parsedCardQuestion.questionType !== "generic");
    const rewardsPolicySubject = extractRewardsPolicySubject(input.query);
    const genericScenarioHighlights = buildScenarioHighlights(input, answer.cards, {
        skip: specificCardLookup || namedCardQuestion
    });
    if (!topCard) {
        const reason = "No matching cards found in the current database for this question and filters";
        await logUnsupportedQuestion(input, reason);
        return Object.assign(Object.assign({}, answer), { highlights: [], needsDatabaseUpdate: true, unsupportedReason: reason });
    }
    if (namedCardQuestion && shortlisted.mentionedCardId && topCard.card.id !== shortlisted.mentionedCardId) {
        const reason = "Named card was not available under the current filters";
        await logUnsupportedQuestion(input, reason);
        return {
            summary: "I found the card you asked about, but it does not fit the current filters or available dataset well enough to answer confidently. I logged this for a database update instead of guessing.",
            cards: [],
            highlights: [],
            needsDatabaseUpdate: true,
            unsupportedReason: reason
        };
    }
    if (specificCardLookup && !namedCardQuestion && !topCardMatchesSpecificLookup(input, topCard)) {
        const reason = "Specific card lookup is not covered in the current database yet";
        await logUnsupportedQuestion(input, reason);
        return {
            summary: "I could not find that exact card in the current verified dataset yet. I logged it for a database update instead of guessing.",
            cards: [],
            highlights: [],
            needsDatabaseUpdate: true,
            unsupportedReason: reason
        };
    }
    if (specificCardLookup || namedCardQuestion) {
        const specificAnswer = buildSpecificQuestionAnswer(input, topCard);
        if (specificAnswer) {
            return Object.assign(Object.assign({}, answer), { summary: specificAnswer.summary, highlights: specificAnswer.highlights });
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
    if (isTopBestCardsQuery(input.query)) {
        return Object.assign(Object.assign({}, answer), { summary: buildFallbackSummary(input, answer.cards), highlights: buildTopCardsHighlights(input, answer.cards) });
    }
    if (generatedSummary) {
        const curatedAlternativeNames = getAlternativeNames(topCard, answer.cards);
        const fallbackAlternativeNames = answer.cards
            .slice(1, 3)
            .map((item) => item.card.name)
            .filter((name) => name !== topCard.card.name);
        return Object.assign(Object.assign({}, answer), { summary: generatedSummary, highlights: [
                ...buildFallbackHighlights(topCard, curatedAlternativeNames.length > 0 ? curatedAlternativeNames : fallbackAlternativeNames),
                ...genericScenarioHighlights
            ] });
    }
    const curatedAlternativeNames = getAlternativeNames(topCard, answer.cards);
    const fallbackAlternativeNames = answer.cards
        .slice(1, 3)
        .map((item) => item.card.name)
        .filter((name) => name !== topCard.card.name);
    return Object.assign(Object.assign({}, answer), { summary: buildFallbackSummary(input, answer.cards), highlights: [
            ...buildFallbackHighlights(topCard, curatedAlternativeNames.length > 0 ? curatedAlternativeNames : fallbackAlternativeNames),
            ...genericScenarioHighlights
        ] });
}
