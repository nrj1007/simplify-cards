const fs = require("fs");
const path = require("path");
const https = require("https");

// Usage: node scripts/download-card-image.js <card-id> <url-or-local-html-path> [base-url]
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node scripts/download-card-image.js <card-id> <url-or-local-html-path> [base-url]");
  process.exit(1);
}

const cardId = args[0];
const source = args[1];
const baseUrl = args[2] || "https://www.indusind.com";

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function extractAttr(tag, attr) {
  const pattern = new RegExp(`${attr}=["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] ?? "";
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function keywordVariants(value) {
  const normalized = normalizeText(value);
  const variants = new Set([normalized]);

  if (normalized.includes("millenia")) variants.add(normalized.replace(/millenia/g, "millennia"));
  if (normalized.includes("millennia")) variants.add(normalized.replace(/millennia/g, "millenia"));
  if (normalized.includes("diners")) variants.add(normalized.replace(/diners/g, "diner"));
  if (normalized.includes("diner")) variants.add(normalized.replace(/diner/g, "diners"));

  return Array.from(variants);
}

function buildKeywords(id) {
  const rawParts = id
    .split("-")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !["hdfc", "bank", "card", "credit"].includes(part));

  const parts = new Set();
  for (const part of rawParts) {
    for (const variant of keywordVariants(part)) {
      for (const token of variant.split(/\s+/)) {
        if (token.length > 2) parts.add(token);
      }
    }
  }

  return Array.from(parts);
}

function joinedKeywordPhrases(keywords) {
  const phrases = [];
  if (keywords.includes("millennia")) phrases.push("millennia credit card");
  if (keywords.includes("millenia")) phrases.push("millenia credit card");
  if (keywords.includes("regalia") && keywords.includes("gold")) phrases.push("regalia gold credit card");
  if (keywords.includes("diners") && keywords.includes("black")) phrases.push("diners club black");
  return phrases;
}

function looksLikeImageUrl(url) {
  const lower = url.toLowerCase();
  return (
    /\.(png|jpg|jpeg|webp)(?:$|[?#])/i.test(lower) ||
    lower.includes("/is/image/") ||
    /[?&]fmt=(?:png|jpg|jpeg|webp)/i.test(lower)
  );
}

function inferExtension(url) {
  const pathname = url.split("?")[0];
  const ext = path.extname(pathname);
  if (ext) return ext;

  const fmt = url.match(/[?&]fmt=([a-z0-9-]+)/i)?.[1]?.toLowerCase() ?? "";
  if (fmt.includes("png")) return ".png";
  if (fmt.includes("jpg") || fmt.includes("jpeg")) return ".jpg";
  if (fmt.includes("webp")) return ".webp";
  return ".webp";
}

function scoreCandidate(candidate, keywords) {
  const urlText = normalizeText(candidate.url);
  const altText = normalizeText(candidate.alt);
  const titleText = normalizeText(candidate.title);
  const labelText = `${urlText} ${altText} ${titleText}`;
  let score = 0;
  const phrases = joinedKeywordPhrases(keywords);

  for (const keyword of keywords) {
    if (urlText.includes(keyword)) score += 10;
    if (altText.includes(keyword)) score += 14;
    if (titleText.includes(keyword)) score += 6;
  }

  for (const phrase of phrases) {
    if (urlText.includes(phrase)) score += 18;
    if (altText.includes(phrase)) score += 10;
  }

  if (candidate.attr === "data-src") score += 6;
  if (candidate.attr === "data-thumbnail") score += 4;
  if (candidate.url.includes("/is/image/")) score += 8;
  if (urlText.includes("card")) score += 5;
  if (altText.includes("credit card") || altText.includes("card")) score += 5;
  if (urlText.includes("compare-card") || urlText.includes("facia") || urlText.includes("facia")) score += 4;
  if (urlText.includes("thumbnail") || urlText.includes("th ") || urlText.includes("th-") || urlText.includes("th_")) score += 3;
  if (urlText.includes("preview-img")) score -= 12;
  if (urlText.includes("c card") || urlText.includes("/c-card")) score -= 10;
  if (urlText.includes("card facias gen") || urlText.includes("generic")) score -= 10;
  if (urlText.includes("logo") || urlText.includes("icon") || urlText.includes("ads-block")) score -= 12;
  if (labelText.includes("banner")) score -= 5;
  if (labelText.includes("print")) score -= 10;
  if (!candidate.alt && !candidate.title && !urlText.includes("card")) score -= 2;

  return score;
}

function extractCandidates(content) {
  const tagRegex = /<img\b[^>]*>/gi;
  const candidates = [];
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[0];
    const alt = extractAttr(tag, "alt");
    const title = extractAttr(tag, "title");
    for (const attr of ["data-src", "data-thumbnail", "src"]) {
      const url = extractAttr(tag, attr);
      if (!url || !looksLikeImageUrl(url)) continue;
      candidates.push({ url, alt, title, attr });
    }
  }

  return candidates;
}

async function main() {
  let content = "";
  if (source.startsWith("http://") || source.startsWith("https://")) {
    console.log(`Fetching page content from URL: ${source}...`);
    content = await fetchUrl(source);
  } else {
    console.log(`Reading page content from local file: ${source}...`);
    content = fs.readFileSync(source, "utf8");
  }

  const keywords = buildKeywords(cardId);
  const candidates = extractCandidates(content)
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, keywords)
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

  console.log(`Found ${uniqueCandidates.length} candidate image references on the page.`);

  if (uniqueCandidates.length === 0) {
    console.log("No good card face candidates found.");
    return;
  }

  console.log("\nTop card face image candidates found:");
  uniqueCandidates.slice(0, 5).forEach((candidate, idx) => {
    const altText = candidate.alt ? ` | ALT: ${candidate.alt}` : "";
    console.log(`[${idx + 1}] Score: ${candidate.score} | ${candidate.attr} | URL: ${candidate.url}${altText}`);
  });

  const bestCandidate = uniqueCandidates[0].url;
  const fullImageUrl = bestCandidate.startsWith("http://") || bestCandidate.startsWith("https://")
    ? bestCandidate
    : new URL(bestCandidate, baseUrl).toString();

  const ext = inferExtension(fullImageUrl);
  const destName = `${cardId}${ext}`;
  const destPath = path.join(__dirname, "..", "public", "images", destName);

  console.log(`\nDownloading top candidate image to: public/images/${destName}`);
  console.log(`Source URL: ${fullImageUrl}`);

  try {
    await downloadFile(fullImageUrl, destPath);
    console.log(`Successfully downloaded card image to public/images/${destName}`);
    console.log(`You can now reference this image in your JSON file: "imageUrl": "/images/${destName}"`);
  } catch (err) {
    console.error(`Failed to download image: ${err.message}`);
  }
}

main().catch((err) => {
  console.error(err);
});
