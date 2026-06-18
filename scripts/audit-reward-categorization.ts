/**
 * Audit how each card maps spend categories to accelerated vs base rewards, and flag likely
 * mis-categorisations / mis-valuations that inflate (or deflate) a card in ranking.
 *
 * Usage:
 *   npx tsx scripts/audit-reward-categorization.ts top 10      # audit the top N ranked cards
 *   npx tsx scripts/audit-reward-categorization.ts <card-id>   # audit one card by id
 *   npx tsx scripts/audit-reward-categorization.ts hdfc        # audit every card from an issuer dir
 *
 * What it checks per reward row and per spend category:
 *   - OVER-BROAD ACCELERATOR: a broad category (online/base/dining/grocery/upi/amazon) whose
 *     displayCategory names specific brands or conditions ("weekend", "select", "Samsung",
 *     "Flipkart", "via portal", "standalone", ...). Routing all of that category to the row
 *     over-credits — usually wants a narrower category + acceleratedShare.
 *   - UNCAPPED HIGH RATE: a non-base accelerated row with rate >= 5 and no capMonthly.
 *   - MISSING POINT VALUE: non-cashback card whose redemption has no numeric value field, so the
 *     engine falls back to Rs 1/point (usually an over-valuation).
 *   - BENEFIT VALUE MISMATCH: a milestone or joining/renewal benefit denominated in points/miles
 *     whose stored rupee value doesn't match (pts x the card's own point value).
 *   - UNVALUED POINTS BENEFIT: a points/miles benefit stored with value 0 (uncounted).
 *   - SOFT PERK VALUED: an airline/hotel tier/status/upgrade carrying a rupee value (policy: these
 *     are text-only, value 0).
 *   - MISFILED RECURRING JOINING: a joiningBenefitsValued entry that reads as recurring (annual fee
 *     levy / anniversary) — joining is amortized /3, so a yearly perk filed there is under-counted.
 *   - The actual spend -> reward routing the engine produces, so categorisation can be eyeballed.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { scoreCards } from "../lib/recommend";
import type { CreditCard } from "../lib/types";

const BROAD_CATEGORIES = ["online", "base", "offline", "retail", "dining", "grocery", "upi", "amazon"];
const NARROW_SIGNALS =
  /\b(weekend|select|selected|exclusive|partner|standalone|specific|only|via (hsbc|smartbuy|portal|reward multiplier)|reward multiplier|samsung|flipkart|myntra|nykaa|tanishq|titan|apollo|bigbasket|swiggy|zomato|ajio|jiomart|croma|tata neu|cleartrip|yatra|makemytrip|plus members?)\b/i;

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (f.endsWith(".json")) out.push(p);
  }
  return out;
}

function loadAllCards(): CreditCard[] {
  return walk("data/cards").flatMap((p) => {
    try {
      return [JSON.parse(readFileSync(p, "utf8")) as CreditCard];
    } catch {
      return [];
    }
  });
}

function numericRedemptionValues(card: CreditCard): number[] {
  const r: Record<string, unknown> = (card.redemption ?? {}) as Record<string, unknown>;
  const flat = Object.values(r).filter((v): v is number => typeof v === "number" && v > 0);
  const transfer = (card.redemption?.transferPartnerValuations ?? []).map((t) => t.partnerPointValue * t.transferRatio);
  return [...flat, ...transfer].filter((v) => v > 0);
}

// Rupee value of one reward unit as scoring uses it (mirrors lib/recommend.ts: max redemption value
// x liquidity multiplier, with the same hard-coded fallbacks). Used to sanity-check that
// point/mile-denominated milestone & joining/renewal benefits are valued consistently with the
// card's own point value.
function scoringPointValue(card: CreditCard): number {
  if (/cashback/i.test(card.rewardType)) return 1;
  const vals = numericRedemptionValues(card);
  let base = vals.length ? Math.max(...vals) : 0;
  if (base === 0) {
    const rt = card.rewardType.toLowerCase();
    if (rt.includes("marriott bonvoy")) base = 0.6;
    else if (rt.includes("membership rewards")) base = 0.6;
    else if (rt.includes("mile")) base = 1;
    else base = 1;
  }
  const f = card.rewardLiquidityFactor;
  const liq = typeof f === "number" && f > 0 && f <= 1 ? f : card.rewardLiquidity === "brand-locked" ? 0.75 : 1;
  return base * liq;
}

// Pull the leading "<N> ... points|miles|cashpoints" figure from a benefit label, e.g.
// "up to 15,000 Marriott Bonvoy Points" -> 15000, "4,000 bonus miles" -> 4000. Returns null when
// the label has no point/mile figure (e.g. a voucher in rupees, or a status/tier perk).
function benefitPointsFigure(label: string): number | null {
  const m = label.match(/([\d,]{3,})\s+(?:[a-z]+\s+){0,3}(points?|miles?|cashpoints?)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Audit one valued benefit (a milestone or a joining/renewal valued entry) for value-consistency.
function auditValuedBenefit(
  source: "milestone" | "joining" | "renewal",
  label: string,
  value: number,
  card: CreditCard,
  flags: string[],
  valuedPointsFigures: Set<number>
) {
  const pts = benefitPointsFigure(label);
  const ppv = scoringPointValue(card);
  const isSoftPerk = /\b(tier|status|elite|upgrade)\b/i.test(label) && pts === null;

  if (pts !== null) {
    const expected = pts * ppv;
    if (value > 0 && expected > 0 && Math.abs(value - expected) / expected > 0.15) {
      flags.push(
        `BENEFIT VALUE MISMATCH (${source}): "${label.slice(0, 55)}…" grants ${pts} pts/miles but is ` +
          `valued at Rs ${value}; at the card's Rs ${ppv.toFixed(2)}/point that implies Rs ${Math.round(expected)}.`
      );
    } else if (value === 0 && !valuedPointsFigures.has(pts)) {
      flags.push(
        `UNVALUED POINTS BENEFIT (${source}): "${label.slice(0, 55)}…" grants ${pts} pts/miles but value is 0 ` +
          `(Rs ${Math.round(pts * ppv)} uncounted) — confirm it is intentionally excluded.`
      );
    }
  } else if (isSoftPerk && value > 0) {
    flags.push(
      `SOFT PERK VALUED (${source}): "${label.slice(0, 55)}…" is an airline/hotel tier/status/upgrade ` +
        `valued at Rs ${value}; policy is to leave these text-only (value 0). Confirm the rupee basis.`
    );
  }

  // A joining benefit whose text says it recurs (annual fee levy / anniversary / every year) is
  // really a renewal benefit. joiningBenefitsValued is amortized over 3 years, so a recurring perk
  // filed there is under-counted by ~2/3.
  if (source === "joining" && value > 0 && /\b(renewal|anniversary|every year|each year|fee levy|fee cycle|annually)\b/i.test(label)) {
    flags.push(
      `MISFILED RECURRING JOINING: "${label.slice(0, 55)}…" reads as recurring (fee levy/anniversary) but ` +
        `sits in joiningBenefitsValued (amortized /3). If it repeats yearly, move it to renewalBenefitsValued.`
    );
  }
}

function auditCard(card: CreditCard, scored: ReturnType<typeof scoreCards>, rank?: number) {
  const sc = scored.find((x) => x.card.id === card.id);
  const flags: string[] = [];

  console.log(`\n############ ${rank ? `#${rank} ` : ""}${card.name} (${card.id}) ############`);
  console.log(`rewardType=${card.rewardType}  acceleratedShare=${card.acceleratedShare ? JSON.stringify(card.acceleratedShare) : "-"}`);

  // Missing point value (non-cashback card, no redemption value -> engine falls back). Report the
  // actual fallback the engine uses (Rs 1 generic, or a rewardType-specific rate like Bonvoy 0.6).
  if (!/cashback/i.test(card.rewardType) && numericRedemptionValues(card).length === 0) {
    const ppv = scoringPointValue(card);
    flags.push(
      `MISSING POINT VALUE: redemption has no numeric value field; engine falls back to Rs ${ppv.toFixed(2)}/point` +
        `${ppv >= 1 ? " (likely over-valued)" : ""}. Add an explicit redemption value for auditability.`
    );
  }

  // Points figures that ARE positively valued somewhere on this card, so a same-figure benefit left
  // at value 0 (deliberately counted elsewhere — e.g. a welcome perk also booked as renewal) is not
  // wrongly flagged as uncounted.
  const valuedPointsFigures = new Set<number>();
  for (const b of [
    ...(card.milestones ?? []).map((m) => ({ value: m.value, label: m.label })),
    ...(card.joiningBenefitsValued ?? []),
    ...(card.renewalBenefitsValued ?? [])
  ]) {
    const f = benefitPointsFigure(b.label);
    if (f !== null && b.value > 0) valuedPointsFigures.add(f);
  }

  console.log("REWARD ROWS:");
  for (const r of card.rewards) {
    const cats = r.category.split(",").map((c) => c.trim().toLowerCase());
    const isBroad = cats.some((c) => BROAD_CATEGORIES.includes(c));
    const isBaseRow = cats.some((c) => ["base", "offline", "retail"].includes(c));
    const text = `${r.displayCategory ?? ""} ${r.displayRate ?? ""}`;
    console.log(`  [${r.category}] rate=${r.rate} cap=${r.capMonthly}${r.tierScope ? " tierScope=" + r.tierScope : ""}  «${(r.displayCategory ?? r.displayRate ?? "").slice(0, 70)}»`);

    if (isBroad && !isBaseRow && NARROW_SIGNALS.test(text)) {
      flags.push(`OVER-BROAD: row "${r.category}" (rate ${r.rate}) is actually narrow — «${(r.displayCategory ?? "").slice(0, 60)}». All "${cats.join("/")}" spend earns it; consider a narrow category + acceleratedShare.`);
    }
    if (!isBaseRow && r.rate >= 5 && (r.capMonthly === null || r.capMonthly === undefined)) {
      flags.push(`UNCAPPED HIGH RATE: row "${r.category}" rate ${r.rate} has no capMonthly — scales unbounded at high spend.`);
    }
  }

  const milestones = card.milestones ?? [];
  const joiningValued = card.joiningBenefitsValued ?? [];
  const renewalValued = card.renewalBenefitsValued ?? [];
  if (milestones.length || joiningValued.length || renewalValued.length) {
    console.log(`VALUED BENEFITS (point value Rs ${scoringPointValue(card).toFixed(2)}/unit):`);
    for (const m of milestones) {
      console.log(`  [milestone ${m.period} >=${m.threshold}] value=${m.value}  «${m.label.slice(0, 60)}»`);
      auditValuedBenefit("milestone", m.label, m.value, card, flags, valuedPointsFigures);
    }
    for (const b of joiningValued) {
      console.log(`  [joining] value=${b.value}  «${b.label.slice(0, 60)}»`);
      auditValuedBenefit("joining", b.label, b.value, card, flags, valuedPointsFigures);
    }
    for (const b of renewalValued) {
      console.log(`  [renewal] value=${b.value}  «${b.label.slice(0, 60)}»`);
      auditValuedBenefit("renewal", b.label, b.value, card, flags, valuedPointsFigures);
    }
  }

  if (sc) {
    console.log("ROUTING (spend category -> reward earning it):");
    const seen = new Map<string, Set<string>>();
    for (const b of sc.rewardBreakdown) {
      if (b.annualReward <= 0) continue;
      if (!seen.has(b.spendCategory)) seen.set(b.spendCategory, new Set());
      seen.get(b.spendCategory)!.add(b.rewardCategory);
    }
    for (const [cat, rwds] of seen) console.log(`  ${cat.padEnd(11)} -> ${[...rwds].join(" + ")}`);
  }

  if (flags.length) {
    console.log("FLAGS:");
    for (const f of flags) console.log(`  ⚠ ${f}`);
  } else {
    console.log("FLAGS: none");
  }
}

function main() {
  const args = process.argv.slice(2);
  const scored = scoreCards({ query: "top cards" } as never);
  const all = loadAllCards();

  let targets: CreditCard[];
  let ranks = new Map<string, number>();
  scored.forEach((s, i) => ranks.set(s.card.id, i + 1));

  if (args[0] === "top") {
    const n = Number(args[1] ?? 10);
    targets = scored.slice(0, n).map((s) => s.card as CreditCard);
  } else if (args[0] && all.some((c) => c.id === args[0])) {
    targets = all.filter((c) => c.id === args[0]);
  } else if (args[0]) {
    // treat as issuer directory name
    targets = walk(join("data/cards", args[0])).flatMap((p) => {
      try { return [JSON.parse(readFileSync(p, "utf8")) as CreditCard]; } catch { return []; }
    });
  } else {
    targets = scored.slice(0, 10).map((s) => s.card as CreditCard);
  }

  for (const card of targets) auditCard(card, scored, ranks.get(card.id));
  console.log(`\nAudited ${targets.length} card(s).`);
}

main();
