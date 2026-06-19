const http = require('https');

const urls = [
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/landmark-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/landmark-rewards-front.png',
    'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/landmark-base-front.png'
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
    for (const url of urls) {
        const result = await checkUrl(url);
        console.log(`${result.url}: ${result.status} ${result.error || ''}`);
    }
}

main();
