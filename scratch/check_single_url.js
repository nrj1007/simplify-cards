const https = require('https');
const url = 'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/landmark-base-front.png';
https.get(url, (res) => {
    console.log('Status code:', res.statusCode);
}).on('error', (err) => {
    console.error('Error:', err);
});
