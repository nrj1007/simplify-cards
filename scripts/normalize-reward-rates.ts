/**
 * Normalize `reward.rate` to the canonical convention: reward-currency units per Rs 100 of spend.
 *
 * Some cards historically stored `rate` as a rupee %-return instead of a unit count, so the two
 * scoring paths disagreed (the calculator parsed `displayRate`; recommend.ts used `rate`). For every
 * reward row whose `displayRate` authoritatively encodes the units (e.g. "1 Membership Rewards Point
 * / Rs 50" = 2 units/Rs100), this script sets `rate` (and `postCapRate` when the displayRate has a
 * "then …/Rs …" clause) to the parsed value. It NEVER edits `displayRate`, never touches cashback
 * rows, and never touches rows without a parseable `displayRate` — so the calculator's displayed
 * output is unchanged; only recommend.ts scoring corrects.
 *
 * Usage:
 *   node scripts/normalize-reward-rates.js            # dry-run, prints the change table
 *   node scripts/normalize-reward-rates.js --write    # apply
 *   node scripts/normalize-reward-rates.js --only=amex-gold,amex-platinum [--write]
 */

import fs from "node:fs";
import path from "node:path";
import { parseDisplayRateUnits } from "../lib/reward-rate-parse";

// `rate` is set to the exact displayRate-implied units (full double precision) so that reading
// `rate` reproduces the old displayRate parse bit-for-bit and the calculator's displayed output is
// unchanged. Clean divisions stay clean (e.g. 2 RP/Rs100 -> 2); only repeating fractions such as
// X/Rs150 get long decimals. Rows differing by more than BIG_DELTA are genuine convention
// corrections (these move recommend.ts scoring); smaller diffs are precision alignment.
const BIG_DELTA = 0.01;

// Rows whose `displayRate` text is known to be inconsistent with the (correct) `rate`, so the parse
// must NOT overwrite `rate`. hdfc-diners-club-black-metal's SmartBuy lines are headlined "Up to
// 10X/5X" but the parenthetical shows the base earn, parsing to ~1/5 of the real effective rate.
// `rate` (33.33 / 16.67 = 10X / 5X of the 3.33 base) is authoritative here. Kept in sync with the
// allowlist in scripts/validate-cards.ts.
const DISPLAYRATE_SKIP = new Set([
  "hdfc-diners-club-black-metal::smartbuy hotels",
  "hdfc-diners-club-black-metal::smartbuy flights"
]);
const args = process.argv.slice(2);
const write = args.includes("--write");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim())) : null;

const root = process.cwd();
const cardsDir = path.join(root, "data", "cards");

function isCashbackRewardType(rewardType: string) {
  return /cashback/i.test(rewardType) && !/point|mile|coin|star|credit|neucoin/i.test(rewardType);
}

const files = fs
  .readdirSync(cardsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((dir) =>
    fs
      .readdirSync(path.join(cardsDir, dir.name))
      .filter((n) => n.endsWith(".json"))
      .map((n) => path.join(cardsDir, dir.name, n))
  );

type Change = { id: string; category: string; field: "rate" | "postCapRate"; from: number; to: number; displayRate: string; big: boolean };
const changes: Change[] = [];
let cardsTouched = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const usesCrlf = raw.includes("\r\n");
  const card = JSON.parse(raw);
  if (only && !only.has(card.id)) continue;
  if (isCashbackRewardType(card.rewardType ?? "")) continue;
  if (!Array.isArray(card.rewards)) continue;

  let cardChanged = false;
  for (const reward of card.rewards) {
    if (DISPLAYRATE_SKIP.has(`${card.id}::${reward.category}`)) continue;
    const parsed = parseDisplayRateUnits(reward.displayRate);
    if (!parsed) continue;

    const newBase = parsed.basePerRs100;
    if (typeof reward.rate === "number" && Math.abs(newBase - reward.rate) > 1e-9) {
      changes.push({ id: card.id, category: reward.category, field: "rate", from: reward.rate, to: newBase, displayRate: reward.displayRate, big: Math.abs(newBase - reward.rate) > BIG_DELTA });
      reward.rate = newBase;
      cardChanged = true;
    }

    if (parsed.postCapPerRs100 != null) {
      const newPost = parsed.postCapPerRs100;
      if (typeof reward.postCapRate === "number" && Math.abs(newPost - reward.postCapRate) > 1e-9) {
        changes.push({ id: card.id, category: reward.category, field: "postCapRate", from: reward.postCapRate, to: newPost, displayRate: reward.displayRate, big: Math.abs(newPost - reward.postCapRate) > BIG_DELTA });
        reward.postCapRate = newPost;
        cardChanged = true;
      }
    }
  }

  if (cardChanged) {
    cardsTouched++;
    if (write) {
      // Surgically re-serialize ONLY the `rewards` array and splice it back, leaving the rest of the
      // file byte-identical. This avoids reformatting compact inline arrays elsewhere (e.g. the
      // redemption partner tables) and preserves the original line-ending style.
      const out = spliceRewardsArray(raw, card, usesCrlf);
      if (out == null) {
        throw new Error(`could not locate rewards array span in ${file}`);
      }
      fs.writeFileSync(file, out, "utf8");
    }
  }
}

// Replace the text of the top-level `rewards: [ … ]` array with a freshly serialized version (same
// 2-space indentation and key order), leaving every other byte of the file untouched.
function spliceRewardsArray(raw: string, card: { rewards: unknown[] }, usesCrlf: boolean): string | null {
  const keyIdx = raw.indexOf('"rewards"');
  if (keyIdx === -1) return null;
  const start = raw.indexOf("[", keyIdx);
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  const eol = usesCrlf ? "\r\n" : "\n";
  // rewards is nested one level in the card object, so indent every line after the first by 2 spaces.
  const arrText = JSON.stringify(card.rewards, null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : "  " + line))
    .join(eol);
  return raw.slice(0, start) + arrText + raw.slice(end + 1);
}

const bigChanges = changes.filter((c) => c.big);
console.log(`\nReward-rate normalization — ${write ? "WRITE" : "DRY-RUN"}${only ? ` (only: ${[...only].join(", ")})` : ""}`);
console.log(`  rows changed: ${changes.length}   cards touched: ${cardsTouched}`);
console.log(`  convention corrections (>${BIG_DELTA}, move scoring): ${bigChanges.length}   precision alignment: ${changes.length - bigChanges.length}\n`);

if (bigChanges.length) {
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log("  Convention corrections (rate was %-return, now units/Rs100):");
  console.log(`  ${pad("card", 30)} ${pad("category", 22)} ${pad("from→to", 16)} displayRate`);
  for (const c of bigChanges) {
    console.log(`  ${pad(c.id, 30)} ${pad(c.category.slice(0, 21), 22)} ${pad(`${c.from}→${c.to}`, 16)} "${c.displayRate}"`);
  }
}

if (!write) console.log("\n(dry-run — re-run with --write to apply; --only=id1,id2 for a subset.)");
