const https = require('https');
const fs = require('fs');

const url = 'https://www.sbicard.com/en/personal/credit-cards/reliance-sbi-card-prime.html';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('temp_reliance_prime.html', data);
    console.log('HTML saved to temp_reliance_prime.html, size:', data.length);
    
    // Find all img tags
    const regex = /<img[^>]+src="([^">]+)"/g;
    let match;
    const images = [];
    while ((match = regex.exec(data)) !== null) {
      images.push(match[1]);
    }
    console.log('Found images:', images);
    
    // Also look for background images or json resources
    const allUrls = data.match(/https?:\/\/[^"'\s\)]+/g) || [];
    console.log('Found potential URLs:', allUrls.filter(u => u.includes('image') || u.includes('.png') || u.includes('.jpg') || u.includes('.webp')));
  });
}).on('error', (err) => {
  console.error('Error:', err);
});
