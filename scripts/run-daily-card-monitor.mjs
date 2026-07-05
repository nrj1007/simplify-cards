#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DAILY_DIR = path.join(process.cwd(), "data", "daily-audits");
const TODAY = new Date().toISOString().slice(0, 10);
const SUMMARY_JSON_PATH = path.join(DAILY_DIR, `${TODAY}-summary.json`);
const REPORT_MD_PATH = path.join(DAILY_DIR, `${TODAY}-report.md`);

async function readJson(filePath, fallback = {}) {
  if (!existsSync(filePath)) return fallback;
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function runScript(command) {
  try {
    console.log(`Executing: ${command}`);
    const output = execSync(command, { encoding: "utf8", cwd: process.cwd(), timeout: 120000 });
    return { success: true, output };
  } catch (err) {
    console.error(`Script failed: ${command}`, err.message);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log(`=== OpenClaw Daily Card Monitor: ${TODAY} ===\n`);

  await mkdir(DAILY_DIR, { recursive: true });

  // Step 1: Run Official Bank Pages Audit
  console.log("Step 1: Running Official Bank Pages Audit...");
  const officialAuditRun = runScript("node ./scripts/audit-official-pages.mjs");
  const officialAuditFile = path.join(process.cwd(), "data", "official-audit", "pending", `${TODAY}-official-audit.json`);
  const officialData = await readJson(officialAuditFile, { results: [] });

  const changedBankPages = (officialData.results || []).filter((r) => r.status === "changed");

  // Step 2: Run Technofino Community Signals Scraper (Last 24 Hours)
  console.log("\nStep 2: Running Technofino Community Signals Scraper (24h)...");
  const communityRun = runScript("node ./skills/community-signals/scripts/scrape-technofino.mjs --hours 24 --created-only");
  const communityFile = path.join(process.cwd(), "data", "community-signals", "pending", `${TODAY}-technofino.json`);
  const communityData = await readJson(communityFile, { threads: [], reviewQueue: [] });

  // Step 3: Combine Results into Daily Summary JSON
  const summary = {
    date: TODAY,
    generatedAt: new Date().toISOString(),
    officialPages: {
      auditedCount: officialData.cardsAudited || 0,
      changedCount: changedBankPages.length,
      changedCards: changedBankPages.map((c) => ({
        cardId: c.cardId,
        cardName: c.cardName,
        issuer: c.issuer,
        url: c.url,
        impactKeywords: c.impactKeywords || []
      }))
    },
    communitySignals: {
      scannedHours: 24,
      newThreadsCount: (communityData.threads || []).length,
      reviewSignalsCount: (communityData.reviewQueue || []).length,
      newThreads: (communityData.threads || []).map((t) => ({
        title: t.title,
        url: t.url,
        forum: t.forum,
        matchedCards: (t.relevance?.cardMatches || []).map((m) => m.cardName)
      }))
    }
  };

  await writeFile(SUMMARY_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  // Step 4: Build Human-Readable Markdown Report for OpenClaw Notification
  let reportMd = `# OpenClaw Daily Credit Card Monitor Report (${TODAY})\n\n`;
  reportMd += `**Generated:** ${summary.generatedAt}\n\n`;

  reportMd += `## 1. Official Bank Pages Audit\n`;
  reportMd += `- **Cards Audited:** ${summary.officialPages.auditedCount}\n`;
  reportMd += `- **Official Page Changes:** ${summary.officialPages.changedCount}\n\n`;

  if (changedBankPages.length > 0) {
    reportMd += `| Card | Issuer | Keywords | Official URL |\n`;
    reportMd += `| :--- | :--- | :--- | :--- |\n`;
    for (const item of summary.officialPages.changedCards) {
      reportMd += `| **${item.cardName}** | ${item.issuer} | \`${item.impactKeywords.join(", ") || "content-changed"}\` | [Bank Link](${item.url}) |\n`;
    }
    reportMd += `\n`;
  } else {
    reportMd += `*No official bank page term changes detected today.*\n\n`;
  }

  reportMd += `## 2. Technofino Community Signals (Last 24 Hours)\n`;
  reportMd += `- **New Community Threads:** ${summary.communitySignals.newThreadsCount}\n`;
  reportMd += `- **Actionable Signals:** ${summary.communitySignals.reviewSignalsCount}\n\n`;

  if (summary.communitySignals.newThreads.length > 0) {
    reportMd += `| Thread Title | Forum | Matched Cards | Link |\n`;
    reportMd += `| :--- | :--- | :--- | :--- |\n`;
    for (const thread of summary.communitySignals.newThreads) {
      reportMd += `| **${thread.title}** | ${thread.forum} | ${thread.matchedCards.join(", ") || "General"} | [Technofino](${thread.url}) |\n`;
    }
    reportMd += `\n`;
  } else {
    reportMd += `*No new credit card community threads detected in the last 24 hours.*\n\n`;
  }

  reportMd += `\n---\n*Report saved to \`data/daily-audits/${TODAY}-summary.json\` and \`data/daily-audits/${TODAY}-report.md\`*\n`;

  await writeFile(REPORT_MD_PATH, reportMd, "utf8");

  console.log("\n=== Daily Monitor Completed Successfully ===");
  console.log(`Summary JSON: ${SUMMARY_JSON_PATH}`);
  console.log(`Markdown Report: ${REPORT_MD_PATH}`);
  console.log(`\n--- OpenClaw Notification Report Preview ---`);
  console.log(reportMd);
}

if (process.argv[1] && process.argv[1].endsWith("run-daily-card-monitor.mjs")) {
  main().catch((err) => {
    console.error("Daily Monitor Error:", err);
    process.exitCode = 1;
  });
}
