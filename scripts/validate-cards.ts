import fs from "node:fs";
import path from "node:path";

type ValidationIssue = {
  cardId?: string;
  field?: string;
  message: string;
};

type CardLike = Record<string, unknown>;

const root = process.cwd();
const cardsPath = path.join(root, "data", "cards.json");
const raw = fs.readFileSync(cardsPath, "utf8");
const cards = JSON.parse(raw) as unknown;

const issues: ValidationIssue[] = [];
const warnings: ValidationIssue[] = [];

const allowedLoungeValues = new Set(["unlimited"]);
const allowedVerificationStatuses = new Set([
  "official-direct",
  "official-indexed",
  "official-catalogue",
  "official-mixed",
  "needs-review"
]);
const allowedRewardCategories = new Set([
  "airlines",
  "amazon",
  "bigbasket",
  "cleartrip",
  "departmental stores",
  "dining",
  "dining movies grocery",
  "entertainment",
  "fuel",
  "grocery dining movies",
  "flipkart",
  "grocery",
  "groceries",
  "hotel",
  "hotels",
  "irctc",
  "lifestyle",
  "marriott",
  "myntra",
  "offline",
  "online",
  "partner merchants",
  "payzapp",
  "phonepe",
  "retail",
  "selected packs",
  "select merchants",
  "select lifestyle brands",
  "shoppers stop",
  "smartbuy",
  "smartbuy flights",
  "smartbuy hotels",
  "smartbuy train",
  "swiggy zomato",
  "tata brands",
  "tata neu",
  "travel",
  "upi",
  "utilities"
]);

function addIssue(message: string, cardId?: string, field?: string) {
  issues.push({ cardId, field, message });
}

function addWarning(message: string, cardId?: string, field?: string) {
  warnings.push({ cardId, field, message });
}

function isObject(value: unknown): value is CardLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isValidUrl(value: unknown) {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isMoneyNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validateMoney(card: CardLike, cardId: string, field: string, nullable = false) {
  const value = card[field];
  if (nullable && value === null) return;
  if (!isMoneyNumber(value)) addIssue("must be a non-negative number" + (nullable ? " or null" : ""), cardId, field);
}

function validateLounge(value: unknown, cardId: string, field: string) {
  const validNumber = typeof value === "number" && Number.isInteger(value) && value >= 0;
  const validString = typeof value === "string" && allowedLoungeValues.has(value);
  if (!validNumber && !validString) addIssue('must be a non-negative integer or "unlimited"', cardId, field);
}

function validateDate(value: unknown, cardId: string, field: string) {
  if (!isNonEmptyString(value)) {
    addIssue("must be a non-empty YYYY-MM-DD string", cardId, field);
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    addIssue("must use YYYY-MM-DD format", cardId, field);
    return;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) addIssue("must be a valid date", cardId, field);
}

if (!Array.isArray(cards)) {
  addIssue("data/cards.json must contain an array");
} else {
  const ids = new Set<string>();

  cards.forEach((card, index) => {
    if (!isObject(card)) {
      addIssue(`card at index ${index} must be an object`);
      return;
    }

    const cardId = isNonEmptyString(card.id) ? card.id : `index:${index}`;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cardId)) addIssue("must be kebab-case lowercase id", cardId, "id");
    if (ids.has(cardId)) addIssue("duplicate card id", cardId, "id");
    ids.add(cardId);

    for (const field of ["issuer", "name", "rewardType", "sourceUrl", "applyUrl", "lastVerified"]) {
      if (!isNonEmptyString(card[field])) addIssue("must be a non-empty string", cardId, field);
    }

    if (!isNonEmptyString(card.verificationStatus) || !allowedVerificationStatuses.has(card.verificationStatus)) {
      addIssue("must be one of the allowed verification statuses", cardId, "verificationStatus");
    }

    for (const field of ["network", "bestFor", "tags", "exclusions"]) {
      if (!isStringArray(card[field])) addIssue("must be an array of non-empty strings", cardId, field);
    }

    for (const field of ["joiningFee", "annualFee", "forexMarkup"]) validateMoney(card, cardId, field);
    validateMoney(card, cardId, "feeWaiverSpend", true);

    validateLounge(card.loungeDomestic, cardId, "loungeDomestic");
    validateLounge(card.loungeInternational, cardId, "loungeInternational");

    if (!isValidUrl(card.sourceUrl)) addIssue("must be a valid https URL", cardId, "sourceUrl");
    if (!isValidUrl(card.applyUrl)) addIssue("must be a valid https URL", cardId, "applyUrl");
    validateDate(card.lastVerified, cardId, "lastVerified");

    if (!Array.isArray(card.rewards) || card.rewards.length === 0) {
      addIssue("must be a non-empty reward array", cardId, "rewards");
    } else {
      card.rewards.forEach((reward, rewardIndex) => {
        if (!isObject(reward)) {
          addIssue(`reward at index ${rewardIndex} must be an object`, cardId, "rewards");
          return;
        }

        if (!isNonEmptyString(reward.category)) {
          addIssue(`reward ${rewardIndex} category must be a non-empty string`, cardId, "rewards");
        } else if (!allowedRewardCategories.has(reward.category)) {
          addWarning(`unknown reward category "${reward.category}"`, cardId, "rewards");
        }

        if (typeof reward.rate !== "number" || !Number.isFinite(reward.rate) || reward.rate < 0) {
          addIssue(`reward ${rewardIndex} rate must be a non-negative number`, cardId, "rewards");
        }

        if (reward.capMonthly !== null && !isMoneyNumber(reward.capMonthly)) {
          addIssue(`reward ${rewardIndex} capMonthly must be a non-negative number or null`, cardId, "rewards");
        }
      });
    }

    if (card.sourceUrl !== undefined && isValidUrl(card.sourceUrl)) {
      const sourceUrl = new URL(card.sourceUrl as string);
      if (sourceUrl.search) addWarning("sourceUrl should be canonical without tracking query params", cardId, "sourceUrl");
    }
  });
}

for (const warning of warnings) {
  console.warn(formatIssue("warning", warning));
}

if (issues.length > 0) {
  for (const issue of issues) console.error(formatIssue("error", issue));
  console.error(`\nCard validation failed with ${issues.length} error(s) and ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`Card validation passed for ${(cards as unknown[]).length} cards with ${warnings.length} warning(s).`);

function formatIssue(level: "error" | "warning", issue: ValidationIssue) {
  const location = [issue.cardId, issue.field].filter(Boolean).join(".");
  return `${level}: ${location ? `${location}: ` : ""}${issue.message}`;
}
