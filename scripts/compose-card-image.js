/**
 * compose-card-image.js
 * Creates a 16:10 beige-background canvas and centers a portrait card image on it.
 * Usage: node scripts/compose-card-image.js <card-id>
 * Output: public/images/<card-id>-composed.webp
 */
const sharp = require('sharp');
const path  = require('path');

const cardId = process.argv[2];
if (!cardId) { console.error('Usage: node scripts/compose-card-image.js <card-id>'); process.exit(1); }

const fs = require('fs');
let inputPath = path.join('public', 'images', `${cardId}.webp`);
if (!fs.existsSync(inputPath)) {
  const pngPath = path.join('public', 'images', `${cardId}.png`);
  const jpgPath = path.join('public', 'images', `${cardId}.jpg`);
  if (fs.existsSync(pngPath)) inputPath = pngPath;
  else if (fs.existsSync(jpgPath)) inputPath = jpgPath;
}
const outputPath = path.join('public', 'images', `${cardId}-composed.webp`);

// 16:10 canvas at high resolution
const CANVAS_W = 800;
const CANVAS_H = 500;
const BG_COLOR = { r: 247, g: 244, b: 237, alpha: 1 }; // #f7f4ed beige

(async () => {
  const meta = await sharp(inputPath).metadata();
  console.log(`Input: ${meta.width}x${meta.height} (${meta.format})`);

  // Scale card to fit with ~10% padding on all sides
  const maxW = Math.round(CANVAS_W * 0.72);
  const maxH = Math.round(CANVAS_H * 0.88);
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const cardW = Math.round(meta.width  * scale);
  const cardH = Math.round(meta.height * scale);
  const left  = Math.round((CANVAS_W - cardW) / 2);
  const top   = Math.round((CANVAS_H - cardH) / 2);

  console.log(`Scaled card: ${cardW}x${cardH}, offset: (${left}, ${top})`);

  const cardBuf = await sharp(inputPath)
    .resize(cardW, cardH, { fit: 'fill' })
    .webp({ quality: 92 })
    .toBuffer();

  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG_COLOR }
  })
    .composite([{ input: cardBuf, left, top }])
    .webp({ quality: 92 })
    .toFile(outputPath);

  console.log(`✅ Saved: ${outputPath}`);
})().catch(err => { console.error(err); process.exit(1); });
