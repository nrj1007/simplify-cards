const fs = require("fs");
const path = require("path");
const https = require("https");

// Usage:
//   node scripts/download-sbi-card-image.js <card-id> [url-or-local-html-path]
// Examples:
//   node scripts/download-sbi-card-image.js max-sbi-prime
//   node scripts/download-sbi-card-image.js max-sbi-prime https://www.sbicard.com/en/personal/credit-cards/shopping/max-sbi-card-prime.page

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Usage: node scripts/download-sbi-card-image.js <card-id> [url-or-local-html-path]");
  process.exit(1);
}

const repoRoot = path.join(__dirname, "..");
const cardId = args[0];
const explicitSource = args[1] ?? null;
const sbiCardPath = path.join(repoRoot, "data", "cards", "sbi", `${cardId}.json`);

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return fetchUrl(redirectUrl).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Request failed with status ${res.statusCode} for ${url}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(dest, () => {});
          const redirectUrl = new URL(res.headers.location, url).toString();
          return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          reject(new Error(`Download failed with status ${res.statusCode} for ${url}`));
          return;
        }

        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

function readSbiCard() {
  if (!fs.existsSync(sbiCardPath)) return null;
  return JSON.parse(fs.readFileSync(sbiCardPath, "utf8"));
}

function extractAttr(tag, attr) {
  const pattern = new RegExp(`${attr}=["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] ?? "";
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function buildKeywords(card) {
  const ignored = new Set(["sbi", "card", "credit", "bank", "prime", "select"]);
  const tokens = new Set([
    ...tokenize(card.id),
    ...tokenize(card.name),
    ...tokenize(card.sourceUrl ?? ""),
    ...tokenize(card.applyUrl ?? "")
  ]);

  if (tokens.has("hc")) {
    tokens.add("home");
    tokens.add("centre");
    tokens.add("center");
    tokens.add("lifestyle");
  }

  if (tokens.has("homecentre")) {
    tokens.add("home");
    tokens.add("centre");
    tokens.add("center");
  }

  return Array.from(tokens).filter((token) => token.length > 2 && !ignored.has(token));
}

function looksLikeImageUrl(url) {
  const lower = url.toLowerCase();
  return /\.(png|jpg|jpeg|webp)(?:$|[?#])/i.test(lower);
}

function inferExtension(url) {
  const ext = path.extname(url.split("?")[0]);
  return ext || ".png";
}

function extractMetaCandidates(content) {
  const candidates = [];
  const metaRegex = /<meta\b[^>]*>/gi;
  let match;

  while ((match = metaRegex.exec(content)) !== null) {
    const tag = match[0];
    const property = extractAttr(tag, "property");
    const name = extractAttr(tag, "name");
    const contentAttr = extractAttr(tag, "content");
    const label = `${property} ${name}`.toLowerCase();
    if (!contentAttr || !looksLikeImageUrl(contentAttr)) continue;
    if (!label.includes("image")) continue;
    candidates.push({ url: contentAttr, alt: "", title: "", attr: "meta" });
  }

  return candidates;
}

function extractImageCandidates(content) {
  const tagRegex = /<img\b[^>]*>/gi;
  const candidates = [];
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[0];
    const alt = extractAttr(tag, "alt");
    const title = extractAttr(tag, "title");
    for (const attr of ["data-src", "data-lazy-src", "src"]) {
      const url = extractAttr(tag, attr);
      if (!url || !looksLikeImageUrl(url)) continue;
      candidates.push({ url, alt, title, attr });
    }
  }

  return candidates;
}

function buildFallbackCandidates(card) {
  const pageSlug = (card.sourceUrl ?? card.applyUrl ?? "").split("/").pop() ?? "";
  const basename = pageSlug.replace(/\.(page|html)$/i, "");
  const guesses = new Set();

  if (basename) {
    guesses.add(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/network-card-images/${basename}.png`);
    guesses.add(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/network-card-images/${basename}.jpg`);
  }

  for (const keyword of buildKeywords(card)) {
    guesses.add(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/network-card-images/${keyword}.png`);
  }

  return Array.from(guesses).map((url) => ({ url, alt: "", title: "", attr: "fallback" }));
}

