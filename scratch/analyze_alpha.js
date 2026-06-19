const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const tempPath = path.join(__dirname, 'tata_neu_p_temp.png');
const inputPath = 'C:\\Users\\manpr\\Documents\\Codex\\2026-05-08\\i-want-to-build-an-ai\\public\\images\\hdfc-tata-neu-plus.webp';
const targetPath = 'C:\\Users\\manpr\\Documents\\Codex\\2026-05-08\\i-want-to-build-an-ai\\public\\images\\hdfc-tata-neu-plus.webp';

// We'll download the fresh PNG image to keep the full alpha channel for analysis
const https = require('https');
const imageUrl = 'https://s7ap1.scene7.com/is/image/hdfcbankPWS/tata-neu-p-compare-card?wid=1000&hei=625&fmt=png-alpha';

https.get(imageUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download image');
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(tempPath);
  res.pipe(fileStream);

  fileStream.on('finish', async () => {
    try {
      console.log('Finished downloading fresh PNG.');
      
      const image = sharp(tempPath);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      
      const width = info.width;
      const height = info.height;
      const channels = info.channels;
      
      if (channels < 4) {
        console.error('Image does not have an alpha channel!');
        process.exit(1);
      }

      let minX = width, maxX = 0, minY = height, maxY = 0;
      
      // Threshold for alpha channel (0-255). 
      // We set it to 30 to ignore soft drop shadows/translucent noise.
      const threshold = 30;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * channels;
          const alpha = data[idx + 3]; // Alpha channel is the 4th channel
          
          if (alpha > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      console.log(`Bounding box: X [${minX}, ${maxX}], Y [${minY}, ${maxY}]`);
      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      console.log(`Cropped size: ${cropWidth} x ${cropHeight}`);

      if (cropWidth <= 0 || cropHeight <= 0) {
        console.error('Could not find bounding box with alpha > threshold');
        process.exit(1);
      }

      // Crop the image to the card face boundaries
      await sharp(tempPath)
        .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
        .webp({ quality: 95 })
        .toFile(targetPath);
        
      console.log('Successfully cropped and saved WebP to:', targetPath);
      fs.unlinkSync(tempPath);
      
    } catch (err) {
      console.error('Error during analysis:', err);
    }
  });
});
