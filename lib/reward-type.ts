import type { CreditCard } from "./types";

export function rewardTypeIncludesCashback(rewardType: string | undefined): boolean {
  return /cashback/i.test(rewardType ?? "");
}

export function cardRewardTypeIncludesCashback(card: Pick<CreditCard, "rewardType">): boolean {
  return rewardTypeIncludesCashback(card.rewardType);
}
