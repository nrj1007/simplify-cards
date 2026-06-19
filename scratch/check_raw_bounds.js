const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageUrl = 'https://s7ap1.scene7.com/is/image/hdfcbankPWS/tata-neu-p?fmt=png-alpha';
const tempPath = path.join(__dirname, 'tata_neu_p_temp_no_resize.png');

https.get(imageUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download image, status code:', res.statusCode);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(tempPath);
  res.pipe(fileStream);

  fileStream.on('finish', async () => {
    try {
      console.log('Finished downloading temp image.');
      const image = sharp(tempPath);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      
      const width = info.width;
      const height = info.height;
      const channels = info.channels;
      
      console.log('Original dimensions:', width, 'x', height, 'channels:', channels);
      
      let minX = width, maxX = 0, minY = height, maxY = 0;
      
      let opaqueCount = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * channels;
          const alpha = data[idx + 3];
          if (alpha > 30) {
            opaqueCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      
      console.log('Opaque pixels count:', opaqueCount);
      console.log(`Bounding box: X [${minX}, ${maxX}], Y [${minY}, ${maxY}]`);
      
      // Let's also crop it and see what size we get
      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      console.log(`Cropped size: ${cropWidth} x ${cropHeight}`);
      
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error(err);
      fs.unlinkSync(tempPath);
    }
  });
});
