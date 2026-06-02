// One-off migration: split issuer-grouped card arrays (data/cards/<issuer>.json)
// into one file per card (data/cards/<issuer>/<card-id>.json).
//
// Idempotent: re-running regenerates the per-card files and re-removes the
// original issuer arrays. Safe to delete after the migration has landed.
//
//   node scripts/split-cards-to-per-file.mjs

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cardsDir = path.join(root, "data", "cards");

const issuerFiles = fs
  .readdirSync(cardsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name)
  .sort();

if (issuerFiles.length === 0) {
  console.error("No issuer JSON files found directly under data/cards/. Nothing to split.");
  process.exit(1);
}

const seenIds = new Set();
let cardCount = 0;

for (const file of issuerFiles) {
  const stem = file.replace(/\.json$/, "");
  const filePath = path.join(cardsDir, file);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(parsed)) {
    console.error(`Skipping ${file}: expected a top-level array of cards.`);
    continue;
  }

  const issuerDir = path.join(cardsDir, stem);
  fs.mkdirSync(issuerDir, { recursive: true });

  for (const card of parsed) {
    if (!card || typeof card.id !== "string" || !card.id) {
      throw new Error(`Card without a string id found in ${file}.`);
    }
    if (seenIds.has(card.id)) {
      throw new Error(`Duplicate card id "${card.id}" found while splitting ${file}.`);
    }
    seenIds.add(card.id);

    const outPath = path.join(issuerDir, `${card.id}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(card, null, 2)}\n`, "utf8");
    cardCount += 1;
  }

  // Remove the original issuer array file now that its cards live in <stem>/.
  fs.rmSync(filePath);
  console.log(`${file} -> ${stem}/ (${parsed.length} cards)`);
}

console.log(`\nDone. Wrote ${cardCount} per-card files across ${issuerFiles.length} issuer folders.`);
