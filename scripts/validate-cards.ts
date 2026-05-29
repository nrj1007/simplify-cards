import fs from "node:fs";
import path from "node:path";
import { EXCLUSION_CODES, type ExclusionCode } from "../lib/exclusion-constants";

type ValidationIssue = {
  cardId?: string;
  field?: string;
  message: string;
};

type CardLike = Record<string, unknown>;

const root = process.cwd();
const issues: ValidationIssue[] = [];
const warnings: ValidationIssue[] = [];
const cardsDir = path.join(root, "data", "cards");
const cardFiles = fs
  .readdirSync(cardsDir)
  .filter((file) => file.endsWith(".json"))
  .sort();
const cards = cardFiles.flatMap((file) => {
  const filePath = path.join(cardsDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    addIssue(`${path.join("data", "cards", file)} must contain an array`);
    return [];
  }

  return parsed.map((card) => ({ card, file }));
});

const allowedLoungeValues = new Set(["unlimited"]);
const allowedVerificationStatuses = new Set([
  "official-direct",
  "official-indexed",
  "official-catalogue",
  "official-mixed",
  "needs-review"
]);
const allowedExclusionCodes = new Set(EXCLUSION_CODES);
const allowedRewardCategories = new Set([
  "airlines",
  "amazon",
  "bigbasket",
  "cleartrip",
  "departmental stores",
  "dining",
  "dining movies grocery",
  "pharmacy dining movies",
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
  "base",
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
  "smartbuy gyftr",
  "swiggy zomato",
  "tata brands",
  "tata neu",
  "travel",
  "travel with points flights",
  "travel with points hotels",
  "travel with points car rentals",
  "travel credits",
  "upi",
  "utilities",
  "utility bills",
  "rent",
  "insurance",
  "education",
  "gold",
  "government",
  "real estate"
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

if (cardFiles.length === 0) {
  addIssue("data/cards must contain at least one JSON file");
} else {
  const ids = new Set<string>();

  cards.forEach(({ card, file }, index) => {
    if (!isObject(card)) {
      addIssue(`${path.join("data", "cards", file)} card at index ${index} must be an object`);
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

    for (const optionalField of ["milestoneBenefits", "joiningBenefits", "renewalBenefits", "additionalBenefits", "additionalDetails", "internalNotes"]) {
      if (card[optionalField] !== undefined && !isStringArray(card[optionalField])) {
        addIssue("must be an array of non-empty strings when present", cardId, optionalField);
      }
    }

    if (card.exclusionCodes !== undefined) {
      if (!Array.isArray(card.exclusionCodes) || !card.exclusionCodes.every(isNonEmptyString)) {
        addIssue("must be an array of non-empty strings when present", cardId, "exclusionCodes");
      } else {
        card.exclusionCodes.forEach((code, codeIndex) => {
          if (!allowedExclusionCodes.has(code as ExclusionCode)) {
            addIssue(`exclusionCodes[${codeIndex}] must be one of the allowed exclusion constants`, cardId, "exclusionCodes");
          }
        });
      }
    }

    if (card.specialSpendRules !== undefined) {
      if (!Array.isArray(card.specialSpendRules)) {
        addIssue("must be an array when present", cardId, "specialSpendRules");
      } else {
        card.specialSpendRules.forEach((rule, ruleIndex) => {
          if (!isObject(rule)) {
            addIssue(`specialSpendRules[${ruleIndex}] must be an object`, cardId, "specialSpendRules");
            return;
          }

          if (!isNonEmptyString(rule.category)) {
            addIssue(`specialSpendRules[${ruleIndex}] category must be a non-empty string`, cardId, "specialSpendRules");
          }

          if (!isNonEmptyString(rule.treatment) || !["rewarded", "capped", "excluded"].includes(rule.treatment)) {
            addIssue(`specialSpendRules[${ruleIndex}] treatment must be rewarded, capped or excluded`, cardId, "specialSpendRules");
          }

          if (rule.capMonthlySpend !== undefined && rule.capMonthlySpend !== null && !isMoneyNumber(rule.capMonthlySpend)) {
            addIssue(`specialSpendRules[${ruleIndex}] capMonthlySpend must be a non-negative number or null`, cardId, "specialSpendRules");
          }

          if (rule.capAnnualSpend !== undefined && rule.capAnnualSpend !== null && !isMoneyNumber(rule.capAnnualSpend)) {
            addIssue(`specialSpendRules[${ruleIndex}] capAnnualSpend must be a non-negative number or null`, cardId, "specialSpendRules");
          }

          if (rule.notes !== undefined && !isNonEmptyString(rule.notes)) {
            addIssue(`specialSpendRules[${ruleIndex}] notes must be a non-empty string when present`, cardId, "specialSpendRules");
          }
        });
      }
    }

    if (card.supportingSourceUrls !== undefined) {
      if (!Array.isArray(card.supportingSourceUrls) || !card.supportingSourceUrls.every(isValidUrl)) {
        addIssue("must be an array of valid https URLs", cardId, "supportingSourceUrls");
      }
    }

    if (card.imageUrl !== undefined) {
      const isRelative = typeof card.imageUrl === "string" && card.imageUrl.startsWith("/");
      if (!isRelative && !isValidUrl(card.imageUrl)) {
        addIssue("must be a valid https URL or relative path starting with '/' when present", cardId, "imageUrl");
      }
    }

    for (const field of ["joiningFee", "annualFee", "forexMarkup"]) validateMoney(card, cardId, field);
    validateMoney(card, cardId, "feeWaiverSpend", true);

    if (
      typeof card.popularityScore !== "number" ||
      !Number.isInteger(card.popularityScore) ||
      card.popularityScore < 0 ||
      card.popularityScore > 100
    ) {
      addIssue("must be an integer between 0 and 100", cardId, "popularityScore");
    }

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
        } else {
          const rewardCategories = reward.category.split(",").map((c) => c.trim().toLowerCase());
          for (const cat of rewardCategories) {
            if (!allowedRewardCategories.has(cat)) {
              addWarning(`unknown reward category "${cat}"`, cardId, "rewards");
            }
          }
        }

        if (typeof reward.rate !== "number" || !Number.isFinite(reward.rate) || reward.rate < 0) {
          addIssue(`reward ${rewardIndex} rate must be a non-negative number`, cardId, "rewards");
        }

        if (reward.capMonthly !== null && !isMoneyNumber(reward.capMonthly)) {
          addIssue(`reward ${rewardIndex} capMonthly must be a non-negative number or null`, cardId, "rewards");
        }

        if (reward.capDaily !== undefined && reward.capDaily !== null && !isMoneyNumber(reward.capDaily)) {
          addIssue(`reward ${rewardIndex} capDaily must be a non-negative number or null`, cardId, "rewards");
        }
      });
    }

    if (card.sourceUrl !== undefined && isValidUrl(card.sourceUrl)) {
      const sourceUrl = new URL(card.sourceUrl as string);
      if (sourceUrl.search) addWarning("sourceUrl should be canonical without tracking query params", cardId, "sourceUrl");
    }

    if (Array.isArray(card.supportingSourceUrls)) {
      card.supportingSourceUrls.forEach((url, urlIndex) => {
        const supportingUrl = new URL(url);
        if (supportingUrl.search) {
          addWarning(`supportingSourceUrls[${urlIndex}] should be canonical without tracking query params`, cardId, "supportingSourceUrls");
        }
      });
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

console.log(`Card validation passed for ${cards.length} cards across ${cardFiles.length} file(s) with ${warnings.length} warning(s).`);

function formatIssue(level: "error" | "warning", issue: ValidationIssue) {
  const location = [issue.cardId, issue.field].filter(Boolean).join(".");
  return `${level}: ${location ? `${location}: ` : ""}${issue.message}`;
}
