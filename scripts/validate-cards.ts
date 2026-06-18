import fs from "node:fs";
import path from "node:path";
import { EXCLUSION_CODES, type ExclusionCode } from "../lib/exclusion-constants";
import { parseDisplayRateUnits } from "../lib/reward-rate-parse";

// `reward.rate` is the canonical earn rate (units per Rs 100) and must stay numerically consistent
// with the human `displayRate` so the two never silently diverge again. Rows here are known, reviewed
// exceptions where the displayRate text is intentionally inconsistent with the (correct) rate. Kept
// in sync with DISPLAYRATE_SKIP in scripts/normalize-reward-rates.ts.
const RATE_DISPLAY_MISMATCH_ALLOWLIST = new Set([
  "hdfc-diners-club-black-metal::smartbuy hotels",
  "hdfc-diners-club-black-metal::smartbuy flights"
]);

function isCashbackRewardType(rewardType: unknown) {
  return typeof rewardType === "string" && /cashback/i.test(rewardType) && !/point|mile|coin|star|credit|neucoin/i.test(rewardType);
}

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
// Cards are stored one JSON object per file under data/cards/<issuer>/<card-id>.json.
const cardFiles = fs
  .readdirSync(cardsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((issuerDir) =>
    fs
      .readdirSync(path.join(cardsDir, issuerDir.name))
      .filter((name) => name.endsWith(".json"))
      .map((name) => path.join(issuerDir.name, name))
  )
  .sort();
const cards = cardFiles.flatMap((file) => {
  const filePath = path.join(cardsDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed) || typeof parsed !== "object" || parsed === null) {
    addIssue(`${path.join("data", "cards", file)} must contain a single card object`);
    return [];
  }

  return [{ card: parsed as CardLike, file }];
});

const allowedLoungeValues = new Set(["unlimited"]);
const allowedMilestonePeriods = new Set(["annual", "quarterly", "monthly"]);
const allowedMilestoneKinds = new Set(["voucher", "points", "cashback", "other"]);
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
  "ikea",
  "irctc",
  "international",
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

function hasUserVerifiedNote(value: unknown) {
  return isStringArray(value) && value.some((note) => /card details manually reviewed and verified by user on \d{4}-\d{2}-\d{2}/i.test(note));
}

