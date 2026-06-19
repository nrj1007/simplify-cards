const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const tempPath = path.join(__dirname, 'aurum_temp.webp');
const targetPath = path.join(__dirname, '..', 'public', 'images', 'aurum-sbi.webp');

async function main() {
  try {
    if (!fs.existsSync(tempPath)) {
      console.error('Source file does not exist:', tempPath);
      process.exit(1);
    }
    console.log('Processing Aurum image...');
    const image = sharp(tempPath);
    const metadata = await image.metadata();
    console.log('Original dimensions:', metadata.width, 'x', metadata.height);

    // Trim transparent areas
    const trimmed = image.trim();
    const trimmedMeta = await trimmed.metadata();
    console.log('Trimmed dimensions:', trimmedMeta.width, 'x', trimmedMeta.height);

    const isPortrait = trimmedMeta.height > trimmedMeta.width;
    console.log('Is portrait?', isPortrait);

    if (isPortrait) {
      const CANVAS_W = 800;
      const CANVAS_H = 500;
      const BG_COLOR = { r: 247, g: 244, b: 237, alpha: 1 }; // #f7f4ed beige

      const maxW = Math.round(CANVAS_W * 0.72);
      const maxH = Math.round(CANVAS_H * 0.88);
      const scale = Math.min(maxW / trimmedMeta.width, maxH / trimmedMeta.height);

      const cardW = Math.round(trimmedMeta.width * scale);
      const cardH = Math.round(trimmedMeta.height * scale);
      const left = Math.round((CANVAS_W - cardW) / 2);
      const top = Math.round((CANVAS_H - cardH) / 2);

      console.log(`Composing portrait card: ${cardW}x${cardH} at offset (${left}, ${top})`);

      const cardBuf = await trimmed
        .resize(cardW, cardH, { fit: 'fill' })
        .toBuffer();

      await sharp({
        create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG_COLOR }
      })
        .composite([{ input: cardBuf, left, top }])
        .webp({ quality: 95 })
        .toFile(targetPath);

      console.log('Saved composed WebP to:', targetPath);
    } else {
      // Just convert landscape to WebP directly
      await trimmed
        .webp({ quality: 95 })
        .toFile(targetPath);
      console.log('Saved landscape WebP directly to:', targetPath);
    }

    // Cleanup
    fs.unlinkSync(tempPath);
    console.log('Done!');
  } catch (err) {
    console.error('Error processing image:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

main();
