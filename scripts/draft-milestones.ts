/**
 * Drafts a structured `milestones` block for cards that have `milestoneBenefits` text but no
 * `milestones` field yet, by reusing the existing runtime parsers (lib/recommend.ts). The drafts
 * reproduce the threshold/value the scoring engine derives today, so they are a starting point for
 * human review/cleanup — NOT a final authored version.
 *
 * Every draft defaults to `period: "annual"`. Lines whose text mentions "quarter"/"month", or whose
 * threshold/value could not be parsed, are reported under "review" — fix those by hand (especially
 * the period, which is exactly the bug the structured field exists to fix) before committing.
 *
 * Usage:
 *   npm run draft:milestones                                  # dry-run: report scope + samples
 *   npm run draft:milestones -- --write                       # write drafts into the card JSON files
 *   npm run draft:milestones -- --write --verified-only       # only user-verified cards (policy)
 *   npm run draft:milestones -- --write --only=hdfc-regalia-gold,axis-atlas
 *
 * After writing, review the git diff and correct period/value/kind before committing.
 */
import fs from "node:fs";
import path from "node:path";
import { stripScoringAnnotations } from "../lib/card-index";
import { estimateMilestoneLineValue, extractMilestoneThreshold } from "../lib/recommend";
import type { CreditCard, Milestone } from "../lib/types";

const WRITE = process.argv.includes("--write");
// Policy: migrate structured data only for cards the user has personally verified, so we never
// freeze possibly-wrong auto-audited text. See draft-lounge.ts.
const VERIFIED_ONLY = process.argv.includes("--verified-only");
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const onlyIds = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(",").map((value) => value.trim()).filter(Boolean))
  : null;

const cardsDir = path.join(process.cwd(), "data", "cards");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

function isUserVerified(card: CreditCard): boolean {
  return (card.internalNotes ?? []).some((note) => /manually reviewed and verified by user/i.test(note));
}

// Fee-waiver lines belong in feeWaiverSpend, not milestones.
function isFeeWaiverLine(benefit: string): boolean {
  return /renewal fee|fee waiv|annual fee waiv/i.test(benefit);
}

function inferKind(benefit: string): Milestone["kind"] {
  if (/\bvoucher(s)?\b/i.test(benefit)) return "voucher";
  if (/cashback/i.test(benefit)) return "cashback";
  if (/\bpoints?\b|miles|neucoins|bonvoy/i.test(benefit)) return "points";
  return "other";
}

// Pretty-print an object at the card's top-level 2-space indentation.
function indentBlock(value: unknown, baseIndent: string): string {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : baseIndent + line))
    .join("\n");
}

const counts = { drafted: 0, hasField: 0, notVerified: 0, noMilestones: 0, noParseable: 0, noAnchor: 0, badJson: 0 };
const samples: string[] = [];
const reviewNotes: string[] = [];

for (const file of walk(cardsDir)) {
  const raw = fs.readFileSync(file, "utf8");
  let card: CreditCard;
  try {
    card = JSON.parse(raw) as CreditCard;
  } catch {
    counts.badJson += 1;
    continue;
  }

  if (onlyIds && !onlyIds.has(card.id)) continue;
  if (card.milestones) {
    counts.hasField += 1;
    continue;
  }
  if (VERIFIED_ONLY && !isUserVerified(card)) {
    counts.notVerified += 1;
    continue;
  }
  if (!card.milestoneBenefits?.length) {
    counts.noMilestones += 1;
    continue;
  }

  const milestones: Milestone[] = [];
  const cardReview: string[] = [];
  for (const benefit of card.milestoneBenefits) {
    if (isFeeWaiverLine(benefit)) continue;
    const label = stripScoringAnnotations(benefit);
    if (!label) continue;
    const threshold = extractMilestoneThreshold(benefit) ?? 0;
    const value = estimateMilestoneLineValue(card, benefit);
    milestones.push({ threshold, period: "annual", value, kind: inferKind(benefit), label });

    if (/per (calendar )?(quarter|month)|quarterly|monthly/i.test(benefit)) {
      cardReview.push(`period? "${label}" — text mentions quarter/month; set period and per-period threshold/value`);
    }
    if (value === 0) cardReview.push(`value? "${label}" — could not parse a rupee value`);
    if (threshold === 0) cardReview.push(`threshold? "${label}" — no spend threshold parsed (0 = always applies)`);
  }

  if (milestones.length === 0) {
    counts.noParseable += 1;
    continue;
  }

  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  // Insert the structured block immediately before the milestoneBenefits array.
  const anchor = lines.findIndex((line) => /^\s*"milestoneBenefits"\s*:/.test(line));
  if (anchor === -1) {
    counts.noAnchor += 1;
    continue;
  }

  const blockLines = `  "milestones": ${indentBlock(milestones, "  ")},`.split("\n");
  lines.splice(anchor, 0, ...blockLines);
  const updated = lines.join(eol);

  try {
    JSON.parse(updated);
  } catch {
    counts.badJson += 1;
    continue;
  }

  counts.drafted += 1;
  if (samples.length < 2) samples.push(`${card.id} →\n  "milestones": ${indentBlock(milestones, "  ")}`);
  if (cardReview.length) reviewNotes.push(`${card.id}:\n  - ${cardReview.join("\n  - ")}`);
  if (WRITE) fs.writeFileSync(file, updated);
}

console.log(`\nMilestone draft — ${WRITE ? "WRITE" : "DRY-RUN"}${VERIFIED_ONLY ? " (verified-only)" : ""}${onlyIds ? ` (only: ${[...onlyIds].join(", ")})` : ""}`);
console.log(`  drafted${WRITE ? " + written" : ""}: ${counts.drafted}`);
console.log(`  skipped — already has milestones field: ${counts.hasField}`);
if (counts.notVerified) console.log(`  skipped — not user-verified: ${counts.notVerified}`);
console.log(`  skipped — no milestoneBenefits: ${counts.noMilestones}`);
console.log(`  skipped — no parseable (non-fee-waiver) lines: ${counts.noParseable}`);
if (counts.noAnchor) console.log(`  skipped — no milestoneBenefits anchor: ${counts.noAnchor}`);
if (counts.badJson) console.log(`  skipped — JSON parse issue: ${counts.badJson}`);
if (!WRITE) console.log(`\n(dry-run — re-run with --write to apply; --only=id1,id2 for a subset.)`);
if (reviewNotes.length) console.log(`\n⚠ Review needed (fix by hand before committing):\n\n${reviewNotes.join("\n\n")}`);
if (samples.length) console.log(`\nSample drafts:\n\n${samples.join("\n\n")}`);
