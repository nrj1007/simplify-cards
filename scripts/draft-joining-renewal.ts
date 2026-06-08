/**
 * Drafts structured `joiningBenefitsValued` / `renewalBenefitsValued` blocks for cards that don't
 * have them yet, by reusing the existing runtime value parser (lib/recommend.ts). The drafts
 * reproduce the rupee value the scoring engine derives today, so they are a starting point for human
 * review/cleanup — NOT a final authored version.
 *
 * Sources, matching the engine's current logic:
 *   joining  <- joiningBenefits  + additionalBenefits lines matching joining keywords (not renewal)
 *   renewal  <- renewalBenefits  + additionalBenefits lines matching renewal/anniversary keywords
 * (renewalBenefits text is captured here for the first time — the engine never valued it before.)
 *
 * Lines whose value parsed as 0, and any `additionalBenefits` line pulled in by keyword, are reported
 * under "review" — fix the value and move the additionalBenefits line out of `additionalBenefits` by
 * hand before committing.
 *
 * Usage:
 *   npm run draft:joining-renewal                                 # dry-run
 *   npm run draft:joining-renewal -- --write --verified-only      # policy: user-verified cards only
 *   npm run draft:joining-renewal -- --write --only=hdfc-millennia,axis-atlas
 */
import fs from "node:fs";
import path from "node:path";
import { stripScoringAnnotations } from "../lib/card-index";
import { estimateBenefitLineValue } from "../lib/recommend";
import type { CreditCard, ValuedBenefit } from "../lib/types";

const WRITE = process.argv.includes("--write");
const VERIFIED_ONLY = process.argv.includes("--verified-only");
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const onlyIds = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(",").map((value) => value.trim()).filter(Boolean))
  : null;

const cardsDir = path.join(process.cwd(), "data", "cards");

const RENEWAL_RE = /\b(renewal|anniversary)\b/i;
const JOINING_RE = /\b(joining|welcome|fee levy|fee realization|first year|within 90 days|card open date)\b/i;

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

function inferKind(text: string): ValuedBenefit["kind"] {
  if (/\bvoucher(s)?\b/i.test(text)) return "voucher";
  if (/cashback/i.test(text)) return "cashback";
  if (/\bpoints?\b|miles|neucoins|bonvoy/i.test(text)) return "points";
  return "other";
}

function indentBlock(value: unknown, baseIndent: string): string {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : baseIndent + line))
    .join("\n");
}

const counts = { drafted: 0, hasField: 0, notVerified: 0, noBenefits: 0, noAnchor: 0, badJson: 0 };
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
  if (card.joiningBenefitsValued || card.renewalBenefitsValued) {
    counts.hasField += 1;
    continue;
  }
  if (VERIFIED_ONLY && !isUserVerified(card)) {
    counts.notVerified += 1;
    continue;
  }

  // Collect source lines, mirroring the engine's classification.
  const joiningSources = [...(card.joiningBenefits ?? [])];
  const renewalSources = [...(card.renewalBenefits ?? [])];
  const pulledFromAdditional: string[] = [];
  for (const benefit of card.additionalBenefits ?? []) {
    if (RENEWAL_RE.test(benefit)) {
      renewalSources.push(benefit);
      pulledFromAdditional.push(benefit);
    } else if (JOINING_RE.test(benefit)) {
      joiningSources.push(benefit);
      pulledFromAdditional.push(benefit);
    }
  }

  const toValued = (lines: string[]): ValuedBenefit[] =>
    lines
      // Value the ORIGINAL line so a "(worth Rs …)" annotation still counts; strip only for the label.
      .filter((line) => stripScoringAnnotations(line).length > 0)
      .map((line) => ({ value: estimateBenefitLineValue(card, line), kind: inferKind(line), label: stripScoringAnnotations(line) }));

  const joiningValued = toValued(joiningSources);
  const renewalValued = toValued(renewalSources);

  if (joiningValued.length === 0 && renewalValued.length === 0) {
    counts.noBenefits += 1;
    continue;
  }

  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const anchor = lines.findIndex((line) => /^\s*"(joiningBenefits|renewalBenefits|additionalBenefits)"\s*:/.test(line));
  if (anchor === -1) {
    counts.noAnchor += 1;
    continue;
  }

  const blocks: string[] = [];
  if (joiningValued.length) blocks.push(`  "joiningBenefitsValued": ${indentBlock(joiningValued, "  ")},`);
  if (renewalValued.length) blocks.push(`  "renewalBenefitsValued": ${indentBlock(renewalValued, "  ")},`);
  const blockLines = blocks.join(eol).split("\n");
  lines.splice(anchor, 0, ...blockLines);
  const updated = lines.join(eol);

  try {
    JSON.parse(updated);
  } catch {
    counts.badJson += 1;
    continue;
  }

  // Review flags.
  const cardReview: string[] = [];
  for (const benefit of [...joiningValued, ...renewalValued]) {
    if (benefit.value === 0) cardReview.push(`value? "${benefit.label}" — could not parse a rupee value`);
  }
  for (const line of pulledFromAdditional) {
    cardReview.push(`move? "${stripScoringAnnotations(line)}" — pulled from additionalBenefits; remove it there`);
  }

  counts.drafted += 1;
  if (samples.length < 2) samples.push(`${card.id} →\n${blocks.join("\n")}`);
  if (cardReview.length) reviewNotes.push(`${card.id}:\n  - ${cardReview.join("\n  - ")}`);
  if (WRITE) fs.writeFileSync(file, updated);
}

console.log(`\nJoining/renewal draft — ${WRITE ? "WRITE" : "DRY-RUN"}${VERIFIED_ONLY ? " (verified-only)" : ""}${onlyIds ? ` (only: ${[...onlyIds].join(", ")})` : ""}`);
console.log(`  drafted${WRITE ? " + written" : ""}: ${counts.drafted}`);
console.log(`  skipped — already has a valued field: ${counts.hasField}`);
if (counts.notVerified) console.log(`  skipped — not user-verified: ${counts.notVerified}`);
console.log(`  skipped — no joining/renewal benefits: ${counts.noBenefits}`);
if (counts.noAnchor) console.log(`  skipped — no benefits anchor: ${counts.noAnchor}`);
if (counts.badJson) console.log(`  skipped — JSON parse issue: ${counts.badJson}`);
if (!WRITE) console.log(`\n(dry-run — re-run with --write to apply; --only=id1,id2 for a subset.)`);
if (reviewNotes.length) console.log(`\n⚠ Review needed (fix by hand before committing):\n\n${reviewNotes.join("\n\n")}`);
if (samples.length) console.log(`\nSample drafts:\n\n${samples.join("\n\n")}`);
