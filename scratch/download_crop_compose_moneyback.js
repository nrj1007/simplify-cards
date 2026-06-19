const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const candidates = [
  'https://www.hdfc.bank.in/content/hdfcbankpws/in/en/personal-banking/credit-cards/moneyback-plus-credit-card/_jcr_content/root/container/container_704997858_/box_container/extendedteaser.coreimg.png/1774975208279/moneyback-plus-credit-card.png',
  'https://s7ap1.scene7.com/is/image/hdfcbankPWS/moneyback-plus-compare-card?fmt=png-alpha',
  'https://s7ap1.scene7.com/is/image/hdfcbankPWS/moneyback-plus-compare-card?wid=600&hei=375&fmt=png-alpha',
  'https://s7ap1.scene7.com/is/image/hdfcbankPWS/moneyback-plus-compare?fmt=png-alpha'
];

const tempPath = path.join(__dirname, 'moneyback_raw.png');
const targetPath = 'C:\\Users\\manpr\\Documents\\Codex\\2026-05-08\\i-want-to-build-an-ai\\public\\images\\hdfc-moneyback-plus.webp';

function downloadCandidate(url, dest) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.hdfc.bank.in/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    };

    https.get(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Status ${res.statusCode} for ${url}`));
        return;
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(url);
      });
    }).on('error', reject);
  });
}

async function run() {
  let downloadedUrl = null;
  for (const url of candidates) {
    try {
      console.log(`Trying to download: ${url}`);
      downloadedUrl = await downloadCandidate(url, tempPath);
      console.log(`Successfully downloaded: ${downloadedUrl}`);
      break;
    } catch (e) {
      console.log(`Failed: ${e.message}`);
    }
  }

  if (!downloadedUrl) {
    console.error('All candidates failed.');
    process.exit(1);
  }

  try {
    console.log('Processing downloaded raw image...');
    const image = sharp(tempPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    const width = info.width;
    const height = info.height;
    const channels = info.channels;
    
    let minX = width, maxX = 0, minY = height, maxY = 0;
    const threshold = 10; // transparency threshold

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const alpha = data[idx + 3];
        if (alpha > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    console.log(`Cropping boundaries: X [${minX}, ${maxX}], Y [${minY}, ${maxY}] (${cropWidth}x${cropHeight})`);

    if (cropWidth <= 0 || cropHeight <= 0) {
      console.log('Failed to find card bounding box, saving original as webp...');
      await sharp(tempPath)
        .resize(320, null)
        .webp({ quality: 95 })
        .toFile(targetPath);
    } else {
      await sharp(tempPath)
        .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
        .resize(320, null, { kernel: sharp.kernel.lanczos })
        .webp({ quality: 95 })
        .toFile(targetPath);
    }

    console.log('Successfully cropped, scaled, and saved WebP to:', targetPath);
    
    // Clean up temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  } catch (err) {
    console.error('Error during image processing:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

run();
