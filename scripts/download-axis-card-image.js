const fs = require("fs");
const path = require("path");
const https = require("https");

// Usage:
//   node scripts/download-axis-card-image.js <card-id> [url-or-local-html-path]
// Examples:
//   node scripts/download-axis-card-image.js axis-flipkart
//   node scripts/download-axis-card-image.js axis-flipkart https://www.axis.bank.in/cards/credit-card/flipkart-axisbank-credit-card

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Usage: node scripts/download-axis-card-image.js <card-id> [url-or-local-html-path]");
  process.exit(1);
}

const repoRoot = path.join(__dirname, "..");
const cardId = args[0];
const explicitSource = args[1] ?? null;
const axisCardPath = path.join(repoRoot, "data", "cards", "axis", `${cardId}.json`);
const listingFallbacks = [
  "https://www.axis.bank.in/cards/credit-card",
  "https://www.axisbank.com/retail/cards/credit-card"
];

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

function readAxisCard() {
  if (!fs.existsSync(axisCardPath)) return null;
  return JSON.parse(fs.readFileSync(axisCardPath, "utf8"));
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
  const ignored = new Set(["axis", "bank", "credit", "card"]);
  const tokens = new Set([
    ...tokenize(card.id),
    ...tokenize(card.name),
    ...tokenize(card.sourceUrl ?? ""),
    ...tokenize(card.applyUrl ?? "")
  ]);

  if (tokens.has("flipkart")) tokens.add("flipkart");
  if (tokens.has("airtel")) tokens.add("airtel");
  if (tokens.has("atlas")) tokens.add("atlas");
  if (tokens.has("magnus")) tokens.add("magnus");
  if (tokens.has("my")) tokens.add("myzone");
  if (tokens.has("zone")) tokens.add("myzone");

  return Array.from(tokens).filter((token) => token.length > 2 && !ignored.has(token));
}

function looksLikeImageUrl(url) {
  const lower = url.toLowerCase();
  return /\.(png|jpg|jpeg|webp)(?:$|[?#])/i.test(lower);
}

function inferExtension(url) {
  const ext = path.extname(url.split("?")[0]);
  return ext || ".webp";
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

function scoreCandidate(candidate, keywords, card) {
  const urlText = normalizeText(candidate.url);
  const altText = normalizeText(candidate.alt);
  const titleText = normalizeText(candidate.title);
  const labelText = `${urlText} ${altText} ${titleText}`;
  let score = 0;

  if (candidate.url.includes("/images/default-source/creditcard/webp/")) score += 60;
  if (candidate.url.includes("/images/default-source/")) score += 20;
  if (candidate.attr === "meta") score += 8;
  if (candidate.attr === "data-src") score += 5;

  for (const keyword of keywords) {
    if (urlText.includes(keyword)) score += 12;
    if (altText.includes(keyword)) score += 10;
    if (titleText.includes(keyword)) score += 8;
  }

  const sourceSlug = normalizeText((card.sourceUrl ?? card.applyUrl ?? "").split("/").pop() ?? "");
  if (sourceSlug && urlText.includes(sourceSlug.replace(/\b(page|html)\b/g, "").trim())) score += 16;

  if (labelText.includes("credit card")) score += 6;
  if (labelText.includes("webp")) score += 4;

  if (labelText.includes("banner")) score -= 12;
  if (labelText.includes("offer")) score -= 10;
  if (labelText.includes("logo") || labelText.includes("icon")) score -= 25;
  if (labelText.includes("hero") || labelText.includes("background")) score -= 16;
  if (labelText.includes("mobile")) score -= 4;

  return score;
}

async function collectCandidatesFromSource(source, card) {
  let content = "";
  let baseUrl = "https://www.axis.bank.in";

  if (/^https?:\/\//i.test(source)) {
    content = await fetchUrl(source);
    baseUrl = new URL(source).origin;
  } else {
    content = fs.readFileSync(source, "utf8");
  }

  return [
    ...extractMetaCandidates(content),
    ...extractImageCandidates(content)
  ].map((candidate) => ({
    ...candidate,
    url: candidate.url.startsWith("http://") || candidate.url.startsWith("https://")
      ? candidate.url
      : new URL(candidate.url, baseUrl).toString()
  }));
}

async function main() {
  const card = readAxisCard();

  if (!card) {
    throw new Error(`Could not find Axis card with id '${cardId}' at data/cards/axis/${cardId}.json`);
  }

  const source = explicitSource ?? card.sourceUrl ?? card.applyUrl;
  if (!source) {
    throw new Error(`No sourceUrl/applyUrl found for card '${cardId}'`);
  }

  const keywords = buildKeywords(card);
  const sources = [source, ...listingFallbacks.filter((url) => url !== source)];
  const rawCandidates = [];

  for (const currentSource of sources) {
    try {
      console.log(`Scanning: ${currentSource}`);
      const candidates = await collectCandidatesFromSource(currentSource, card);
      rawCandidates.push(...candidates);
    } catch (error) {
      console.log(`Skipping ${currentSource}: ${error.message}`);
    }
  }

  const candidates = rawCandidates
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

  console.log(`Found ${uniqueCandidates.length} Axis image candidates.`);
  if (uniqueCandidates.length === 0) {
    console.log("No good Axis card-face candidates found.");
    return;
  }

  console.log("\nTop Axis card image candidates:");
  uniqueCandidates.slice(0, 5).forEach((candidate, index) => {
    const altPart = candidate.alt ? ` | ALT: ${candidate.alt}` : "";
    console.log(`[${index + 1}] Score: ${candidate.score} | ${candidate.attr} | ${candidate.url}${altPart}`);
  });

  const bestUrl = uniqueCandidates[0].url;
  const ext = inferExtension(bestUrl);
  const destName = `${cardId}${ext}`;
  const destPath = path.join(repoRoot, "public", "images", destName);

  console.log(`\nDownloading top candidate image to public/images/${destName}`);
  console.log(`Source URL: ${bestUrl}`);

  await downloadFile(bestUrl, destPath);

  console.log(`Saved image to public/images/${destName}`);
  console.log(`Set this in data/cards/axis/${cardId}.json: "imageUrl": "/images/${destName}"`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
