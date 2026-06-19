const fs = require('node:fs');
const path = require('node:path');

const cardsFile = path.join(__dirname, 'all_cards.json');
if (!fs.existsSync(cardsFile)) {
  console.error(`all_cards.json not found at ${cardsFile}. Run get_all_card_details.js first.`);
  process.exit(1);
}

const cards = JSON.parse(fs.readFileSync(cardsFile, 'utf8'));
console.log(`Loaded ${cards.length} cards for checking.`);

const DISCONTINUED_KEYWORDS = [
  'discontinued',
  'no longer offered',
  'no longer accepting',
  'applications closed',
  'withdrawn',
  'applications are closed',
  'stopped sourcing',
  'not accepting applications',
  'sourcing has been',
  'no longer available'
];

async function checkUrl(url) {
  if (!url || !url.startsWith('http')) {
    return { ok: false, status: 0, reason: 'Invalid URL' };
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    const body = await res.text();
    const bodyLower = body.toLowerCase();
    
    const matchedKeywords = [];
    for (const kw of DISCONTINUED_KEYWORDS) {
      if (bodyLower.includes(kw)) {
        matchedKeywords.push(kw);
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      redirected: res.redirected,
      finalUrl: res.url,
      matchedKeywords,
      length: body.length
    };
  } catch (err) {
    return { ok: false, status: 0, reason: err.message };
  }
}

async function runBatch(batch, batchNum) {
  console.log(`Starting Batch ${batchNum} (${batch.length} cards)...`);
  const results = [];
  
  for (const card of batch) {
    const check = { cardId: card.id, name: card.name, issuer: card.issuer, filePath: card.filePath, currentStatus: card.status };
    
    // Check sourceUrl
    if (card.sourceUrl) {
      const sourceRes = await checkUrl(card.sourceUrl);
      check.sourceUrlCheck = { url: card.sourceUrl, ...sourceRes };
    }
    
    // Check applyUrl if different
    if (card.applyUrl && card.applyUrl !== card.sourceUrl) {
      const applyRes = await checkUrl(card.applyUrl);
      check.applyUrlCheck = { url: card.applyUrl, ...applyRes };
    }

    results.push(check);
    // Add small delay between card checks to avoid aggressive rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

async function main() {
  const batchSize = 15;
  const results = [];
  
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const batchResults = await runBatch(batch, batchNum);
    results.push(...batchResults);
    
    // Write intermediate results
    fs.writeFileSync(path.join(__dirname, 'url_check_results.json'), JSON.stringify(results, null, 2), 'utf8');
    
    // Wait a bit between batches
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('All URL checks completed!');
}

main().catch(err => {
  console.error('Fatal error in main:', err);
});
