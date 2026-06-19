const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const candidates = [
  'tata-neu-plus',
  'tata-neu-p',
  'tata-neu-plus-card',
  'tata-neu-p-card',
  'tata-neu-card',
  'hdfc-tata-neu-plus',
  'hdfc-tata-neu-plus-card',
  'tata-neu-plus-hdfc',
  'tata-neu-plus-hdfc-card',
  'tata-neu-plus-credit-card',
  'tata-neu-p-compare-card',
  'tata-neu-plus-compare',
  'tata-neu-p-compare',
  'tata-neu-plus-facia',
  'tata-neu-plus-face',
  'tata-neu-plus-front',
  'tata-neu-plus-compare-card-facia',
  'tata-neu-p-facia',
  'tata-neu-p-face',
  'tata-neu-p-front'
];

async function checkUrl(name) {
  const url = `https://s7ap1.scene7.com/is/image/hdfcbankPWS/${name}`;
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD' }, (res) => {
      if (res.statusCode === 200) {
        resolve(res.headers['content-length'] ? parseInt(res.headers['content-length']) : 0);
      } else {
        resolve(null);
      }
    }).on('error', () => {
      resolve(null);
    }).end();
  });
}

async function run() {
  console.log('Scanning Scene7 candidates...');
  for (const name of candidates) {
    const size = await checkUrl(name);
    if (size !== null) {
      console.log(`Found active asset: ${name} (size: ${size} bytes)`);
      // Let's download a small sample to check its dimensions
      await new Promise((resolve) => {
        https.get(`https://s7ap1.scene7.com/is/image/hdfcbankPWS/${name}?fmt=png-alpha`, (res) => {
          const tempPath = path.join(__dirname, `temp_${name}.png`);
          const fileStream = fs.createWriteStream(tempPath);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            sharp(tempPath).metadata().then(m => {
              console.log(`  Dimensions of ${name}: ${m.width} x ${m.height} (${m.format})`);
              fs.unlinkSync(tempPath);
              resolve();
            }).catch(() => {
              fs.unlinkSync(tempPath);
              resolve();
            });
          });
        });
      });
    }
  }
  console.log('Scan completed.');
}

run();
