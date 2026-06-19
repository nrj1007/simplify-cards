const https = require('https');

const cardNames = [
  'spar-prime', 'spar-sbi-prime', 'spar-sbi-card-prime',
  'spar-select', 'spar-sbi-select', 'spar-sbi-card-select'
];

const folders = [
  'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/horizontal/',
  'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/shopping/',
  'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/network-card-images/',
  'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/'
];

const extensions = ['.png', '.jpg', '.jpeg', '.webp'];

const urls = [];
for (const name of cardNames) {
  for (const folder of folders) {
    for (const ext of extensions) {
      urls.push(`${folder}${name}${ext}`);
    }
  }
}

console.log(`Probing ${urls.length} Spar variant URLs...`);

let checkedCount = 0;
const results = [];

function checkNext() {
  if (checkedCount >= urls.length) {
    console.log('\n--- Probe Finished ---');
    const success = results.filter(r => r.status === 200);
    console.log(`Found ${success.length} valid images:`);
    success.forEach(s => console.log(`${s.url} -> ${s.status}`));
    return;
  }

  const url = urls[checkedCount++];
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      results.push({ url, status: 200 });
      console.log(`[FOUND] ${url}`);
    } else {
      results.push({ url, status: res.statusCode });
    }
    setTimeout(checkNext, 30);
  }).on('error', (err) => {
    results.push({ url, status: 'error', error: err.message });
    setTimeout(checkNext, 30);
  });
}

for (let i = 0; i < 10; i++) {
  checkNext();
}
