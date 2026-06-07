/**
 * Drafts a structured `lounge` block for cards that have lounge access but no `lounge` field yet,
 * by reusing the existing heuristic miner (lib/lounge.ts). The drafts are the same conditions the
 * card detail page shows today, so they are a starting point for human review/cleanup — not a
 * final authored version.
 *
 * Usage:
 *   npm run draft:lounge                 # dry-run: report scope + samples, write nothing
 *   npm run draft:lounge -- --write      # write drafts into the card JSON files
 *   npm run draft:lounge -- --write --only=hdfc-infinia-metal,axis-atlas   # subset (flagships)
 *
 * After writing, review the git diff and edit the drafted bullets before committing.
 */
import fs from "node:fs";
import path from "node:path";
import { getMeaningfulLoungeConditions, getTotalLoungeAccess } from "../lib/lounge";
import type { CreditCard } from "../lib/types";

const WRITE = process.argv.includes("--write");
// Policy: lounge conditions are migrated to the structured field only for cards the user has
// personally verified, so we never freeze possibly-wrong auto-audited text. Pass --verified-only
// to enforce it (skips cards without the "manually reviewed and verified by user" internalNote).
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

function hasLoungeAccess(card: CreditCard): boolean {
  const total = getTotalLoungeAccess(card);
  return total === "unlimited" || total > 0;
}

function isUserVerified(card: CreditCard): boolean {
  return (card.internalNotes ?? []).some((note) => /manually reviewed and verified by user/i.test(note));
}

// Pretty-print an object at the card's top-level 2-space indentation.
function indentBlock(value: unknown, baseIndent: string): string {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : baseIndent + line))
    .join("\n");
}

type LoungeDraft = { domestic?: string[]; international?: string[]; combined?: string[] };

const counts = { eligible: 0, drafted: 0, hasField: 0, notVerified: 0, noLounge: 0, noConditions: 0, noAnchor: 0, badJson: 0 };
const samples: string[] = [];

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
  if (card.lounge) {
    counts.hasField += 1;
    continue;
  }
  if (VERIFIED_ONLY && !isUserVerified(card)) {
    counts.notVerified += 1;
    continue;
  }
  if (!hasLoungeAccess(card)) {
    counts.noLounge += 1;
    continue;
  }
  counts.eligible += 1;

  const lounge: LoungeDraft = {};
  if (card.combinedLoungeAccess !== undefined) {
    const combined = getMeaningfulLoungeConditions(card);
    if (combined.length) lounge.combined = combined;
  } else {
    const domestic = getMeaningfulLoungeConditions(card, "domestic");
    const international = getMeaningfulLoungeConditions(card, "international");
    if (domestic.length) lounge.domestic = domestic;
    if (international.length) lounge.international = international;
  }

  if (Object.keys(lounge).length === 0) {
    counts.noConditions += 1;
    continue;
  }

  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const anchor = lines.findIndex((line) => /^\s*"loungeInternational"\s*:/.test(line));
  if (anchor === -1) {
    counts.noAnchor += 1;
    continue;
  }

  const blockLines = `  "lounge": ${indentBlock(lounge, "  ")},`.split("\n");
  lines.splice(anchor + 1, 0, ...blockLines);
  const updated = lines.join(eol);

  try {
    JSON.parse(updated);
  } catch {
    counts.badJson += 1;
    continue;
  }

  counts.drafted += 1;
  if (samples.length < 2) samples.push(`${card.id} →\n  "lounge": ${indentBlock(lounge, "  ")}`);
  if (WRITE) fs.writeFileSync(file, updated);
}

console.log(`\nLounge draft — ${WRITE ? "WRITE" : "DRY-RUN"}${VERIFIED_ONLY ? " (verified-only)" : ""}${onlyIds ? ` (only: ${[...onlyIds].join(", ")})` : ""}`);
console.log(`  drafted${WRITE ? " + written" : ""}: ${counts.drafted}`);
console.log(`  skipped — already has lounge field: ${counts.hasField}`);
if (counts.notVerified) console.log(`  skipped — not user-verified: ${counts.notVerified}`);
console.log(`  skipped — no lounge access: ${counts.noLounge}`);
console.log(`  skipped — no mineable conditions: ${counts.noConditions}`);
if (counts.noAnchor) console.log(`  skipped — no loungeInternational anchor: ${counts.noAnchor}`);
if (counts.badJson) console.log(`  skipped — JSON parse issue: ${counts.badJson}`);
if (!WRITE) console.log(`\n(dry-run — re-run with --write to apply; --only=id1,id2 for a subset.)`);
if (samples.length) console.log(`\nSample drafts:\n\n${samples.join("\n\n")}`);
