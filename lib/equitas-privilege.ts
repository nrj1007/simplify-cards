import type { CreditCard } from "./types";

export type EquitasPrivilegeTier = "Blue" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type EquitasPrivilegeTierDefinition = {
  tier: EquitasPrivilegeTier;
  monthlySpend: number;
  quarterlySpend: number;
};

export const EQUITAS_PRIVILEGE_TIERS: EquitasPrivilegeTierDefinition[] = [
  { tier: "Blue", monthlySpend: 0, quarterlySpend: 0 },
  { tier: "Silver", monthlySpend: 20000, quarterlySpend: 60000 },
  { tier: "Gold", monthlySpend: 40000, quarterlySpend: 120000 },
  { tier: "Platinum", monthlySpend: 60000, quarterlySpend: 180000 },
  { tier: "Diamond", monthlySpend: 100000, quarterlySpend: 300000 }
];

export const EQUITAS_PRIVILEGE_BENEFITS = [
  "Higher reward redemption value",
  "Bonus reward points",
  "Movie and shopping vouchers worth ₹250",
  "Golf benefits",
  "One-way flight booking worth ₹3,000",
  "Hotel room night worth ₹3,500"
] as const;

export const EQUITAS_PRIVILEGE_URL = "https://equitas.bank.in/privilege-program/";

export function isEquitasPrivilegeCard(card: CreditCard) {
  return card.issuer === "Equitas Small Finance Bank";
}

export function equitasPrivilegeTierForMonthlySpend(monthlySpend: number): EquitasPrivilegeTier {
  if (monthlySpend >= 100000) return "Diamond";
  if (monthlySpend >= 60000) return "Platinum";
  if (monthlySpend >= 40000) return "Gold";
  if (monthlySpend >= 20000) return "Silver";
  return "Blue";
}

export function equitasPrivilegeTierNote(tier: EquitasPrivilegeTier) {
  if (tier === "Blue") {
    return "Considering Blue tier based on the current monthly spend. Higher tiers require the relevant monthly threshold to be met in all three months of each calendar quarter.";
  }

  return `Considering ${tier} tier assumes your total spend is distributed evenly and the monthly threshold is met in all three months of each calendar quarter.`;
}
