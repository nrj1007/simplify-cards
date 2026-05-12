const fs = require("node:fs");
const path = require("node:path");

const pendingDir = path.join(process.cwd(), "data", "community-signals", "pending");
const cardContentPath = path.join(process.cwd(), "data", "card-content.json");

function defaultContentType(signalType) {
  return signalType === "discussion" || signalType === "merchant-reward-behavior" ? "tip" : "update";
}

function summarizeText(value, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function dedupeUpdates(updates) {
  const seen = new Set();
  return updates.filter((update) => {
    const key = `${update.title}|${update.publishedAt}|${update.sourceUrl || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeTips(tips) {
  const seen = new Set();
  return tips.filter((tip) => {
    const key = `${tip.text}|${tip.sourceUrl || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readPendingFiles() {
  if (!fs.existsSync(pendingDir)) return [];

  return fs
    .readdirSync(pendingDir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left))
    .map((fileName) => ({
      fileName,
      ...readJson(path.join(pendingDir, fileName), {})
    }));
}

function buildAdditions(files) {
  const additions = {};
  const warnings = [];

  for (const file of files) {
    for (const signal of file.reviewQueue || []) {
      if (!signal.approvedForCardContent) continue;

      const cardIds = Array.isArray(signal.cardIds) ? signal.cardIds : [];
      if (cardIds.length === 0) {
        warnings.push(`${file.fileName}: "${signal.title}" is approved but missing cardIds`);
        continue;
      }

      const contentType = signal.contentType || defaultContentType(signal.signalType);

      for (const cardId of cardIds) {
        additions[cardId] ||= {};

        if (contentType === "update") {
          additions[cardId].updates ||= [];
          additions[cardId].updates.push({
            title: signal.title,
            summary: signal.summary || summarizeText(signal.candidateText || signal.title),
            sourceType: "technofino",
            sourceLabel: "TechnoFino",
            sourceUrl: signal.url,
            publishedAt: signal.publishedAt || String(file.generatedAt || "").slice(0, 10)
          });
        } else {
          additions[cardId].tips ||= [];
          additions[cardId].tips.push({
            text: signal.tipText || summarizeText(signal.candidateText || signal.title),
            sourceType: "technofino",
            sourceLabel: "TechnoFino",
            sourceUrl: signal.url
          });
        }
      }
    }
  }

  return { additions, warnings };
}

function mergeContent(base, additions) {
  const merged = { ...base };

  for (const [cardId, addition] of Object.entries(additions)) {
    const current = merged[cardId] || {};
    const next = {};

    if (current.updates || addition.updates) {
      next.updates = dedupeUpdates([...(current.updates || []), ...(addition.updates || [])]);
    }

    if (current.tips || addition.tips) {
      next.tips = dedupeTips([...(current.tips || []), ...(addition.tips || [])]);
    }

    merged[cardId] = next;
  }

  return merged;
}

function main() {
  const pendingFiles = readPendingFiles();
  const { additions, warnings } = buildAdditions(pendingFiles);
  const current = readJson(cardContentPath, {});
  const merged = mergeContent(current, additions);

  fs.writeFileSync(cardContentPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  console.log(`Pending files: ${pendingFiles.length}`);
  console.log(`Cards updated: ${Object.keys(additions).length}`);
  console.log(`Wrote ${cardContentPath}`);
}

main();
