const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const croppedPath = 'C:\\Users\\manpr\\Documents\\Codex\\2026-05-08\\i-want-to-build-an-ai\\public\\images\\hdfc-indianoil.webp';
const tempPath = path.join(__dirname, 'iocl_raw.png');

async function cropImage() {
  try {
    console.log('Loading downloaded raw png image...');
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
      console.error('Failed to find card bounding box, saving original as webp...');
      await sharp(tempPath)
        .webp({ quality: 95 })
        .toFile(croppedPath);
      return;
    }

    // Crop the card face, scale it up to 320px width (lanczos kernel), and save as webp directly
    await sharp(tempPath)
      .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
      .resize(320, null, { kernel: sharp.kernel.lanczos })
      .webp({ quality: 95 })
      .toFile(croppedPath);

    console.log('Successfully cropped, scaled, and saved WebP to:', croppedPath);
    
    // Clean up temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  } catch (err) {
    console.error('Error during cropping:', err);
  }
}

cropImage();
