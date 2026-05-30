const fs = require('fs');
const path = require('path');
const https = require('https');

// Usage: node scripts/download-card-image.js <card-id> <url-or-html-path> [base-url]
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/download-card-image.js <card-id> <url-or-local-html-path> [base-url]');
  process.exit(1);
}

const cardId = args[0];
const source = args[1];
const baseUrl = args[2] || 'https://www.indusind.com'; // Default fallback base url for relative paths

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Handle redirects if any
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
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
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  let content = '';
  if (source.startsWith('http://') || source.startsWith('https://')) {
    console.log(`Fetching page content from URL: ${source}...`);
    content = await fetchUrl(source);
  } else {
    console.log(`Reading page content from local file: ${source}...`);
    content = fs.readFileSync(source, 'utf8');
  }

  // Find all image sources and data-thumbnails
  const imgRegex = /src=["']([^"']+\.(?:png|jpg|jpeg|webp))["']/gi;
  const dataThumbnailRegex = /data-thumbnail=["']([^"']+\.(?:png|jpg|jpeg|webp))["']/gi;
  
  const urls = new Set();
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }
  while ((match = dataThumbnailRegex.exec(content)) !== null) {
    urls.add(match[1]);
  }

  const list = Array.from(urls);
  console.log(`Found ${list.length} total image references on the page.`);

  // Score images based on keywords
  const keywords = cardId.split('-');
  const candidates = list.map(url => {
    let score = 0;
    const lowerUrl = url.toLowerCase();
    
    // Primary matches: contains the card ID parts
    keywords.forEach(kw => {
      if (kw.length > 2 && lowerUrl.includes(kw)) score += 10;
    });

    if (lowerUrl.includes('card')) score += 5;
    if (lowerUrl.includes('thumbnail') || lowerUrl.includes('th-') || lowerUrl.includes('th_')) score += 5;
    if (lowerUrl.includes('banner')) score += 2;
    if (lowerUrl.includes('logo') || lowerUrl.includes('icon')) score -= 8; // usually logos are not card faces

    return { url, score };
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    console.log('No good card face candidates found. All images found:');
    list.slice(0, 20).forEach(url => console.log(` - ${url}`));
    return;
  }

  console.log('\nTop card face image candidates found:');
  candidates.slice(0, 5).forEach((c, idx) => {
    console.log(`[${idx + 1}] Score: ${c.score} | URL: ${c.url}`);
  });

  const bestCandidate = candidates[0].url;
  let fullImageUrl = bestCandidate;
  if (!bestCandidate.startsWith('http://') && !bestCandidate.startsWith('https://')) {
    fullImageUrl = new URL(bestCandidate, baseUrl).toString();
  }

  const ext = path.extname(bestCandidate) || '.webp';
  const destName = `${cardId}${ext}`;
  const destPath = path.join(__dirname, '..', 'public', 'images', destName);

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

main().catch(err => {
  console.error(err);
});
