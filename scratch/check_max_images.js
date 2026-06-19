const https = require('https');

const candidates = [
  'max',
  'max-sbi',
  'max-sbi-card',
  'max-select',
  'max-sbi-select',
  'max-sbi-card-select',
  'max-prime',
  'max-sbi-prime',
  'max-sbi-card-prime',
  'landmark-max',
  'landmark-rewards-max',
  'landmark-rewards-sbi-max',
  'landmark-rewards-sbi-select',
  'landmark-rewards-sbi-prime',
  'landmark-select',
  'landmark-prime',
  'landmark-sbi-select',
  'landmark-sbi-prime'
];

const folders = [
  'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/horizontal/',
  'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/shopping/',
  'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/network-card-images/',
  'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/travel/'
];

const extensions = ['.png', '.jpg', '.webp'];

const urls = [];
for (const cand of candidates) {
  for (const folder of folders) {
    for (const ext of extensions) {
      urls.push(`${folder}${cand}${ext}`);
    }
  }
}

console.log(`Probing ${urls.length} URLs for Max card variants...`);

let doneCount = 0;
const results = [];

function checkUrl(url) {
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      results.push({ url, status: 200 });
      console.log(`[FOUND] ${url} (${res.statusCode})`);
    } else if (res.statusCode !== 404) {
      results.push({ url, status: res.statusCode });
      console.log(`[OTHER] ${url} (${res.statusCode})`);
    }
    
    doneCount++;
    if (doneCount === urls.length) {
      printSummary();
    }
  }).on('error', (err) => {
    doneCount++;
    if (doneCount === urls.length) {
      printSummary();
    }
  });
}

function printSummary() {
  console.log('\n=== PROBE COMPLETE ===');
  console.log(`Found ${results.filter(r => r.status === 200).length} valid images:`);
  results.filter(r => r.status === 200).forEach(r => console.log(r.url));
}

urls.forEach(url => checkUrl(url));
