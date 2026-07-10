export const EXCLUSION_CODES = [
  "fuel",
  "rent",
  "insurance",
  "education",
  "gold",
  "jewellery",
  "utilities",
  "telecom",
  "wallet_load",
  "government",
  "tax",
  "international",
  "hospital",
  "local_transport",
  "real_estate",
  "property_management",
  "cash_advance",
  "balance_transfer",
  "outstanding_balance_payment",
  "emi",
  "fees_and_charges",
  "gaming",
  "disputed_transactions",
  "priority_pass_spend",
  "cash_withdrawal"
] as const;

export type ExclusionCode = (typeof EXCLUSION_CODES)[number];

import type { SpendCategory } from "./types";

export const SPEND_CATEGORY_EXCLUSION_CODE_MAP: Partial<Record<SpendCategory, readonly ExclusionCode[]>> = {
  fuel: ["fuel"],
  utilities: ["utilities", "telecom"],
  rent: ["rent", "real_estate", "property_management"],
  insurance: ["insurance"],
  education: ["education"],
  gold: ["gold", "jewellery"],
  international: ["international"]
} as const;
