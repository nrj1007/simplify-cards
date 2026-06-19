// Composes the portrait Jupiter Edge+ card onto a horizontal beige canvas
const sharp = require('sharp');
const path = require('path');

const INPUT  = path.resolve('public/images/csb-jupiter-edge-plus.webp');
const OUTPUT = path.resolve('public/images/csb-jupiter-edge-plus.webp');

const CANVAS_W = 800;
const CANVAS_H = 500;
const BG = { r: 245, g: 240, b: 232, alpha: 1 }; // light beige

async function main() {
  const meta = await sharp(INPUT).metadata();
  const srcW = meta.width;
  const srcH = meta.height;

  // Scale card to fit within 80% of canvas height, preserving aspect ratio
  const maxH = Math.round(CANVAS_H * 0.88);
  const scale = maxH / srcH;
  const cardW = Math.round(srcW * scale);
  const cardH = maxH;

  const left = Math.round((CANVAS_W - cardW) / 2);
  const top  = Math.round((CANVAS_H - cardH) / 2);

  const resized = await sharp(INPUT)
    .resize(cardW, cardH, { fit: 'fill' })
    .png()
    .toBuffer();

  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG }
  })
    .composite([{ input: resized, left, top }])
    .webp({ quality: 90 })
    .toFile(OUTPUT);

  console.log(`Done: ${OUTPUT} (card ${cardW}x${cardH} centered on ${CANVAS_W}x${CANVAS_H})`);
}

main().catch(err => { console.error(err); process.exit(1); });
