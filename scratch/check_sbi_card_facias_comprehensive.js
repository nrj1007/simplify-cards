const https = require('https');

const cardNames = [
    // Reliance
    'reliance-sbi-card-prime', 'reliance-card-prime', 'reliance-sbi-prime', 'reliance-prime',
    'reliance-sbi-card', 'reliance-card', 'reliance-sbi', 'reliance',
    // Shaurya
    'shaurya-sbi-card', 'shaurya-card', 'shaurya-sbi', 'shaurya',
    // AURUM
    'aurum-sbi-card', 'aurum-card', 'aurum-sbi', 'aurum',
    // Apollo Select
    'apollo-sbi-card-select', 'apollo-card-select', 'apollo-sbi-select', 'apollo-select', 'apollo',
    // Doctor's
    'doctor-sbi-card', 'doctor-card', 'doctor-sbi', 'doctor',
    'doctors-sbi-card', 'doctors-card', 'doctors-sbi', 'doctors'
];

const folders = [
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/horizontal/',
    'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/shopping/',
    'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/lifestyle/',
    'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/travel/',
    'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/network-card-images/',
    'https://www.sbicard.com/sbi-card-en/assets/media/images/personal/credit-cards/'
];

const suffixes = ['', '-front', '-base-front', '-select-front', '-prime-front'];
const extensions = ['.png', '.jpg', '.jpeg', '.webp'];

const urls = [];
for (const name of cardNames) {
    for (const folder of folders) {
        for (const suffix of suffixes) {
            for (const ext of extensions) {
                urls.push(`${folder}${name}${suffix}${ext}`);
            }
        }
    }
}

console.log(`Probing ${urls.length} URLs...`);

let checkedCount = 0;
const results = [];

function checkNext() {
    if (checkedCount >= urls.length) {
        if (results.length === urls.length) {
            console.log('\n--- Probe Finished ---');
            const success = results.filter(r => r.status === 200);
            console.log(`Found ${success.length} valid images:`);
            success.forEach(s => console.log(s.url));
        }
        return;
    }

    const url = urls[checkedCount++];
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

// Start concurrent checks (e.g. 15 at a time)
for (let i = 0; i < 15; i++) {
    checkNext();
}
