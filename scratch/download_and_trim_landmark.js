const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageUrl = 'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/landmark-select-front.png';
const tempPath = path.join(__dirname, 'landmark_select_temp.png');

https.get(imageUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download image, status code:', res.statusCode);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(tempPath);
  res.pipe(fileStream);

  fileStream.on('finish', async () => {
    try {
      console.log('Downloaded image.');
      const image = sharp(tempPath);
      const metadata = await image.metadata();
      console.log('Original dimensions:', metadata.width, 'x', metadata.height);

      // Trim transparent areas
      const trimmed = image.trim();
      const trimmedMeta = await trimmed.metadata();
      console.log('Trimmed dimensions:', trimmedMeta.width, 'x', trimmedMeta.height);

      // Check if it needs to be composed on a beige canvas
      // If it is portrait, we compose it on an 800x500 beige canvas (as standard for portrait cards)
      const isPortrait = trimmedMeta.height > trimmedMeta.width;
      console.log('Is portrait?', isPortrait);

      const targetPath = path.join(__dirname, '..', 'public', 'images', 'landmark-rewards-sbi-select.webp');

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
        // Just convert to WebP
        await trimmed
          .webp({ quality: 95 })
          .toFile(targetPath);
        console.log('Saved simple WebP to:', targetPath);
      }

      // Cleanup
      fs.unlinkSync(tempPath);
      console.log('Done!');
    } catch (err) {
      console.error('Error processing image:', err);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  });
}).on('error', (err) => {
  console.error('HTTPS request error:', err);
});
