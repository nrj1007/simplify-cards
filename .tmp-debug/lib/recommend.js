"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSpendProfile = void 0;
exports.scoreCards = scoreCards;
exports.answerFromCards = answerFromCards;
const cards_1 = require("./cards");
const query_intent_1 = require("./query-intent");
exports.defaultSpendProfile = {
    online: 15000,
    offline: 8000,
    travel: 5000,
    dining: 4000,
    grocery: 5000,
    fuel: 3000,
    amazon: 5000,
    upi: 5000,
    utilities: 3000
};
const spendAliases = {
    online: ["online"],
    offline: ["offline", "retail"],
    travel: [
        "travel",
        "travel credits",
        "irctc",
        "airlines",
        "hotel",
        "hotels",
        "marriott",
        "cleartrip"
    ],
    fuel: ["fuel"],
    dining: ["dining", "swiggy zomato", "dining movies grocery", "grocery dining movies", "pharmacy dining movies"],
    grocery: ["grocery", "groceries", "bigbasket", "dining movies grocery", "grocery dining movies"],
    amazon: ["amazon"],
    upi: ["upi"],
    utilities: ["utilities", "phonepe", "utility bills"]
};
const specialOnlineSpendAliases = [
    "smartbuy",
    "selected packs",
    "select merchants",
    "select lifestyle brands",
    "payzapp",
    "flipkart",
    "myntra",
    "partner merchants",
    "departmental stores"
];
const specialTravelSpendAliases = ["smartbuy flights", "smartbuy hotels", "smartbuy train"];
const blendedSmartbuySpendCategories = ["online"];
const broadComparisonUpsideWeight = 0.4;
function normalizeText(value = "") {
    return value.toLowerCase().trim();
}
function normalizeForMatch(value = "") {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeCompact(value = "") {
    return normalizeForMatch(value).replace(/\s+/g, "");
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function containsNormalizedPhrase(haystack, phrase) {
    const normalizedPhrase = normalizeForMatch(phrase);
    if (!normalizedPhrase)
        return false;
    const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedPhrase).replace(/ /g, "\\s+")}(?=\\s|$)`);
    return pattern.test(haystack);
}
const genericQueryWords = new Set([
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
    "get",
    "give",
    "gives",
    "earn",
    "earning",
    "rewards",
    "reward",
    "points",
    "miles",
    "using",
    "use",
    "does",
    "do",
    "can",
    "will",
    "is",
    "are",
    "have",
    "has",
    "on",
    "for"
]);
function getMeaningfulQueryTokens(query) {
    return normalizeForMatch(query)
        .split(" ")
        .filter((token) => token.length > 1 && !genericQueryWords.has(token));
}
function buildCardSearchText(card) {
    return normalizeForMatch([card.issuer, card.name, card.id.replace(/-/g, " "), ...card.tags, ...card.bestFor, ...card.network].join(" "));
}
function computeQueryKeywordBoost(card, query) {
    const meaningfulTokens = getMeaningfulQueryTokens(query);
    if (meaningfulTokens.length < 2)
        return 0;
    const searchableTokens = new Set(normalizeForMatch([card.issuer, card.name, card.id.replace(/-/g, " "), ...card.tags, ...card.bestFor].join(" "))
        .split(" ")
        .filter((token) => token.length > 2));
    const matchedTokenCount = meaningfulTokens.filter((token) => searchableTokens.has(token)).length;
    if (matchedTokenCount === 0)
        return 0;
    return matchedTokenCount * 5000;
}
function computeCardNameBoost(card, query) {
    const normalizedQuery = normalizeForMatch(query);
    const compactQuery = normalizeCompact(query);
    if (!normalizedQuery)
        return 0;
    const meaningfulTokens = getMeaningfulQueryTokens(query);
    if (meaningfulTokens.length === 0)
        return 0;
    const normalizedName = normalizeForMatch(card.name);
    const normalizedId = normalizeForMatch(card.id.replace(/-/g, " "));
    const compactName = normalizeCompact(card.name);
    const compactId = normalizeCompact(card.id.replace(/-/g, " "));
    const compactTags = card.tags.map((tag) => normalizeCompact(tag)).filter(Boolean);
    const searchText = buildCardSearchText(card);
    let boost = 0;
    if (normalizedName === normalizedQuery)
        return 120000;
    if (compactQuery && (compactName === compactQuery || compactId === compactQuery || compactTags.includes(compactQuery))) {
        return 115000;
    }
    if (searchText === normalizedQuery)
        return 110000;
    if (normalizedName.includes(normalizedQuery) && normalizedQuery.length >= 4) {
        boost += 80000;
    }
    else if (searchText.includes(normalizedQuery) && normalizedQuery.length >= 4) {
        boost += 60000;
    }
    const matchedNameTokenCount = meaningfulTokens.filter((token) => normalizedName.includes(token) || normalizedId.includes(token)).length;
    if (meaningfulTokens.length === 1) {
        if (matchedNameTokenCount === 1) {
            boost += 65000;
        }
        return boost;
    }
    if (matchedNameTokenCount === meaningfulTokens.length) {
        boost += 90000;
    }
    else if (matchedNameTokenCount >= 2) {
        boost += matchedNameTokenCount * 6000;
    }
    return boost;
}
function extractQueryTags(query) {
    const text = normalizeText(query);
    const tags = new Set();
    for (const tag of [
        "online",
        "cashback",
        "travel",
        "lounge",
        "forex",
        "amazon",
        "fuel",
        "lifetime free",
        "secured",
        "dining",
        "grocery",
        "utilities",
        "phonepe",
        "tata neu",
        "shoppers stop",
        "marriott",
        "irctc"
    ]) {
        if (text.includes(tag))
            tags.add(tag);
    }
    if (text.includes("upi") || text.includes("rupay"))
        tags.add("upi");
    if (text.includes("free") || text.includes("zero fee"))
        tags.add("lifetime free");
    return tags;
}
function normalizeIssuer(issuer) {
    return normalizeForMatch(issuer);
}
function shouldIncludeSmartbuyLikeRewards(query) {
    const normalizedQuery = normalizeForMatch(query);
    return ["smartbuy", "payzapp", "myntra", "flipkart", "cleartrip"].some((token) => normalizedQuery.includes(token));
}
function hasExplicitAnnualFeeLanguage(query) {
    const normalizedQuery = normalizeForMatch(query);
    return normalizedQuery.includes("annual fee") || normalizedQuery.includes("renewal fee");
}
function shouldRestrictToIssuer(intent, query) {
    if (intent.issuers.length !== 1)
        return false;
    const normalizedQuery = normalizeForMatch(query);
    if (!normalizedQuery)
        return false;
    if (normalizedQuery.includes(" vs ") || normalizedQuery.includes(" compare "))
        return false;
    return true;
}
function requiresRelationshipAccess(card) {
    var _a, _b, _c, _d, _e, _f, _g;
    const haystack = normalizeForMatch([
        card.name,
        ...card.bestFor,
        ...card.tags,
        ...card.exclusions,
        ...((_a = card.additionalBenefits) !== null && _a !== void 0 ? _a : []),
        ...((_b = card.additionalDetails) !== null && _b !== void 0 ? _b : []),
        ...((_c = card.internalNotes) !== null && _c !== void 0 ? _c : []),
        ...((_e = (_d = card.eligibility) === null || _d === void 0 ? void 0 : _d.salaried) !== null && _e !== void 0 ? _e : []),
        ...((_g = (_f = card.eligibility) === null || _f === void 0 ? void 0 : _f.selfEmployed) !== null && _g !== void 0 ? _g : [])
    ].join(" "));
    return [
        "invite only",
        "relationship",
        "pioneer",
        "burgundy",
        "solitaire",
        "priority banking",
        "private banking",
        "wealth management",
        "approval required"
    ].some((token) => haystack.includes(token));
}
function genericRelationshipPenalty(card, input, intent) {
    const normalizedQuery = normalizeForMatch(input.query);
    if (!requiresRelationshipAccess(card))
        return 0;
    const userExplicitlyAskedForRelationshipCard = [
        "pioneer",
        "burgundy",
        "solitaire",
        "priority banking",
        "private banking",
        "wealth management",
        "invite only"
    ].some((token) => normalizedQuery.includes(token));
    if (userExplicitlyAskedForRelationshipCard)
        return 0;
    if (intent.issuers.length > 0 && getMeaningfulQueryTokens(input.query).length <= 2)
        return 0;
    return -120000;
}
function cardUseCaseStrength(card, useCase) {
    const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor, ...card.rewards.map((reward) => reward.category)].join(" "));
    if (useCase === "cashback") {
        let score = 0;
        if (haystack.includes("cashback") || card.rewardType.toLowerCase().includes("cashback"))
            score += 3;
        if (card.rewards.some((reward) => reward.rate >= 3))
            score += 1;
        return score;
    }
    if (useCase === "travel") {
        let score = 0;
        if (card.rewards.some((reward) => ["travel", "airlines", "hotel", "hotels", "smartbuy flights", "smartbuy hotels"].includes(reward.category))) {
            score += 3;
        }
        if (["travel", "miles", "airline", "hotel", "hotels", "flights"].some((token) => containsNormalizedPhrase(haystack, token))) {
            score += 2;
        }
        if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited" || card.loungeDomestic + card.loungeInternational > 0) {
            score += 1;
        }
        return score;
    }
    return 0;
}
function cardMatchesSegment(card, segment) {
    const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor].join(" "));
    if (segment === "ltf")
        return card.annualFee === 0 || containsNormalizedPhrase(haystack, "lifetime free") || containsNormalizedPhrase(haystack, "ltf");
    if (segment === "super-premium")
        return containsNormalizedPhrase(haystack, "super premium") || containsNormalizedPhrase(haystack, "invite") || card.annualFee >= 10000;
    if (segment === "premium")
        return containsNormalizedPhrase(haystack, "premium") || card.annualFee >= 3000;
    if (segment === "beginner")
        return containsNormalizedPhrase(haystack, "beginner") || containsNormalizedPhrase(haystack, "starter") || containsNormalizedPhrase(haystack, "secured") || card.annualFee <= 1000;
    return false;
}
function cardMatchesRedemptionBucket(card, bucket) {
    var _a, _b, _c, _d;
    const haystack = normalizeForMatch([card.name, ...card.tags, ...((_a = card.additionalBenefits) !== null && _a !== void 0 ? _a : []), ...((_b = card.additionalDetails) !== null && _b !== void 0 ? _b : []), ...((_c = card.internalNotes) !== null && _c !== void 0 ? _c : [])].join(" "));
    if (bucket === "accor")
        return Boolean((_d = card.redemption) === null || _d === void 0 ? void 0 : _d.accorValue);
    if (bucket === "air-india")
        return containsNormalizedPhrase(haystack, "air india");
    return false;
}
function redemptionPreferenceValueBoost(card, bucket) {
    var _a, _b;
    if (bucket === "accor" && typeof ((_a = card.redemption) === null || _a === void 0 ? void 0 : _a.accorValue) === "number") {
        return Math.round(card.redemption.accorValue * 10000);
    }
    if (bucket === "air-india" && typeof ((_b = card.redemption) === null || _b === void 0 ? void 0 : _b.airMilesValue) === "number") {
        return Math.round(card.redemption.airMilesValue * 3000);
    }
    return 0;
}
function monthlySpendTotal(spend) {
    return Object.values(spend).reduce((total, amount = 0) => total + amount, 0);
}
function annualSpendTotal(spend) {
    return monthlySpendTotal(spend) * 12;
}
function parseRupeeAmount(value) {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized)
        return null;
    const lakhMatch = normalized.match(/(\d+(?:\.\d+)?)\s*lakh/i);
    if (lakhMatch) {
        return Math.round(Number(lakhMatch[1]) * 100000);
    }
    const plainMatch = normalized.match(/(\d+(?:\.\d+)?)/);
    if (!plainMatch)
        return null;
    return Math.round(Number(plainMatch[1]));
}
function extractMilestoneThreshold(text) {
    var _a, _b, _c;
    const normalized = text.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
    const thresholdMatch = (_c = (_b = (_a = normalized.match(/annual spend(?:s|ing)?(?: of| above| greater than)? rs (\d+(?:\.\d+)?) lakh/)) !== null && _a !== void 0 ? _a : normalized.match(/spends of rs (\d+(?:\.\d+)?) lakh/)) !== null && _b !== void 0 ? _b : normalized.match(/spending rs (\d+(?:\.\d+)?) lakh/)) !== null && _c !== void 0 ? _c : normalized.match(/rs (\d+(?:\.\d+)?) lakh or more/);
    if (!thresholdMatch)
        return null;
    return Math.round(Number(thresholdMatch[1]) * 100000);
}
function estimatePointUnitValue(card) {
    var _a, _b, _c, _d;
    const values = [
        (_a = card.redemption) === null || _a === void 0 ? void 0 : _a.smartBuyFlightHotelValue,
        (_b = card.redemption) === null || _b === void 0 ? void 0 : _b.airMilesValue,
        (_c = card.redemption) === null || _c === void 0 ? void 0 : _c.statementBalanceValue,
        (_d = card.redemption) === null || _d === void 0 ? void 0 : _d.accorValue
    ].filter((value) => typeof value === "number" && value > 0);
    if (values.length === 0)
        return 0;
    return Math.max(...values);
}
function rewardUnitValue(card) {
    const rewardType = normalizeForMatch(card.rewardType);
    if (rewardType.includes("cashback"))
        return 1;
    const explicitValue = estimatePointUnitValue(card);
    if (explicitValue > 0)
        return explicitValue;
    if (rewardType.includes("point") ||
        rewardType.includes("mile") ||
        rewardType.includes("coin") ||
        rewardType.includes("credit")) {
        const fallbackValue = estimateFallbackPointUnitValue(card);
        return fallbackValue > 0 ? fallbackValue : 1;
    }
    return 1;
}
function estimateFallbackPointUnitValue(card) {
    var _a, _b, _c, _d, _e;
    const rewardType = normalizeForMatch(card.rewardType);
    const haystack = normalizeForMatch([...((_a = card.tags) !== null && _a !== void 0 ? _a : []), ...((_b = card.bestFor) !== null && _b !== void 0 ? _b : []), ...((_c = card.additionalBenefits) !== null && _c !== void 0 ? _c : []), ...((_d = card.additionalDetails) !== null && _d !== void 0 ? _d : []), ...((_e = card.internalNotes) !== null && _e !== void 0 ? _e : [])].join(" "));
    if (rewardType.includes("edge miles"))
        return 1;
    if (rewardType.includes("mile"))
        return 1;
    if (haystack.includes("convert to air miles at 1 1") || haystack.includes("convert to air miles at 1:1"))
        return 1;
    if (rewardType.includes("membership rewards"))
        return 0.3;
    return 0;
}
function estimateMilestoneLineValue(card, benefit) {
    const normalized = normalizeForMatch(benefit);
    if (normalized.includes("fee waived") || normalized.includes("fee waiver") || normalized.includes("fee reversal")) {
        return 0;
    }
    let value = 0;
    const rupeePatterns = [
        /rs ([\d,.]+(?:\.\d+)?) worth/gi,
        /voucher worth rs ([\d,.]+(?:\.\d+)?)/gi,
        /vouchers worth rs ([\d,.]+(?:\.\d+)?)/gi,
        /cashback of rs ([\d,.]+(?:\.\d+)?)/gi,
        /(?<!voucher )(?<!vouchers )worth rs ([\d,.]+(?:\.\d+)?)/gi
    ];
    for (const pattern of rupeePatterns) {
        const matches = benefit.matchAll(pattern);
        for (const match of matches) {
            const parsed = parseRupeeAmount(match[1]);
            if (parsed)
                value += parsed;
        }
    }
    const pointValue = estimatePointUnitValue(card) || estimateFallbackPointUnitValue(card);
    if (pointValue > 0) {
        const pointPattern = /([\d,]+)\s+(?:bonus\s+|additional\s+)?(?:edge miles|membership rewards points|reward points|points)\b/gi;
        const matches = benefit.matchAll(pointPattern);
        for (const match of matches) {
            const points = Number(match[1].replace(/,/g, ""));
            if (!Number.isNaN(points) && points > 0) {
                value += Math.round(points * pointValue);
            }
        }
    }
    return value;
}
function milestoneValueForCard(card, annualSpend) {
    var _a;
    if (!((_a = card.milestoneBenefits) === null || _a === void 0 ? void 0 : _a.length))
        return 0;
    return card.milestoneBenefits.reduce((total, benefit) => {
        const threshold = extractMilestoneThreshold(benefit);
        if (threshold !== null && annualSpend < threshold)
            return total;
        return total + estimateMilestoneLineValue(card, benefit);
    }, 0);
}
function milestoneThresholdsForCard(card) {
    var _a;
    const thresholds = new Set();
    if (card.feeWaiverSpend && card.feeWaiverSpend > 0) {
        thresholds.add(card.feeWaiverSpend);
    }
    for (const benefit of (_a = card.milestoneBenefits) !== null && _a !== void 0 ? _a : []) {
        const threshold = extractMilestoneThreshold(benefit);
        if (threshold && threshold > 0)
            thresholds.add(threshold);
    }
    return [...thresholds].sort((a, b) => a - b);
}
function comparisonMilestoneAndWaiverValue(card) {
    const thresholds = milestoneThresholdsForCard(card);
    if (thresholds.length === 0)
        return 0;
    let maxValue = 0;
    for (const annualSpend of thresholds) {
        const milestoneValue = milestoneValueForCard(card, annualSpend);
        const feeWaiverValue = card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend ? card.annualFee : 0;
        maxValue = Math.max(maxValue, milestoneValue + feeWaiverValue);
    }
    return maxValue;
}
function aliasesForSpendCategory(category, includeSmartbuyLikeRewards) {
    if (category === "online") {
        return includeSmartbuyLikeRewards ? [...spendAliases.online, ...specialOnlineSpendAliases] : spendAliases.online;
    }
    if (category === "travel") {
        return includeSmartbuyLikeRewards ? [...spendAliases.travel, ...specialTravelSpendAliases] : spendAliases.travel;
    }
    if (category === "grocery") {
        return includeSmartbuyLikeRewards ? [...spendAliases.grocery, ...specialOnlineSpendAliases] : spendAliases.grocery;
    }
    return spendAliases[category];
}
function specialAliasesForSpendCategory(category) {
    if (category === "online")
        return specialOnlineSpendAliases;
    if (category === "travel")
        return ["smartbuy", ...specialTravelSpendAliases];
    if (category === "grocery")
        return ["smartbuy", ...specialOnlineSpendAliases];
    return [];
}
function exclusionTextForCard(card) {
    return normalizeForMatch(card.exclusions.join(" "));
}
function isSpendCategoryExcluded(card, category) {
    const exclusionText = exclusionTextForCard(card);
    const categoryTerms = spendAliases[category].map((alias) => normalizeForMatch(alias));
    return categoryTerms.some((term) => containsNormalizedPhrase(exclusionText, term));
}
function findBaseRewardForSpend(card, category) {
    var _a, _b;
    const aliases = spendAliases[category];
    return ((_b = (_a = card.rewards.find((reward) => aliases.includes(reward.category))) !== null && _a !== void 0 ? _a : card.rewards.find((reward) => reward.category === category)) !== null && _b !== void 0 ? _b : card.rewards.find((reward) => reward.category === "offline"));
}
function findSpecialRewardForSpend(card, category) {
    var _a;
    const aliases = specialAliasesForSpendCategory(category);
    if (aliases.length === 0)
        return null;
    return (_a = card.rewards.find((reward) => aliases.includes(reward.category))) !== null && _a !== void 0 ? _a : null;
}
function rewardAllocationsForSpend(card, category, amount, includeSmartbuyLikeRewards) {
    if (!amount || amount <= 0)
        return [];
    if (includeSmartbuyLikeRewards) {
        const matchingReward = findRewardForSpend(card, category, true);
        return matchingReward ? [{ amount, reward: matchingReward }] : [];
    }
    if (category === "travel") {
        const travelReward = findRewardForSpend(card, category, true);
        return travelReward ? [{ amount, reward: travelReward }] : [];
    }
    if (category === "grocery") {
        const groceryReward = findRewardForSpend(card, category, true);
        return groceryReward ? [{ amount, reward: groceryReward }] : [];
    }
    const baseReward = findBaseRewardForSpend(card, category);
    const specialReward = blendedSmartbuySpendCategories.includes(category) ? findSpecialRewardForSpend(card, category) : null;
    if (specialReward && baseReward && specialReward.category !== baseReward.category) {
        return [
            { amount: amount * 0.5, reward: specialReward },
            { amount: amount * 0.5, reward: baseReward }
        ];
    }
    const matchingReward = baseReward !== null && baseReward !== void 0 ? baseReward : specialReward;
    return matchingReward ? [{ amount, reward: matchingReward }] : [];
}
function isDirectRewardMatch(category, rewardCategory, includeSmartbuyLikeRewards) {
    const directAliases = aliasesForSpendCategory(category, includeSmartbuyLikeRewards);
    const specialAliases = specialAliasesForSpendCategory(category);
    return directAliases.includes(rewardCategory) || specialAliases.includes(rewardCategory) || rewardCategory === category;
}
function findRewardForSpend(card, category, includeSmartbuyLikeRewards) {
    var _a, _b;
    const aliases = aliasesForSpendCategory(category, includeSmartbuyLikeRewards);
    return ((_b = (_a = card.rewards.find((reward) => aliases.includes(reward.category))) !== null && _a !== void 0 ? _a : card.rewards.find((reward) => reward.category === category)) !== null && _b !== void 0 ? _b : card.rewards.find((reward) => reward.category === "offline"));
}
function findDirectRewardForSpend(card, category, includeSmartbuyLikeRewards) {
    var _a, _b;
    const aliases = aliasesForSpendCategory(category, includeSmartbuyLikeRewards);
    return ((_b = (_a = card.rewards.find((reward) => aliases.includes(reward.category))) !== null && _a !== void 0 ? _a : card.rewards.find((reward) => reward.category === category)) !== null && _b !== void 0 ? _b : null);
}
function rewardBreakdownForCard(card, spend, includeSmartbuyLikeRewards) {
    const unitValue = rewardUnitValue(card);
    return Object.entries(spend).flatMap(([category, amount]) => {
        if (isSpendCategoryExcluded(card, category)) {
            return [];
        }
        return rewardAllocationsForSpend(card, category, amount, includeSmartbuyLikeRewards).map(({ amount: allocatedAmount, reward }) => {
            const rawReward = (allocatedAmount * reward.rate) / 100;
            let cappedRewardUnits = rawReward;
            if (reward.capMonthly) {
                if (reward.postCapRate && reward.postCapRate > 0 && rawReward > reward.capMonthly && reward.postCapRate < reward.rate) {
                    const spendAtCap = (reward.capMonthly * 100) / reward.rate;
                    const excessSpend = Math.max(allocatedAmount - spendAtCap, 0);
                    const postCapRewardUnits = (excessSpend * reward.postCapRate) / 100;
                    cappedRewardUnits = reward.capMonthly + postCapRewardUnits;
                }
                else {
                    cappedRewardUnits = Math.min(rawReward, reward.capMonthly);
                }
            }
            const monthlyReward = cappedRewardUnits * unitValue;
            return {
                spendCategory: category,
                monthlySpend: Math.round(allocatedAmount),
                rewardCategory: reward.category,
                monthlyReward: Math.round(monthlyReward),
                annualReward: Math.round(monthlyReward * 12)
            };
        });
    });
}
function annualRewardForCard(card, spend, includeSmartbuyLikeRewards) {
    return rewardBreakdownForCard(card, spend, includeSmartbuyLikeRewards).reduce((total, item) => total + item.annualReward, 0);
}
function isPremiumTravelCard(card) {
    const haystack = normalizeForMatch([
        card.name,
        ...card.tags,
        ...card.bestFor,
        ...card.rewards.map((reward) => reward.category)
    ].join(" "));
    const hasTravelSignals = ["travel", "miles", "airline", "airlines", "hotel", "hotels", "lounge"].some((token) => containsNormalizedPhrase(haystack, token)) ||
        card.rewards.some((reward) => ["travel", "hotels", "airlines", "smartbuy flights", "smartbuy hotels"].includes(reward.category));
    const hasPremiumSignals = card.annualFee >= 3000 ||
        ["premium", "super premium", "metal", "signature", "world", "infinite", "mastercard"].some((token) => haystack.includes(token)) ||
        card.loungeDomestic === "unlimited" ||
        card.loungeInternational === "unlimited" ||
        loungeScore(card) >= 8;
    return hasTravelSignals && hasPremiumSignals;
}
function isBroadMixedSpendQuery(input, intent) {
    if (input.spend || intent.inferredSpend)
        return false;
    if (intent.issuers.length > 0 || intent.useCases.length > 0 || intent.redemptionBuckets.length > 0 || intent.networks.length > 0) {
        return false;
    }
    if (input.wantsLounge || input.wantsLifetimeFree)
        return false;
    if (intent.tags.some((tag) => ["forex", "lounge", "amazon", "fuel", "dining", "grocery", "utilities", "upi"].includes(tag))) {
        return false;
    }
    return true;
}
function categoryFitAdjustment(card, spend, includeSmartbuyLikeRewards, options) {
    const monthlyTotal = monthlySpendTotal(spend);
    if (!monthlyTotal)
        return 0;
    const activeCategories = Object.entries(spend).filter(([, amount]) => (amount !== null && amount !== void 0 ? amount : 0) > 0);
    const isFocusedSpendProfile = activeCategories.length === 1;
    const softenPremiumTravelPenalty = Boolean(options === null || options === void 0 ? void 0 : options.broadMixedSpendQuery) && !isFocusedSpendProfile && isPremiumTravelCard(card);
    return activeCategories.reduce((total, [category, amount]) => {
        if (!amount || amount <= 0)
            return total;
        const isExcluded = isSpendCategoryExcluded(card, category);
        const allocations = rewardAllocationsForSpend(card, category, amount, includeSmartbuyLikeRewards);
        if (isExcluded) {
            const exclusionPenalty = softenPremiumTravelPenalty && category !== "travel" && category !== "offline"
                ? (category === "fuel" ? 45000 : 25000)
                : 90000;
            return total - exclusionPenalty * (amount / monthlyTotal);
        }
        if (allocations.length === 0) {
            const missingPenalty = softenPremiumTravelPenalty ? (isFocusedSpendProfile ? 35000 : 5000) : isFocusedSpendProfile ? 35000 : 12000;
            return total - missingPenalty * (amount / monthlyTotal);
        }
        return (total +
            allocations.reduce((categoryTotal, allocation) => {
                const weight = allocation.amount / monthlyTotal;
                const rewardCategory = allocation.reward.category;
                if (isDirectRewardMatch(category, rewardCategory, includeSmartbuyLikeRewards)) {
                    return categoryTotal + (isFocusedSpendProfile ? 32000 : 14000) * weight;
                }
                if (rewardCategory === "offline" && category !== "offline") {
                    const fallbackPenalty = softenPremiumTravelPenalty ? (isFocusedSpendProfile ? 28000 : 1500) : isFocusedSpendProfile ? 28000 : 10000;
                    return categoryTotal - fallbackPenalty * weight;
                }
                return categoryTotal;
            }, 0));
    }, 0);
}
function genericLtfAdjustment(card, intent) {
    if (!(intent.segments.length === 1 && intent.segments[0] === "ltf"))
        return 0;
    if (intent.useCases.length > 0 || intent.issuers.length > 0 || intent.redemptionBuckets.length > 0)
        return 0;
    const haystack = normalizeForMatch([card.name, ...card.tags, ...card.bestFor, ...card.exclusions].join(" "));
    let adjustment = 0;
    if (containsNormalizedPhrase(haystack, "entry level") || containsNormalizedPhrase(haystack, "beginner") || containsNormalizedPhrase(haystack, "starter"))
        adjustment += 10000;
    if (containsNormalizedPhrase(haystack, "invite only") || containsNormalizedPhrase(haystack, "luxury"))
        adjustment -= 18000;
    return adjustment;
}
function feeAfterWaiver(card, spend) {
    const annualSpend = annualSpendTotal(spend);
    if (card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend)
        return 0;
    return card.annualFee;
}
function loungeScore(card) {
    if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited")
        return 20;
    return card.loungeDomestic + card.loungeInternational;
}
function loungePreferenceBoost(card, wantsLounge, intent) {
    const score = loungeScore(card);
    if (score <= 0) {
        if (wantsLounge)
            return -12000;
        if (intent.useCases.includes("travel"))
            return -3000;
        return 0;
    }
    const hasInternationalLounge = card.loungeInternational === "unlimited" || card.loungeInternational > 0;
    const internationalLoungeScore = card.loungeInternational === "unlimited" ? 8 : typeof card.loungeInternational === "number" ? card.loungeInternational : 0;
    let boost = 0;
    if (wantsLounge) {
        boost += score * 1500;
        boost += internationalLoungeScore * 2500;
        if (hasInternationalLounge)
            boost += 8000;
    }
    if (intent.useCases.includes("travel")) {
        boost += score * 180;
        if (hasInternationalLounge)
            boost += 1500;
    }
    return boost;
}
function forexPreferenceBoost(card, intent) {
    const hasForexIntent = intent.tags.includes("forex") || intent.useCases.includes("travel");
    if (!hasForexIntent)
        return 0;
    const markup = typeof card.forexMarkup === "number" ? card.forexMarkup : 3.5;
    const betterThanBaseline = 3.5 - markup;
    const explicitForexQuery = intent.tags.includes("forex");
    if (betterThanBaseline > 0) {
        return Math.round(betterThanBaseline * (explicitForexQuery ? 30000 : 3500));
    }
    if (betterThanBaseline < 0) {
        return Math.round(betterThanBaseline * (explicitForexQuery ? 18000 : 2000));
    }
    return 0;
}
function scoreCards(input) {
    var _a, _b, _c, _d, _e;
    const intent = (0, query_intent_1.parseQueryIntent)(input);
    const queryTags = extractQueryTags(input.query);
    const effectiveMaxAnnualFee = (_a = input.maxAnnualFee) !== null && _a !== void 0 ? _a : intent.maxAnnualFee;
    const wantsLifetimeFree = (_b = input.wantsLifetimeFree) !== null && _b !== void 0 ? _b : intent.wantsLifetimeFree;
    const wantsLounge = (_c = input.wantsLounge) !== null && _c !== void 0 ? _c : intent.wantsLounge;
    const spend = Object.assign(Object.assign(Object.assign({}, exports.defaultSpendProfile), ((_d = intent.inferredSpend) !== null && _d !== void 0 ? _d : {})), ((_e = input.spend) !== null && _e !== void 0 ? _e : {}));
    const annualSpend = annualSpendTotal(spend);
    const restrictToIssuer = shouldRestrictToIssuer(intent, input.query);
    const includeSmartbuyLikeRewards = shouldIncludeSmartbuyLikeRewards(input.query);
    const broadMixedSpendQuery = isBroadMixedSpendQuery(input, intent);
    const broadNoSpendRankingQuery = !input.spend &&
        !intent.inferredSpend &&
        intent.issuers.length === 0 &&
        intent.useCases.length === 0 &&
        intent.redemptionBuckets.length === 0 &&
        intent.networks.length === 0;
    return cards_1.cards
        .filter((card) => (effectiveMaxAnnualFee === undefined ? true : card.annualFee <= effectiveMaxAnnualFee))
        .filter((card) => effectiveMaxAnnualFee === undefined || hasExplicitAnnualFeeLanguage(input.query) ? true : card.joiningFee <= effectiveMaxAnnualFee)
        .filter((card) => (wantsLifetimeFree ? card.annualFee === 0 : true))
        .filter((card) => (wantsLounge ? loungeScore(card) > 0 : true))
        .filter((card) => (restrictToIssuer ? normalizeIssuer(card.issuer) === normalizeIssuer(intent.issuers[0]) : true))
        .map((card) => {
        const matchedTags = card.tags.filter((tag) => queryTags.has(tag));
        const cardNameBoost = computeCardNameBoost(card, input.query);
        const issuerBoost = intent.issuers.includes(card.issuer) ? 20000 : 0;
        const rewardBreakdown = rewardBreakdownForCard(card, spend, includeSmartbuyLikeRewards);
        const estimatedAnnualRewards = annualRewardForCard(card, spend, includeSmartbuyLikeRewards);
        const estimatedMilestoneValue = milestoneValueForCard(card, annualSpend);
        const estimatedAnnualFee = feeAfterWaiver(card, spend);
        const estimatedNetValue = estimatedAnnualRewards + estimatedMilestoneValue - estimatedAnnualFee;
        const currentMilestoneAndWaiverValue = estimatedMilestoneValue + (card.annualFee - estimatedAnnualFee);
        const maxComparisonMilestoneAndWaiverValue = comparisonMilestoneAndWaiverValue(card);
        const comparisonMilestoneAndWaiverDelta = broadNoSpendRankingQuery
            ? Math.round(Math.max(maxComparisonMilestoneAndWaiverValue - currentMilestoneAndWaiverValue, 0) * broadComparisonUpsideWeight)
            : 0;
        const tagBoost = matchedTags.length * 500;
        const keywordBoost = computeQueryKeywordBoost(card, input.query);
        const useCaseBoost = intent.useCases.reduce((total, useCase) => {
            const strength = cardUseCaseStrength(card, useCase);
            return total + (strength > 0 ? strength * 7000 : -12000);
        }, 0);
        const segmentBoost = intent.segments.reduce((total, segment) => total + (cardMatchesSegment(card, segment) ? 3000 : 0), 0);
        const redemptionBoost = intent.redemptionBuckets.reduce((total, bucket) => total + (cardMatchesRedemptionBucket(card, bucket) ? 3500 : 0) + redemptionPreferenceValueBoost(card, bucket), 0);
        const networkBoost = intent.networks.some((network) => card.network.includes(network)) ? 3000 : 0;
        const loungeBoost = loungePreferenceBoost(card, wantsLounge, intent);
        const forexBoost = forexPreferenceBoost(card, intent);
        const spendCategoryBoost = categoryFitAdjustment(card, spend, includeSmartbuyLikeRewards, {
            broadMixedSpendQuery
        });
        const ltfQueryBoost = genericLtfAdjustment(card, intent);
        const relationshipPenalty = genericRelationshipPenalty(card, input, intent);
        const feeWaiverReason = card.feeWaiverSpend && annualSpend >= card.feeWaiverSpend
            ? `Fee waiver likely at Rs ${annualSpend.toLocaleString("en-IN")} yearly spend`
            : card.feeWaiverSpend
                ? `Fee waiver needs Rs ${card.feeWaiverSpend.toLocaleString("en-IN")} yearly spend`
                : "No fee waiver listed";
        const strongestRewards = [...rewardBreakdown]
            .sort((a, b) => b.annualReward - a.annualReward)
            .slice(0, 2)
            .map((item) => `${item.spendCategory} uses ${item.rewardCategory} rewards`);
        const reasons = [
            ...(cardNameBoost > 0 ? ["Strong card-name match for the query"] : []),
            ...(issuerBoost > 0 ? [`Matches ${card.issuer} issuer intent`] : []),
            ...matchedTags.map((tag) => `Matches ${tag} intent`),
            ...strongestRewards,
            ...(estimatedMilestoneValue > 0 ? [`Milestone value adds about Rs ${estimatedMilestoneValue.toLocaleString("en-IN")}`] : []),
            ...(comparisonMilestoneAndWaiverDelta > 0
                ? [`Higher milestone and fee-waiver upside can add about Rs ${comparisonMilestoneAndWaiverDelta.toLocaleString("en-IN")} in broader comparisons`]
                : []),
            card.annualFee === 0 ? "No annual fee" : `Effective annual fee is Rs ${estimatedAnnualFee}`,
            feeWaiverReason,
            loungeScore(card) > 0
                ? card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited"
                    ? "Unlimited lounge access listed"
                    : `${loungeScore(card)} yearly lounge visits listed`
                : "No lounge access listed"
        ];
        return {
            card,
            annualSpend,
            estimatedAnnualRewards,
            estimatedMilestoneValue,
            estimatedAnnualFee,
            estimatedNetValue,
            fitScore: estimatedNetValue +
                tagBoost +
                loungeBoost +
                cardNameBoost +
                issuerBoost +
                useCaseBoost +
                segmentBoost +
                redemptionBoost +
                networkBoost +
                keywordBoost +
                forexBoost +
                spendCategoryBoost +
                comparisonMilestoneAndWaiverDelta +
                ltfQueryBoost +
                relationshipPenalty,
            matchedTags,
            reasons,
            rewardBreakdown
        };
    })
        .sort((a, b) => b.fitScore - a.fitScore);
}
function answerFromCards(input) {
    const topCards = scoreCards(input).slice(0, 3);
    return {
        summary: topCards.length === 0
            ? "No card matched the selected constraints. Try increasing the annual fee limit or removing lounge/lifetime-free filters."
            : `${topCards[0].card.name} looks strongest with an estimated net yearly value of Rs ${topCards[0].estimatedNetValue.toLocaleString("en-IN")}.`,
        cards: topCards
    };
}
