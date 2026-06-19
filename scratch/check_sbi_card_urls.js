const http = require('https');

const candidates = [
    // Reliance Prime
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/reliance-prime-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/reliance-sbi-prime-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/reliance-card-prime-front.png',
    
    // Reliance Base
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/reliance-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/reliance-sbi-front.png',
    
    // Shaurya
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/shaurya-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/shaurya-sbi-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/shaurya-card-front.png',
    
    // AURUM
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/aurum-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/aurum-sbi-front.png',
    
    // Apollo Select
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/apollo-select-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/apollo-sbi-select-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/apollo-front.png',
    
    // Doctor's
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/doctor-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/doctor-sbi-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/doctors-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/doctors-sbi-front.png'
];

function checkUrl(url) {
    return new Promise((resolve) => {
        const req = http.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
            resolve({ url, status: res.statusCode });
        });
        req.on('error', (err) => {
            resolve({ url, status: null, error: err.message });
        });
        req.end();
    });
}

async function main() {
    for (const url of candidates) {
        const result = await checkUrl(url);
        if (result.status === 200) {
            console.log(`[FOUND 200] ${result.url}`);
        } else {
            console.log(`[FAILED ${result.status}] ${result.url}`);
        }
    }
}

main();
