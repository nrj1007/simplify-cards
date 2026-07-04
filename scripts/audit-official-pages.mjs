#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CARDS_DIR = path.join(process.cwd(), "data", "cards");
const AUDIT_DIR = path.join(process.cwd(), "data", "official-audit");
const BASELINE_PATH = path.join(AUDIT_DIR, "baseline.json");
const PENDING_DIR = path.join(AUDIT_DIR, "pending");

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function cleanHtmlText(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\b(session[_-]?id|csrf[_-]?token|_csrf|timestamp)=\w+/gi, "")
    .replace(/Copyright\s+©?\s*\d{4}/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/(\r?\n\s*){2,}/g, "\n")
    .trim();
}

export function computeSha256(content = "") {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function classifyHighImpactKeywords(diffLines = []) {
  const keywordRegex = /\b(w\.e\.f|effective|cap\w*|limit\w*|revised|devalu\w*|lounge|fee\w*|charges?|cashback|reward points|exclusion|exempt|markup)\b/gi;
  const matched = new Set();

  for (const line of diffLines) {
    const matches = line.match(keywordRegex);
    if (matches) {
      for (const match of matches) {
        matched.add(match.toLowerCase());
      }
    }
  }

  return [...matched];
}

export function computeSimpleDiff(oldText = "", newText = "") {
  const oldLines = oldText.split("\n").map((l) => l.trim()).filter(Boolean);
  const newLines = newText.split("\n").map((l) => l.trim()).filter(Boolean);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const removed = oldLines.filter((l) => !newSet.has(l));
  const added = newLines.filter((l) => !oldSet.has(l));

  return {
    removed: removed.slice(0, 30),
    added: added.slice(0, 30),
    removedCount: removed.length,
    addedCount: added.length
  };
}

async function getAllCards() {
  const cards = [];
  const issuerEntries = await readdir(CARDS_DIR, { withFileTypes: true });

  for (const entry of issuerEntries) {
    if (!entry.isDirectory()) continue;
    const issuerDir = path.join(CARDS_DIR, entry.name);
    const fileNames = await readdir(issuerDir);

    for (const fileName of fileNames) {
      if (!fileName.endsWith(".json")) continue;
      const content = await readFile(path.join(issuerDir, fileName), "utf8");
      cards.push(JSON.parse(content));
    }
  }

  return cards;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CreditCardAI-OfficialAuditor/1.0"
      },
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { url, success: false, status: response.status, text: "", error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();

    return {
      url: response.url || url,
      success: true,
      status: response.status,
      contentType,
      text: cleanHtmlText(raw)
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return { url, success: false, status: 0, text: "", error: err instanceof Error ? err.message : String(err) };
  }
}

async function readJsonFile(filePath, fallback = {}) {
  if (!existsSync(filePath)) return fallback;
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function main() {
  const targetCardId = getArg("card", null);
  const targetIssuer = getArg("issuer", null);
  const limit = toInt(getArg("limit", null), null);
  const updateBaseline = process.argv.includes("--update-baseline");
  const dryRun = process.argv.includes("--dry-run");

  console.log("Official Card Page Auditor starting...");

  let cards = await getAllCards();

  if (targetCardId) {
    cards = cards.filter((c) => c.id === targetCardId);
  }
  if (targetIssuer) {
    cards = cards.filter((c) => c.issuer.toLowerCase().includes(targetIssuer.toLowerCase()));
  }
  if (limit && limit > 0) {
    cards = cards.slice(0, limit);
  }

  console.log(`Auditing ${cards.length} cards...`);

  const baseline = await readJsonFile(BASELINE_PATH, {});
  const newBaseline = { ...baseline };
  const auditResults = [];
  let checkedCount = 0;
  let changedCount = 0;

  for (const card of cards) {
    const urls = [card.sourceUrl, ...(card.supportingSourceUrls || [])].filter((u) => u && /^https?:\/\//i.test(u));
    if (urls.length === 0) continue;

    checkedCount++;
    const primaryUrl = urls[0];
    const fetchResult = dryRun ? { url: primaryUrl, success: true, status: 200, text: `Mock body for ${card.id}` } : await fetchPage(primaryUrl);

    if (!fetchResult.success) {
      auditResults.push({
        cardId: card.id,
        cardName: card.name,
        issuer: card.issuer,
        url: primaryUrl,
        status: "error",
        error: fetchResult.error
      });
      continue;
    }

    const currentHash = computeSha256(fetchResult.text);
    const existingEntry = baseline[card.id];

    if (!existingEntry || updateBaseline) {
      newBaseline[card.id] = {
        cardName: card.name,
        issuer: card.issuer,
        url: primaryUrl,
        hash: currentHash,
        lastChecked: new Date().toISOString(),
        sampleText: fetchResult.text.slice(0, 300)
      };

      auditResults.push({
        cardId: card.id,
        cardName: card.name,
        issuer: card.issuer,
        url: primaryUrl,
        status: existingEntry ? "baseline-updated" : "baseline-created",
        hash: currentHash
      });
    } else if (existingEntry.hash !== currentHash) {
      changedCount++;
      const diff = computeSimpleDiff(existingEntry.sampleText || "", fetchResult.text);
      const keywords = classifyHighImpactKeywords([...diff.added, ...diff.removed]);

      newBaseline[card.id] = {
        ...existingEntry,
        hash: currentHash,
        lastChecked: new Date().toISOString(),
        sampleText: fetchResult.text.slice(0, 300)
      };

      auditResults.push({
        cardId: card.id,
        cardName: card.name,
        issuer: card.issuer,
        url: primaryUrl,
        status: "changed",
        previousHash: existingEntry.hash,
        currentHash,
        impactKeywords: keywords,
        diff
      });
    } else {
      auditResults.push({
        cardId: card.id,
        cardName: card.name,
        issuer: card.issuer,
        url: primaryUrl,
        status: "unchanged",
        hash: currentHash
      });
    }
  }

  await mkdir(AUDIT_DIR, { recursive: true });
  await mkdir(PENDING_DIR, { recursive: true });

  await writeFile(BASELINE_PATH, `${JSON.stringify(newBaseline, null, 2)}\n`, "utf8");

  const pendingOut = path.join(PENDING_DIR, `${new Date().toISOString().slice(0, 10)}-official-audit.json`);
  const summaryReport = {
    generatedAt: new Date().toISOString(),
    totalCardsInDb: cards.length,
    cardsAudited: checkedCount,
    cardsChanged: changedCount,
    updateBaseline,
    results: auditResults
  };

  await writeFile(pendingOut, `${JSON.stringify(summaryReport, null, 2)}\n`, "utf8");

  console.log(`Audit completed.`);
  console.log(`Cards Audited: ${checkedCount}`);
  console.log(`Baseline Updated: ${Object.keys(newBaseline).length} entries in data/official-audit/baseline.json`);
  console.log(`Changes Detected: ${changedCount}`);
  console.log(`Audit Log Saved: ${pendingOut}`);
}

if (process.argv[1] && process.argv[1].endsWith("audit-official-pages.mjs")) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