function scoreCandidate(candidate, keywords, card) {
  const urlText = normalizeText(candidate.url);
  const altText = normalizeText(candidate.alt);
  const titleText = normalizeText(candidate.title);
  const labelText = `${urlText} ${altText} ${titleText}`;
  let score = 0;

  if (candidate.url.includes("/network-card-images/")) score += 60;
  if (candidate.url.includes("/assets/media/images/personal/credit-cards/")) score += 25;
  if (candidate.attr === "meta") score += 8;
  if (candidate.attr === "fallback") score += 6;

  for (const keyword of keywords) {
    if (urlText.includes(keyword)) score += 12;
    if (altText.includes(keyword)) score += 8;
    if (titleText.includes(keyword)) score += 6;
  }

  const sourceSlug = normalizeText((card.sourceUrl ?? card.applyUrl ?? "").split("/").pop() ?? "");
  if (sourceSlug && urlText.includes(sourceSlug.replace(/\b(page|html)\b/g, "").trim())) score += 18;

  if (labelText.includes("prime")) score += 5;
  if (labelText.includes("select")) score += 5;
  if (labelText.includes("visa") || labelText.includes("mastercard")) score += 4;

  if (labelText.includes("logo") || labelText.includes("icon")) score -= 25;
  if (labelText.includes("banner") || labelText.includes("offer")) score -= 12;
  if (labelText.includes("welcome") || labelText.includes("gift")) score -= 20;
  if (labelText.includes("priority pass")) score -= 20;
  if (labelText.includes("feature")) score -= 8;

  return score;
}

async function main() {
  const card = readSbiCard();

  if (!card) {
    throw new Error(`Could not find SBI card with id '${cardId}' at data/cards/sbi/${cardId}.json`);
  }

  const source = explicitSource ?? card.sourceUrl ?? card.applyUrl;
  if (!source) {
    throw new Error(`No sourceUrl/applyUrl found for card '${cardId}'`);
  }

  let content = "";
  if (/^https?:\/\//i.test(source)) {
    console.log(`Fetching page content from URL: ${source}`);
    content = await fetchUrl(source);
  } else {
    console.log(`Reading page content from local file: ${source}`);
    content = fs.readFileSync(source, "utf8");
  }

  const keywords = buildKeywords(card);
  const candidates = [
    ...extractMetaCandidates(content),
    ...extractImageCandidates(content),
    ...buildFallbackCandidates(card)
  ]
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, keywords, card)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));

  const uniqueCandidates = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    uniqueCandidates.push(candidate);
  }

  console.log(`Found ${uniqueCandidates.length} SBI image candidates.`);
  if (uniqueCandidates.length === 0) {
    console.log("No good SBI card-face candidates found.");
    return;
  }

  console.log("\nTop SBI card image candidates:");
  uniqueCandidates.slice(0, 5).forEach((candidate, index) => {
    const altPart = candidate.alt ? ` | ALT: ${candidate.alt}` : "";
    console.log(`[${index + 1}] Score: ${candidate.score} | ${candidate.attr} | ${candidate.url}${altPart}`);
  });

  let downloadSuccess = false;
  for (const candidate of uniqueCandidates) {
    const currentUrl = candidate.url;
    const ext = inferExtension(currentUrl);
    const destName = `${cardId}${ext}`;
    const destPath = path.join(repoRoot, "public", "images", destName);

    console.log(`\nTrying candidate image: ${currentUrl}`);
    try {
      await downloadFile(currentUrl, destPath);
      // Double check that it's a valid non-empty file
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        console.log(`Saved image to public/images/${destName}`);
        
        // Update the JSON file
        card.imageUrl = `/images/${destName}`;
        fs.writeFileSync(sbiCardPath, JSON.stringify(card, null, 2) + "\n", "utf8");
        console.log(`Updated data/cards/sbi/${cardId}.json with imageUrl: "/images/${destName}"`);
        downloadSuccess = true;
        break;
      } else {
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        console.log(`Skipping: Downloaded file is too small or invalid.`);
      }
    } catch (err) {
      console.log(`Download failed for ${currentUrl}: ${err.message}`);
    }
  }

  if (!downloadSuccess) {
    throw new Error(`Failed to download any candidate image for card '${cardId}'`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
