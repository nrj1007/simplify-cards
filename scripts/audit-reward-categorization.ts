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

function auditCard(card: CreditCard, scored: ReturnType<typeof scoreCards>, rank?: number) {
  const sc = scored.find((x) => x.card.id === card.id);
  const flags: string[] = [];

  console.log(`\n############ ${rank ? `#${rank} ` : ""}${card.name} (${card.id}) ############`);
  console.log(`rewardType=${card.rewardType}  acceleratedShare=${card.acceleratedShare ? JSON.stringify(card.acceleratedShare) : "-"}`);

  // Missing point value (non-cashback card, no redemption value -> engine falls back to Rs 1).
  if (!/cashback/i.test(card.rewardType) && numericRedemptionValues(card).length === 0) {
    flags.push(`MISSING POINT VALUE: redemption has no numeric value field; engine values points at Rs 1 (likely over-valued).`);
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