function normalizeVisibleText(value: string) {
  return value
    .toLowerCase()
    .replace(/rs\./g, "rs")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePartnerText(value: string) {
  return normalizeVisibleText(value)
    .replace(/\ball\b/g, "")
    .replace(/\bclub\b/g, "")
    .replace(/\bhotels?\b/g, "")
    .replace(/\brewards?\b/g, "")
    .replace(/\blive limitless\b/g, "")
    .replace(/\binternational\b/g, "")
    .replace(/\bairways\b/g, "")
    .replace(/\bairlines?\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function partnerNamesForCalculatorValidation(redemption: CardLike) {
  const names = new Set<string>();
  const airlinePartners = redemption.airlinePartners;
  const hotelPartners = redemption.hotelPartners;

  if (Array.isArray(airlinePartners)) {
    for (const partner of airlinePartners) {
      if (!isObject(partner)) continue;
      if (isNonEmptyString(partner.airline)) names.add(normalizePartnerText(partner.airline));
      if (isNonEmptyString(partner.programme)) names.add(normalizePartnerText(partner.programme));
    }
  }

  if (Array.isArray(hotelPartners)) {
    for (const partner of hotelPartners) {
      if (!isObject(partner)) continue;
      if (isNonEmptyString(partner.hotelGroup)) names.add(normalizePartnerText(partner.hotelGroup));
      if (isNonEmptyString(partner.programme)) names.add(normalizePartnerText(partner.programme));
    }
  }

  return names;
}

function partnerMatchesSupportedSet(partner: string, supported: Set<string>) {
  const normalized = normalizePartnerText(partner);
  if (!normalized) return false;
  if (supported.has(normalized)) return true;

  for (const candidate of supported) {
    if (!candidate) continue;
    if (candidate.includes(normalized) || normalized.includes(candidate)) return true;
  }

  return false;
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

    if (card.status !== undefined && card.status !== "active" && card.status !== "discontinued") {
      addIssue("status must be 'active' or 'discontinued' when present", cardId, "status");
    }

    if (card.rewardLiquidity !== undefined && card.rewardLiquidity !== "cash" && card.rewardLiquidity !== "brand-locked") {
      addIssue("rewardLiquidity must be 'cash' or 'brand-locked' when present", cardId, "rewardLiquidity");
    }

    if (
      card.rewardLiquidityFactor !== undefined &&
      (typeof card.rewardLiquidityFactor !== "number" || card.rewardLiquidityFactor <= 0 || card.rewardLiquidityFactor > 1)
    ) {
      addIssue("rewardLiquidityFactor must be a number in (0, 1] when present", cardId, "rewardLiquidityFactor");
    }

    if (card.capGroups !== undefined) {
      const capGroups = card.capGroups as Record<string, unknown>;
      if (typeof capGroups !== "object" || capGroups === null || Array.isArray(capGroups)) {
        addIssue("capGroups must be an object mapping group id to { capMonthly }", cardId, "capGroups");
      } else {
        for (const [groupId, def] of Object.entries(capGroups)) {
          const capMonthly = (def as { capMonthly?: unknown } | null)?.capMonthly;
          if (typeof capMonthly !== "number" || capMonthly < 0) {
            addIssue(`capGroups.${groupId}.capMonthly must be a number >= 0`, cardId, "capGroups");
          }
        }
      }
    }

    if (card.categoryFocusTags !== undefined) {
      // Keep in sync with categoryFocusConfigs keys in lib/recommend.ts.
      const allowedCategoryFocusKeys = new Set([
        "dining",
        "grocery",
        "online",
        "entertainment",
        "amazon",
        "flipkart",
        "swiggy"
      ]);
      if (!Array.isArray(card.categoryFocusTags)) {
        addIssue("categoryFocusTags must be an array of category keys when present", cardId, "categoryFocusTags");
      } else {
        for (const tag of card.categoryFocusTags) {
          if (typeof tag !== "string" || !allowedCategoryFocusKeys.has(tag)) {
            addIssue(
              `categoryFocusTags entry "${String(tag)}" is not a valid category key (${[...allowedCategoryFocusKeys].join(", ")})`,
              cardId,
              "categoryFocusTags"
            );
          }
        }
      }
    }

    const redemption = card.redemption as { pointValueTiers?: unknown } | undefined;
    const pointValueTiers = redemption?.pointValueTiers;
    if (pointValueTiers !== undefined) {
      if (!Array.isArray(pointValueTiers) || pointValueTiers.length === 0) {
        addIssue("redemption.pointValueTiers must be a non-empty array when present", cardId, "redemption");
      } else {
        for (const [tierIndex, entry] of pointValueTiers.entries()) {
          const tier = entry as { minMonthlySpend?: unknown; value?: unknown };
          if (typeof tier.minMonthlySpend !== "number" || tier.minMonthlySpend < 0) {
            addIssue(`redemption.pointValueTiers[${tierIndex}].minMonthlySpend must be a number >= 0`, cardId, "redemption");
          }
          if (typeof tier.value !== "number" || tier.value <= 0) {
            addIssue(`redemption.pointValueTiers[${tierIndex}].value must be a number > 0`, cardId, "redemption");
          }
        }
      }
    }

    if (card.acceleratedShare !== undefined) {
      const share = card.acceleratedShare as Record<string, unknown>;
      if (typeof share !== "object" || share === null || Array.isArray(share)) {
        addIssue("acceleratedShare must be an object mapping spend categories to a number in [0, 1]", cardId, "acceleratedShare");
      } else {
        for (const [cat, value] of Object.entries(share)) {
          if (typeof value !== "number" || value < 0 || value > 1) {
            addIssue(`acceleratedShare.${cat} must be a number in [0, 1]`, cardId, "acceleratedShare");
          }
        }
      }
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

    if (hasUserVerifiedNote(card.internalNotes) && !isNonEmptyString(card.imageUrl)) {
      addIssue('cards marked "verified by user" in internalNotes must include an imageUrl', cardId, "imageUrl");
    }

    if (
      hasUserVerifiedNote(card.internalNotes) &&
      (!Array.isArray(card.exclusionCodes) || !card.exclusionCodes.every(isNonEmptyString) || card.exclusionCodes.length === 0)
    ) {
      addIssue('cards marked "verified by user" in internalNotes must include mapped exclusionCodes', cardId, "exclusionCodes");
    }

    if (hasUserVerifiedNote(card.internalNotes)) {
      const visibleFields = ["milestoneBenefits", "joiningBenefits", "renewalBenefits", "additionalBenefits", "additionalDetails"] as const;
      const seenVisibleText = new Map<string, string>();

      for (const field of visibleFields) {
        const items = card[field];
        if (!isStringArray(items)) continue;

        for (const item of items) {
          const normalized = normalizeVisibleText(item);
          if (!normalized) continue;

          const firstField = seenVisibleText.get(normalized);
          if (firstField) {
            addIssue(`verified-by-user cards must not duplicate visible text across sections (${firstField} and ${field})`, cardId, field);
            break;
          }
          seenVisibleText.set(normalized, field);
        }
      }

      if (isStringArray(card.exclusions)) {
        const exclusionText = new Set(card.exclusions.map(normalizeVisibleText));
        for (const field of visibleFields) {
          const items = card[field];
          if (!isStringArray(items)) continue;
          if (items.some((item) => exclusionText.has(normalizeVisibleText(item)))) {
            addIssue("verified-by-user cards must not repeat exclusions in visible sections", cardId, field);
          }
        }
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

    if (card.lounge !== undefined) {
      if (!isObject(card.lounge)) {
        addIssue("must be an object with optional domestic/international/combined string arrays", cardId, "lounge");
      } else {
        for (const bucket of ["domestic", "international", "combined"] as const) {
          const value = (card.lounge as CardLike)[bucket];
          if (value !== undefined && !isStringArray(value)) {
            addIssue(`lounge.${bucket} must be an array of strings`, cardId, "lounge");
          }
        }
      }
    }

    if (card.milestones !== undefined) {
      if (!Array.isArray(card.milestones)) {
        addIssue("must be an array of milestone objects when present", cardId, "milestones");
      } else {
        card.milestones.forEach((milestone, index) => {
          const field = `milestones[${index}]`;
          if (!isObject(milestone)) {
            addIssue("must be an object with threshold/period/value/kind/label", cardId, field);
            return;
          }
          if (!isMoneyNumber(milestone.threshold)) addIssue("threshold must be a non-negative number", cardId, field);
          if (!isMoneyNumber(milestone.value)) addIssue("value must be a non-negative number", cardId, field);
          if (!allowedMilestonePeriods.has(milestone.period as string)) {
            addIssue('period must be "annual", "quarterly", or "monthly"', cardId, field);
          }
          if (!allowedMilestoneKinds.has(milestone.kind as string)) {
            addIssue('kind must be "voucher", "points", "cashback", or "other"', cardId, field);
          }
          if (!isNonEmptyString(milestone.label)) addIssue("label must be a non-empty string", cardId, field);
        });
      }
    }

    for (const valuedField of ["joiningBenefitsValued", "renewalBenefitsValued"] as const) {
      const value = card[valuedField];
      if (value === undefined) continue;
      if (!Array.isArray(value)) {
        addIssue("must be an array of valued-benefit objects when present", cardId, valuedField);
        continue;
      }
      value.forEach((benefit, index) => {
        const field = `${valuedField}[${index}]`;
        if (!isObject(benefit)) {
          addIssue("must be an object with value/kind/label", cardId, field);
          return;
        }
        if (!isMoneyNumber(benefit.value)) addIssue("value must be a non-negative number", cardId, field);
        if (!allowedMilestoneKinds.has(benefit.kind as string)) {
          addIssue('kind must be "voucher", "points", "cashback", or "other"', cardId, field);
        }
        if (!isNonEmptyString(benefit.label)) addIssue("label must be a non-empty string", cardId, field);
      });
    }

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

        if (
          reward.valuePerUnit !== undefined &&
          (typeof reward.valuePerUnit !== "number" || !Number.isFinite(reward.valuePerUnit) || reward.valuePerUnit <= 0)
        ) {
          addIssue(`reward ${rewardIndex} valuePerUnit must be a positive number when present`, cardId, "rewards");
        }

        if (reward.tierScope !== undefined && reward.tierScope !== "category" && reward.tierScope !== "total-monthly-spend") {
          addIssue(`reward ${rewardIndex} tierScope must be 'category' or 'total-monthly-spend' when present`, cardId, "rewards");
        }

        if (reward.capGroup !== undefined && !isNonEmptyString(reward.capGroup)) {
          addIssue(`reward ${rewardIndex} capGroup must be a non-empty string when present`, cardId, "rewards");
        }

        if (typeof reward.rate !== "number" || !Number.isFinite(reward.rate) || reward.rate < 0) {
          addIssue(`reward ${rewardIndex} rate must be a non-negative number`, cardId, "rewards");
        } else if (!isCashbackRewardType(card.rewardType)) {
          // `rate` is units per Rs 100; for non-cashback rows with a parseable displayRate it must
          // match the displayRate-implied units so the calculator and recommend.ts never diverge.
          const parsed = parseDisplayRateUnits(typeof reward.displayRate === "string" ? reward.displayRate : undefined);
          const allowlisted = RATE_DISPLAY_MISMATCH_ALLOWLIST.has(`${cardId}::${reward.category}`);
          if (parsed && !allowlisted) {
            if (Math.abs(parsed.basePerRs100 - reward.rate) > 0.01) {
              addIssue(
                `reward ${rewardIndex} rate (${reward.rate}) disagrees with displayRate-implied units (${parsed.basePerRs100.toFixed(3)} from "${reward.displayRate}"); run npm run normalize:reward-rates`,
                cardId,
                "rewards"
              );
            }
            if (
              parsed.postCapPerRs100 != null &&
              typeof reward.postCapRate === "number" &&
              Math.abs(parsed.postCapPerRs100 - reward.postCapRate) > 0.01
            ) {
              addIssue(
                `reward ${rewardIndex} postCapRate (${reward.postCapRate}) disagrees with displayRate "then" units (${parsed.postCapPerRs100.toFixed(3)})`,
                cardId,
                "rewards"
              );
            }
          }
        }

        if (reward.capMonthly !== null && !isMoneyNumber(reward.capMonthly)) {
          addIssue(`reward ${rewardIndex} capMonthly must be a non-negative number or null`, cardId, "rewards");
        }

        if (reward.capDaily !== undefined && reward.capDaily !== null && !isMoneyNumber(reward.capDaily)) {
          addIssue(`reward ${rewardIndex} capDaily must be a non-negative number or null`, cardId, "rewards");
        }

        if (
          reward.capStatementQuarter !== undefined &&
          reward.capStatementQuarter !== null &&
          !isMoneyNumber(reward.capStatementQuarter)
        ) {
          addIssue(`reward ${rewardIndex} capStatementQuarter must be a non-negative number or null`, cardId, "rewards");
        }

        // Spend-tier bounds: tierLowerBound is a non-negative number; tierUpperBound is null or a
        // number strictly greater than the lower bound.
        if (reward.tierLowerBound !== undefined) {
          const lower = reward.tierLowerBound;
          if (typeof lower !== "number" || !Number.isFinite(lower) || lower < 0) {
            addIssue(`reward ${rewardIndex} tierLowerBound must be a non-negative number`, cardId, "rewards");
          } else {
            const upper = reward.tierUpperBound;
            if (
              upper !== undefined &&
              upper !== null &&
              (typeof upper !== "number" || !Number.isFinite(upper) || upper <= lower)
            ) {
              addIssue(`reward ${rewardIndex} tierUpperBound must be null or greater than tierLowerBound`, cardId, "rewards");
            }
          }
        } else if (reward.tierUpperBound !== undefined) {
          addIssue(`reward ${rewardIndex} has tierUpperBound without tierLowerBound`, cardId, "rewards");
        }
      });
    }

    if (card.redemption !== undefined) {
      if (!isObject(card.redemption)) {
        addIssue("must be an object when present", cardId, "redemption");
      } else {
        const redemption = card.redemption;

        if ((redemption.ecosystemLabel === undefined) !== (redemption.ecosystemValue === undefined)) {
          addIssue("ecosystemLabel and ecosystemValue must either both be present or both be omitted", cardId, "redemption");
        }

        const supportedPartnerNames = partnerNamesForCalculatorValidation(redemption);
        const partnerValuations = redemption.transferPartnerValuations;
        if (Array.isArray(partnerValuations)) {
          partnerValuations.forEach((partner, partnerIndex) => {
            if (!isObject(partner) || !isNonEmptyString(partner.partner)) {
              addIssue(`transferPartnerValuations[${partnerIndex}] partner must be a non-empty string`, cardId, "redemption");
              return;
            }

            if (
              supportedPartnerNames.size > 0 &&
              !partnerMatchesSupportedSet(partner.partner, supportedPartnerNames)
            ) {
              addIssue(
                `transferPartnerValuations[${partnerIndex}] partner must match a current airline or hotel transfer partner so the Reward Calculator stays aligned with the redemption tables`,
                cardId,
                "redemption"
              );
            }
          });
        }

        const voucherRedemptions = redemption.voucherRedemptions;
        if (voucherRedemptions !== undefined) {
          if (!Array.isArray(voucherRedemptions)) {
            addIssue("voucherRedemptions must be an array when present", cardId, "redemption");
          } else {
            voucherRedemptions.forEach((voucher, voucherIndex) => {
              if (!isObject(voucher)) {
                addIssue(`voucherRedemptions[${voucherIndex}] must be an object`, cardId, "redemption");
                return;
              }
              if (!isNonEmptyString(voucher.partner)) {
                addIssue(`voucherRedemptions[${voucherIndex}].partner must be a non-empty string`, cardId, "redemption");
              }
              if (!isNonEmptyString(voucher.programme)) {
                addIssue(`voucherRedemptions[${voucherIndex}].programme must be a non-empty string`, cardId, "redemption");
              }
              if (!isNonEmptyString(voucher.ratio)) {
                addIssue(`voucherRedemptions[${voucherIndex}].ratio must be a non-empty string`, cardId, "redemption");
              }
              if (typeof voucher.valuePerPoint !== "number" || voucher.valuePerPoint <= 0) {
                addIssue(`voucherRedemptions[${voucherIndex}].valuePerPoint must be a positive number`, cardId, "redemption");
              }
              if (voucher.tatDays !== undefined && (typeof voucher.tatDays !== "number" || voucher.tatDays < 0)) {
                addIssue(`voucherRedemptions[${voucherIndex}].tatDays must be a non-negative number when present`, cardId, "redemption");
              }
              if (voucher.note !== undefined && !isNonEmptyString(voucher.note)) {
                addIssue(`voucherRedemptions[${voucherIndex}].note must be a non-empty string when present`, cardId, "redemption");
              }
            });
          }
        }

        const hasAccorPartnerValuation =
          Array.isArray(partnerValuations) &&
          partnerValuations.some((partner) => isObject(partner) && isNonEmptyString(partner.partner) && normalizePartnerText(partner.partner) === "accor");
        if (hasAccorPartnerValuation && typeof redemption.accorValue === "number" && redemption.accorValue > 0) {
          addIssue(
            "accorValue must not be combined with an Accor transferPartnerValuations entry because the Reward Calculator should use one source of truth",
            cardId,
            "redemption"
          );
        }
      }
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
