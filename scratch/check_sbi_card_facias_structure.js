const https = require('https');

const categories = ['retail', 'co-brand', 'co-branded', 'lifestyle', 'shopping', 'travel', 'super-premium', 'premium', 'cards'];
const cardSlugs = [
    // Reliance
    'reliance-sbi-card', 'reliance-sbi-card-prime', 'reliance-sbi-prime', 'reliance-prime',
    // Shaurya
    'shaurya-sbi-card', 'shaurya-sbi', 'shaurya', 'shaurya-sbi-card-select', 'shaurya-select',
    // AURUM
    'aurum', 'aurum-sbi', 'aurum-sbi-card',
    // Apollo
    'apollo-sbi-card', 'apollo-sbi-card-select', 'apollo-sbi-select', 'apollo-select',
    // Doctor
    'doctors-sbi-card', 'doctor-sbi-card', 'doctors-sbi', 'doctor-sbi'
];

const urls = [];
for (const cat of categories) {
    for (const slug of cardSlugs) {
        // Pattern 1: <slug>-card-art.png
        urls.push(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/${cat}/${slug}/${slug}-card-art.png`);
        urls.push(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/${cat}/${slug}/${slug}.png`);
        urls.push(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/${cat}/${slug}/${slug}.jpg`);
        urls.push(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/${cat}/${slug}/card-art.png`);
        // Pattern 2: without category subfolder (directly under personal/credit-cards/<slug>/)
        urls.push(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/${slug}/${slug}-card-art.png`);
        urls.push(`https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/${slug}/${slug}.png`);
    }
}

// Remove duplicates
const uniqueUrls = Array.from(new Set(urls));
console.log(`Probing ${uniqueUrls.length} unique URLs...`);

let checkedCount = 0;
const results = [];

function checkNext() {
    if (checkedCount >= uniqueUrls.length) {
        if (results.length === uniqueUrls.length) {
            console.log('\n--- Probe Finished ---');
            const success = results.filter(r => r.status === 200);
            console.log(`Found ${success.length} valid images:`);
            success.forEach(s => console.log(s.url));
        }
        return;
    }

    const url = uniqueUrls[checkedCount++];
    const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        results.push({ url, status: res.statusCode });
        if (res.statusCode === 200) {
            console.log(`[FOUND] ${url}`);
        }
        checkNext();
    });
    req.on('error', (err) => {
        results.push({ url, status: 'error', error: err.message });
        checkNext();
    });
    req.end();
}

for (let i = 0; i < 15; i++) {
    checkNext();
}
