const https = require('https');

const dates = [
  '2021/07', '2021/08', '2021/11',
  '2022/07', '2022/08', '2022/11',
  '2025/11', '2025/12', '2026/01'
];

const names = [
  'Spar-SBI-Card', 'Spar-SBI-Card-Select', 'Spar-SBI-Card-SELECT', 'Spar-SBI', 'spar-sbi', 'spar-sbi-card',
  'Max-SBI-Card', 'Max-SBI-Card-Select', 'Max-SBI-Card-SELECT', 'Max-SBI', 'max-sbi', 'max-sbi-card',
  'Landmark-Rewards-SBI-Card-SELECT', 'Landmark-Rewards-SBI-Card'
];

const extensions = ['.png', '.jpg', '.jpeg', '.webp'];

const urls = [];
for (const date of dates) {
  for (const name of names) {
    for (const ext of extensions) {
      urls.push(`https://cardinside.b-cdn.net/wp-content/uploads/${date}/${name}${ext}`);
    }
  }
}

console.log(`Probing ${urls.length} URLs on CardInsider CDN...`);

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

for (let i = 0; i < 15; i++) {
  checkNext();
}
