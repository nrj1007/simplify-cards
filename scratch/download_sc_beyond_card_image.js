const fs = require('fs');
const https = require('https');
const path = require('path');
const sharp = require('sharp');

const candidates = [
  'https://cardinsider.com/wp-content/uploads/2021/07/Standard-Chartered-Beyond-Credit-Card.webp',
  'https://cardinside.b-cdn.net/wp-content/uploads/2021/07/Standard-Chartered-Beyond-Credit-Card.webp',
  'https://www.paisabazaar.com/wp-content/webp-express/webp-images/doc-root/wp-content/uploads/2022/07/Standard-Chartered-Beyond-Credit-Card.png.webp',
  'https://www.paisabazaar.com/wp-content/webp-express/webp-images/doc-root/wp-content/uploads/2022/07/Standard-Chartered-Bank-Beyond-Credit-Card.png.webp'
];

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  let foundUrl = null;
  for (const url of candidates) {
    console.log(`Checking: ${url}`);
    const ok = await checkUrl(url);
    if (ok) {
      console.log(`SUCCESS! Found valid image at: ${url}`);
      foundUrl = url;
      break;
    }
  }
  
  if (!foundUrl) {
    console.log('No valid candidate image found.');
    return;
  }

  const tempInputPath = path.join(__dirname, '..', 'public', 'images', 'sc-beyond-temp.webp');
  const finalOutputPath = path.join(__dirname, '..', 'public', 'images', 'sc-beyond.webp');

  console.log(`Downloading original card face from: ${foundUrl}`);
  await downloadFile(foundUrl, tempInputPath);
  
  const meta = await sharp(tempInputPath).metadata();
  console.log(`Original image: ${meta.width}x${meta.height} (${meta.format})`);
  
  const CANVAS_W = 800;
  const CANVAS_H = 500;
  const BG_COLOR = { r: 247, g: 244, b: 237, alpha: 1 }; // #f7f4ed beige

  const maxW = Math.round(CANVAS_W * 0.72);
  const maxH = Math.round(CANVAS_H * 0.88);
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const cardW = Math.round(meta.width  * scale);
  const cardH = Math.round(meta.height * scale);
  const left  = Math.round((CANVAS_W - cardW) / 2);
  const top   = Math.round((CANVAS_H - cardH) / 2);

  console.log(`Scaling card to ${cardW}x${cardH} (centered at offset: ${left}, ${top})`);

  const cardBuf = await sharp(tempInputPath)
    .resize(cardW, cardH, { fit: 'fill' })
    .webp({ quality: 92 })
    .toBuffer();

  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG_COLOR }
  })
    .composite([{ input: cardBuf, left, top }])
    .webp({ quality: 92 })
    .toFile(finalOutputPath);

  console.log(`Composed image saved successfully to: ${finalOutputPath}`);
  
  if (fs.existsSync(tempInputPath)) {
    fs.unlinkSync(tempInputPath);
    console.log('Temporary source image cleaned up.');
  }
}

run().catch(err => {
  console.error('Error occurred:', err);
  process.exit(1);
});
