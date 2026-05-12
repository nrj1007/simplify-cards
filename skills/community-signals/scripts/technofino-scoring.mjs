import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const CARD_DATA_DIR = path.join(process.cwd(), "data", "cards");

const STRONG_CARD_TERMS = [
  /\bcredit\s*card\b/i,
  /\bcc\b/i,
  /\b(?:hdfc|sbi|axis|icici|idfc|kotak|indusind|rbl|hsbc|amex|american\s+express|standard\s+chartered|federal|bob|yes\s+bank|phonepe)\s+card\b/i,
  /\bcard\s+lt(?:f|ifetime\s+free)\b/i,
  /\blifetime\s+free\b/i,
  /\bltf\b/i,
  /\bdevaluation\b/i,
  /\bredemption\b/i,
  /\breward\s+(?:points?|rate|value|redemption|change|reversal)\b/i,
  /\bcashback\b/i,
  /\blounge\b/i,
  /\bpriority\s+pass\b/i,
  /\bforex\b/i,
  /\bmark-?up\b/i,
  /\bfuel\s+(?:surcharge|fee|waiver)\b/i,
  /\bmerchant\b/i,
  /\bmcc\b/i,
  /\bmitc\b/i,
  /\bcharges?\b/i,
  /\bannual\s+fee\b/i,
  /\bjoining\s+fee\b/i
];

const HIGH_SIGNAL_TERMS = [
  /\beffective\b/i,
  /\brevised\b/i,
  /\bupdated?\b/i,
  /\bchange(?:d|s)?\b/i,
  /\bnew\s+card\b/i,
  /\blaunch(?:ed|ing)?\b/i,
  /\bcriteria\b/i,
  /\beligibility\b/i,
  /\bupgrade\b/i,
  /\bconverted?\b/i,
  /\bfee\b/i,
  /\bgst\b/i,
  /\bnot\s+(?:credited|posting|working)\b/i
];

const ISSUER_TERMS = [
  /\bhdfc\b/i,
  /\bsbi\b/i,
  /\baxis\b/i,
  /\bicici\b/i,
  /\bidfc\b/i,
  /\bkotak\b/i,
  /\bindusind\b/i,
  /\brbl\b/i,
  /\byes\s+bank\b/i,
  /\bhsbc\b/i,
  /\bstandard\s+chartered\b/i,
  /\bfederal\b/i,
  /\bbob(?:card)?\b/i,
  /\bamex\b/i,
  /\bamerican\s+express\b/i
];

const NOISE_TERMS = [
  /\bdebit\s+card\b/i,
  /\bdc\b/i,
  /\bsavings?\s+account\b/i,
  /\bbank\s+account\b/i,
  /\bsalary\s+account\b/i,
  /\bzero\s+balance\b/i,
  /\bupi\s+lite\b/i,
  /\bnet\s*banking\b/i,
  /\bloan\b/i,
  /\bmutual\s+fund\b/i,
  /\bdemat\b/i
];

const GENERIC_NOISE_TITLES = [/^wiki$/i, /^pnb\s+savings?\s+account$/i];
const LOW_VALUE_DISCUSSION_TERMS = [
  /\bapplication\s+not\s+complete\b/i,
  /\bwrong\s+entered\b/i,
  /\bwrong\s+email\b/i,
  /\bkyc\b/i,
  /\bcibil\b/i,
  /\bcustomer\s+care\b/i,
  /\bcall\s+center\b/i,
  /\btracking\b/i,
  /\bstatus\b/i
];

const GENERIC_ALIASES = new Set([
  "ace",
  "air",
  "cashback",
  "classic",
  "elite",
  "freedom",
  "gold",
  "icon",
  "infinite",
  "legend",
  "millennia",
  "platinum",
  "premier",
  "privilege",
  "rewards",
  "select",
  "signature",
  "smart",
  "wealth",
  "white",
  "wow"
]);

const STOP_WORDS = new Set([
  "about",
  "account",
  "after",
  "also",
  "and",
  "another",
  "bank",
  "card",
  "cards",
  "credit",
  "from",
  "have",
  "help",
  "into",
  "need",
  "required",
  "some",
  "take",
  "that",
  "the",
  "their",
  "this",
  "with",
  "your"
]);

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value = "") {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3)
    .filter((token) => !STOP_WORDS.has(token));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function patternMatches(patterns, text) {
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source.replace(/\\b|\(\?:|\)|\?|\^|\$/g, ""));
}

function loadCardCatalog() {
  try {
    return readdirSync(CARD_DATA_DIR)
      .filter((name) => name.endsWith(".json"))
      .flatMap((name) => JSON.parse(readFileSync(path.join(CARD_DATA_DIR, name), "utf8")));
  } catch {
    return [];
  }
}

