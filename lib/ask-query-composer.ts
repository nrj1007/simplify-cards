export const ASK_MATTER_CHIPS = ["Travel", "Cashback", "Lounge access", "Low annual fee"] as const;

export type AskMatterChip = (typeof ASK_MATTER_CHIPS)[number];

export const ASK_SPEND_CHIPS = [
  { label: "Under ₹25k", queryText: "under ₹25k" },
  { label: "₹25k-75k", queryText: "₹25k-75k" },
  { label: "₹75k+", queryText: "₹75k+" }
] as const;

export type AskSpendChip = (typeof ASK_SPEND_CHIPS)[number];

const generatedMatterSuffix = /(?:\s+for\s+(?:travel|cashback|(?:airport\s+)?lounge(?:\s+access)?|low\s+annual\s+fee))+\s*$/i;
const matterPhrase = /\b(?:airport\s+)?lounge(?:\s+access)?\b|\bcashback\b|\btravel\b/i;
const annualFeeConstraint = /\b(?:under|below|up\s*to|upto)\s+(?:(?:rs|inr)\.?\s*|₹\s*)?[\d,]+k?\s*(?:annual\s+)?fees?\b/i;
const generatedSpendClause = /\s+with\s+(?:monthly\s+)?spend\s+(?:under\s+)?(?:(?:rs|inr)\.?\s*|₹\s*)?[\d,]+k?(?:\s*(?:-|–|to)\s*(?:(?:rs|inr)\.?\s*|₹\s*)?[\d,]+k?|\s*\+)?\s*$/i;

const matterQueryText: Record<Exclude<AskMatterChip, "Low annual fee">, string> = {
  Travel: "travel",
  Cashback: "cashback",
  "Lounge access": "lounge access"
};

function cleanQuery(query: string) {
  return query
    .replace(/\s+/g, " ")
    .replace(/\s+([,?.!])/g, "$1")
    .trim();
}

function appendClause(query: string, clause: string) {
  const trimmed = cleanQuery(query).replace(/[?.!]+$/, "");
  return cleanQuery(`${trimmed || "Best card"} ${clause}`);
}

export function applyMatterChip(query: string, chip: AskMatterChip) {
  const withoutLegacySuffix = cleanQuery(query).replace(generatedMatterSuffix, "").trim();

  if (chip === "Low annual fee") {
    if (annualFeeConstraint.test(withoutLegacySuffix)) {
      return cleanQuery(withoutLegacySuffix.replace(annualFeeConstraint, "under ₹1000 annual fee"));
    }
    return appendClause(withoutLegacySuffix, "under ₹1000 annual fee");
  }

  const replacement = matterQueryText[chip];
  if (matterPhrase.test(withoutLegacySuffix)) {
    return cleanQuery(withoutLegacySuffix.replace(matterPhrase, replacement));
  }

  return appendClause(withoutLegacySuffix, `for ${replacement}`);
}

export function applySpendChip(query: string, chip: AskSpendChip) {
  const withoutExistingSpend = cleanQuery(query).replace(generatedSpendClause, "").trim();
  return appendClause(withoutExistingSpend, `with monthly spend ${chip.queryText}`);
}

export function isMatterChipActive(query: string, chip: AskMatterChip) {
  const normalized = query.toLowerCase();
  if (chip === "Low annual fee") {
    return /under\s+(?:₹\s*|rs\.?\s*|inr\.?\s*)?1,?000\s+(?:annual\s+)?fee/.test(normalized);
  }

  const expected = matterQueryText[chip];
  if (chip === "Lounge access") return /\blounge(?:\s+access)?\b/.test(normalized);
  return new RegExp(`\\b${expected}\\b`).test(normalized);
}

export function isSpendChipActive(query: string, chip: AskSpendChip) {
  const normalized = query.toLowerCase().replace(/\s+/g, " ");
  if (chip.label === "Under ₹25k") {
    return /monthly spend under (?:₹\s*|rs\.?\s*|inr\.?\s*)?25k\b/.test(normalized);
  }
  if (chip.label === "₹25k-75k") {
    return /monthly spend (?:₹\s*|rs\.?\s*|inr\.?\s*)?25k\s*(?:-|–|to)\s*(?:₹\s*|rs\.?\s*|inr\.?\s*)?75k\b/.test(normalized);
  }
  return /monthly spend (?:₹\s*|rs\.?\s*|inr\.?\s*)?75k\s*\+/.test(normalized);
}
