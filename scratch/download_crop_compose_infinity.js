const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageUrl = 'https://s7ap1.scene7.com/is/image/hdfcbankPWS/tata-neu-i?wid=1000&hei=625&fmt=png-alpha';
const tempPath = path.join(__dirname, 'tata_neu_i_high_res.png');
const croppedPath = path.join(__dirname, 'tata_neu_i_cropped.png');
const targetPath = 'C:\\Users\\manpr\\Documents\\Codex\\2026-05-08\\i-want-to-build-an-ai\\public\\images\\hdfc-tata-neu-infinity.webp';

https.get(imageUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download image, status code:', res.statusCode);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(tempPath);
  res.pipe(fileStream);

  fileStream.on('finish', async () => {
    try {
      console.log('Downloaded high-res image for Infinity.');
      
      const image = sharp(tempPath);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      
      const width = info.width;
      const height = info.height;
      const channels = info.channels;
      
      let minX = width, maxX = 0, minY = height, maxY = 0;
      const threshold = 30;

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
        console.error('Failed to find card bounding box');
        process.exit(1);
      }

      // Crop the portrait card face
      await sharp(tempPath)
        .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
        .toFile(croppedPath);

      console.log('Cropped card face to portrait PNG.');

      // Now, compose it onto an 800x500 16:10 beige canvas
      const CANVAS_W = 800;
      const CANVAS_H = 500;
      const BG_COLOR = { r: 247, g: 244, b: 237, alpha: 1 }; // #f7f4ed beige

      // Scale card to fit canvas with ~10% padding
      const maxW = Math.round(CANVAS_W * 0.72); // 576
      const maxH = Math.round(CANVAS_H * 0.88); // 440
      const scale = Math.min(maxW / cropWidth, maxH / cropHeight);
      
      const cardW = Math.round(cropWidth * scale);
      const cardH = Math.round(cropHeight * scale);
      const left = Math.round((CANVAS_W - cardW) / 2);
      const top = Math.round((CANVAS_H - cardH) / 2);

      console.log(`Composing card: ${cardW}x${cardH} at offset (${left}, ${top})`);

      const cardBuf = await sharp(croppedPath)
        .resize(cardW, cardH, { fit: 'fill' })
        .webp({ quality: 95 })
        .toBuffer();

      await sharp({
        create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG_COLOR }
      })
        .composite([{ input: cardBuf, left, top }])
        .webp({ quality: 95 })
        .toFile(targetPath);

      console.log('Successfully saved composed WebP image to:', targetPath);
      
      // Clean up temp files
      fs.unlinkSync(tempPath);
      fs.unlinkSync(croppedPath);
    } catch (err) {
      console.error('Error during processing:', err);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      if (fs.existsSync(croppedPath)) fs.unlinkSync(croppedPath);
    }
  });
});
