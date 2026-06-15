import type { CreditCard } from "./types";

export type EquitasPrivilegeTier = "Blue" | "Silver" | "Gold" | "Platinum" | "Diamond";

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
