// Parses the reward-currency units-per-Rs-100 out of a human `displayRate` string such as
// "72 Reward Points / Rs 200 spent (12X)" or "10 Membership Rewards Points / Rs 50 spent,
// then 2 points / Rs 50". This is the single source of truth for that parse, used by the
// reward-rate migration script and the card validator. The runtime engines do NOT call this:
// `reward.rate` is the canonical earn rate (units per Rs 100), kept consistent with `displayRate`
// by the validator. `displayRate` is display-only.

export type ParsedDisplayRate = {
  /** Reward-currency units earned per Rs 100 of spend (base, pre-cap). */
  basePerRs100: number;
  /** Reduced units per Rs 100 after a cap, when the displayRate has a "then …/Rs …" clause. */
  postCapPerRs100: number | null;
};

export function parseDisplayRateUnits(displayRate: string | undefined): ParsedDisplayRate | null {
  if (!displayRate) return null;

  const normalized = displayRate.replace(/,/g, "");
  const spendCurrencyPattern = String.raw`(?:rs|inr|₹)`;
  const firstMatch = normalized.match(
    new RegExp(String.raw`(\d+(?:\.\d+)?)\s+[a-z ]+?\/\s*${spendCurrencyPattern}\s*(\d+(?:\.\d+)?)`, "i")
  );
  if (!firstMatch) return null;

  const units = Number(firstMatch[1]);
  const spend = Number(firstMatch[2]);
  if (!units || !spend || Number.isNaN(units) || Number.isNaN(spend)) return null;

  const basePerRs100 = (units * 100) / spend;

  const tail = normalized.slice(firstMatch.index! + firstMatch[0].length);
  const thenMatch = tail.match(
    new RegExp(String.raw`then\s+(\d+(?:\.\d+)?)\s+[a-z ]+?\/\s*${spendCurrencyPattern}\s*(\d+(?:\.\d+)?)`, "i")
  );
  if (!thenMatch) {
    return { basePerRs100, postCapPerRs100: null };
  }

  const postUnits = Number(thenMatch[1]);
  const postSpend = Number(thenMatch[2]);
  if (!postUnits || !postSpend || Number.isNaN(postUnits) || Number.isNaN(postSpend)) {
    return { basePerRs100, postCapPerRs100: null };
  }

  return {
    basePerRs100,
    postCapPerRs100: (postUnits * 100) / postSpend
  };
}
