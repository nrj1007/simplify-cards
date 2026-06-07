const https = require('https');
const fs = require('fs');
const sharp = require('sharp');

// Official HDFC Bank scene7 CDN image for IRCTC card
const url = 'https://s7ap1.scene7.com/is/image/hdfcbankPWS/Card-Facia-IRCTC?fmt=webp-alpha&wid=800&hei=500';

function get(url, redirectCount) {
  redirectCount = redirectCount || 0;
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        'Referer': 'https://www.hdfc.bank.in/',
        'Accept': 'image/webp,image/*,*/*'
      }
    }, (res) => {
      const ct = (res.headers['content-type'] || '');
      console.log('Status:', res.statusCode, 'Type:', ct);
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        resolve(get(res.headers.location, redirectCount + 1));
        return;
      }
      if (res.statusCode === 200 && ct.match(/image/)) {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      } else {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode + ' ' + ct));
      }
    }).on('error', reject);
  });
}

async function run() {
  try {
    const buf = await get(url);
    console.log('Buffer size:', buf.length);
    const meta = await sharp(buf).metadata();
    console.log('Image:', meta.width, 'x', meta.height, meta.format);

    const BG_W = 800, BG_H = 500;
    const scale = Math.min((BG_W * 0.80) / meta.width, (BG_H * 0.80) / meta.height);
    const resW = Math.round(meta.width * scale);
    const resH = Math.round(meta.height * scale);
    const left = Math.round((BG_W - resW) / 2);
    const top = Math.round((BG_H - resH) / 2);

    const card = await sharp(buf).resize(resW, resH).toBuffer();
    await sharp({ create: { width: BG_W, height: BG_H, channels: 3, background: { r: 247, g: 244, b: 237 } } })
      .composite([{ input: card, left, top }])
      .webp({ quality: 92 })
      .toFile('public/images/hdfc-irctc.webp');

    console.log('Done: public/images/hdfc-irctc.webp');
  } catch(e) {
    console.error('Error:', e.message);

    // Try alternate URL without size params
    try {
      const buf2 = await get('https://s7ap1.scene7.com/is/image/hdfcbankPWS/Card-Facia-IRCTC?fmt=webp-alpha');
      console.log('Alt buffer size:', buf2.length);
      const meta2 = await sharp(buf2).metadata();
      console.log('Alt image:', meta2.width, 'x', meta2.height);
      const BG_W = 800, BG_H = 500;
      const scale = Math.min((BG_W * 0.80) / meta2.width, (BG_H * 0.80) / meta2.height);
      const resW = Math.round(meta2.width * scale);
      const resH = Math.round(meta2.height * scale);
      const card2 = await sharp(buf2).resize(resW, resH).toBuffer();
      await sharp({ create: { width: BG_W, height: BG_H, channels: 3, background: { r: 247, g: 244, b: 237 } } })
        .composite([{ input: card2, left: Math.round((BG_W - resW)/2), top: Math.round((BG_H - resH)/2) }])
        .webp({ quality: 92 })
        .toFile('public/images/hdfc-irctc.webp');
      console.log('Done (alt): public/images/hdfc-irctc.webp');
    } catch(e2) {
      console.error('Alt also failed:', e2.message);
    }
  }
}

run();