function cardAliases(card) {
  const name = normalize(card.name);
  const withoutCreditCard = normalize(card.name.replace(/\bcredit\s+card\b/gi, ""));
  const withoutIssuer = normalize(
    card.name
      .replace(new RegExp(String(card.issuer).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
      .replace(/\bcredit\s+card\b/gi, "")
  );
  const idWords = normalize(String(card.id).replace(/-/g, " "));

  return unique([name, withoutCreditCard, withoutIssuer, idWords])
    .filter((alias) => alias.length >= 4)
    .filter((alias) => {
      const tokens = alias.split(" ");
      if (tokens.length > 1) return true;
      return !GENERIC_ALIASES.has(alias);
    });
}

function buildAliasFrequency(catalog) {
  const frequency = new Map();

  for (const card of catalog) {
    for (const alias of cardAliases(card)) {
      if (alias.split(" ").length === 1) {
        frequency.set(alias, (frequency.get(alias) ?? 0) + 1);
      }
    }
  }

  return frequency;
}

export function matchCardsForSignal(text, catalog = loadCardCatalog()) {
  const normalizedText = normalize(text);
  const aliasFrequency = buildAliasFrequency(catalog);

  return catalog
    .map((card) => {
      const issuer = normalize(card.issuer);
      const hasIssuer = Boolean(issuer && normalizedText.includes(issuer));
      let score = hasIssuer ? 2 : 0;

      for (const alias of cardAliases(card)) {
        const aliasTokens = alias.split(" ");
        if (aliasTokens.length === 1 && (aliasFrequency.get(alias) ?? 0) > 1 && !hasIssuer) continue;
        if (normalizedText.includes(alias)) score = Math.max(score, alias === normalize(card.name) ? 15 : 10);
      }

      const nameTokens = normalize(card.name)
        .split(" ")
        .filter((token) => token.length >= 4)
        .filter((token) => !["bank", "credit", "card"].includes(token));
      score += nameTokens.filter((token) => normalizedText.includes(token)).length;

      return {
        cardId: card.id,
        cardName: card.name,
        issuer: card.issuer,
        score
      };
    })
    .filter((match) => match.score >= 6)
    .sort((left, right) => right.score - left.score || left.cardName.localeCompare(right.cardName))
    .slice(0, 5);
}

export function scoreCommunityItem(item, catalog = loadCardCatalog()) {
  const text = `${item.title ?? ""} ${item.forum ?? ""} ${item.text ?? ""}`;
  const title = String(item.title ?? "");
  const strongMatches = patternMatches(STRONG_CARD_TERMS, text);
  const highSignalMatches = patternMatches(HIGH_SIGNAL_TERMS, text);
  const issuerMatches = patternMatches(ISSUER_TERMS, text);
  const noiseMatches = patternMatches(NOISE_TERMS, text);
  const lowValueMatches = patternMatches(LOW_VALUE_DISCUSSION_TERMS, text);
  const cardMatches = matchCardsForSignal(text, catalog);
  const titleLooksGenericNoise = GENERIC_NOISE_TITLES.some((pattern) => pattern.test(title.trim()));
  const hasHighSignal = highSignalMatches.length > 0 || /devaluation|launch|ltf|effective|revised|redemption|criteria/i.test(text);

  let score = 0;
  score += strongMatches.length * 3;
  score += highSignalMatches.length * 2;
  score += issuerMatches.length;
  score += cardMatches.length > 0 ? 5 : 0;
  score -= noiseMatches.length * 4;
  score -= lowValueMatches.length * 3;
  if (titleLooksGenericNoise) score -= 8;
  if (/\bcard\b/i.test(text) && !/\bcredit\s*card\b|\bcc\b/i.test(text)) score -= 1;

  const hasStrongCardTerm = strongMatches.length > 0;
  const hasCardMatchWithSignal = cardMatches.length > 0 && (hasHighSignal || hasStrongCardTerm);

  const isRelevantCreditCardSignal =
    score >= 5 &&
    (hasStrongCardTerm || hasCardMatchWithSignal) &&
    !titleLooksGenericNoise &&
    lowValueMatches.length === 0;

  return {
    score,
    isRelevantCreditCardSignal,
    matchedKeywords: unique([...strongMatches, ...highSignalMatches, ...issuerMatches]).slice(0, 10),
    excludedReasons: unique([...noiseMatches, ...lowValueMatches]),
    cardMatches
  };
}

export function isCommentRelevantToThread(threadTitle, commentText, catalog = loadCardCatalog()) {
  const threadMatches = matchCardsForSignal(threadTitle, catalog).map((match) => match.cardId);
  const commentMatches = matchCardsForSignal(commentText, catalog).map((match) => match.cardId);
  const sharedCardIds = threadMatches.filter((cardId) => commentMatches.includes(cardId));

  if (sharedCardIds.length > 0) {
    return {
      isRelevant: true,
      overlapReason: "shared-card-match",
      sharedTerms: sharedCardIds
    };
  }

  const titleTokens = tokenize(threadTitle);
  const commentTokens = tokenize(commentText);
  const sharedTerms = titleTokens.filter((token) => commentTokens.includes(token));

  if (sharedTerms.length >= 2) {
    return {
      isRelevant: true,
      overlapReason: "shared-topic-terms",
      sharedTerms
    };
  }

  return {
    isRelevant: false,
    overlapReason: "comment-topic-mismatch",
    sharedTerms
  };
}

function discussionDetailsForItem(item, scoring, signalType) {
  const matchedCards = scoring.cardMatches.map((match) => match.cardName);
  const detailParts = [];

  if (signalType === "terms-change") detailParts.push("Possible terms, fee, reward, or charge change.");
  if (signalType === "launch-or-offer") detailParts.push("Possible launch, LTF path, approval route, or acquisition offer.");
  if (signalType === "merchant-reward-behavior") detailParts.push("Possible merchant or MCC reward behavior.");
  if (signalType === "lounge") detailParts.push("Possible lounge-access change or datapoint.");
  if (matchedCards.length > 0) detailParts.push(`Matched cards: ${matchedCards.join(", ")}.`);
  if (scoring.matchedKeywords.length > 0) detailParts.push(`Signals: ${scoring.matchedKeywords.slice(0, 5).join(", ")}.`);

  const snippet = String(item.text).replace(/\s+/g, " ").trim();
  if (snippet) detailParts.push(`Snippet: ${snippet.slice(0, 260)}${snippet.length > 260 ? "..." : ""}`);

  return detailParts.join(" ");
}

function sourcePriority(item) {
  if (item.sourceType === "thread" && item.isRecentlyCreatedThread) return 2;
  if (item.sourceType === "thread") return 1;
  return 0;
}

export function classifySignal(text) {
  if (/devaluation|effective|validity|reward.*valid|cashback.*credited|revised|charges?|fee|gst|mitc/i.test(text)) {
    return "terms-change";
  }
  if (/launched|launching|new .*card|received|ltf|lifetime free|approved|upgrade/i.test(text)) return "launch-or-offer";
  if (/merchant|mcc|asspl|cashback issue|reward.*not|not credited|not posting/i.test(text)) return "merchant-reward-behavior";
  if (/lounge|priority pass/i.test(text)) return "lounge";
  return "discussion";
}

export function dedupeByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.url ?? item.threadUrl ?? item.postUrl ?? "").replace(/\/latest$/, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function summarizeSignals(threads, comments, catalog = loadCardCatalog()) {
  const sourceItems = [
    ...threads.map((thread) => ({
      sourceType: "thread",
      title: thread.title,
      url: thread.url,
      timestamp: thread.latestTimestamp,
      createdTimestamp: thread.createdTimestamp,
      isRecentlyCreatedThread: Boolean(thread.isRecentlyCreatedThread),
      forum: thread.forum,
      text: `${thread.title} ${thread.forum}`
    })),
    ...comments.map((comment) => ({
      sourceType: "comment",
      title: comment.threadTitle,
      url: comment.postUrl,
      timestamp: comment.timestamp,
      createdTimestamp: comment.timestamp,
      isRecentlyCreatedThread: false,
      forum: "",
      text: comment.text
    }))
  ];

  const seen = new Set();

  return sourceItems
    .map((item) => ({
      item,
      scoring: scoreCommunityItem(item, catalog),
      signalType: classifySignal(`${item.title} ${item.text}`)
    }))
    .filter(({ scoring }) => scoring.isRelevantCreditCardSignal)
    .sort(
      (left, right) =>
        sourcePriority(right.item) - sourcePriority(left.item) ||
        right.scoring.score - left.scoring.score ||
        right.item.timestamp - left.item.timestamp
    )
    .filter(({ item, signalType }) => {
      const key = normalize(item.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ item, scoring, signalType }) => ({
      title: item.title.replace(/\s+\|\s+TechnoFino.*$/i, ""),
      url: item.url,
      signalType,
      candidateText: String(item.text).slice(0, 500),
      discussionDetails: discussionDetailsForItem(item, scoring, signalType),
      publishedAt: new Date(item.timestamp * 1000).toISOString().slice(0, 10),
      sourceType: item.sourceType,
      createdAt: item.createdTimestamp ? new Date(item.createdTimestamp * 1000).toISOString().slice(0, 10) : undefined,
      isRecentlyCreatedThread: Boolean(item.isRecentlyCreatedThread),
      relevanceScore: scoring.score,
      matchedKeywords: scoring.matchedKeywords,
      candidateCardIds: scoring.cardMatches.map((match) => match.cardId),
      candidateCards: scoring.cardMatches.map((match) => ({
        cardId: match.cardId,
        name: match.cardName,
        issuer: match.issuer
      })),
      requiresOfficialVerification: true,
      approvedForCardDb: false,
      approvedForCardContent: false
    }));
}
