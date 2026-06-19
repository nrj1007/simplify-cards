const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');

const url = 'https://d2gwgwt9a7yxle.cloudfront.net/SCC_Cards_cee452fbea_8ad4431add.png';
const tempPngPath = path.join(__dirname, 'temp_dream_different.png');
const outputWebpPath = path.join(__dirname, '..', 'public', 'images', 'kotak-811-dream-different.webp');

console.log('Downloading image...');
const file = fs.createWriteStream(tempPngPath);

https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close(async () => {
      console.log('Download complete. Converting to WebP...');
      try {
        const meta = await sharp(tempPngPath).metadata();
        console.log(`Dimensions: ${meta.width}x${meta.height}`);
        
        await sharp(tempPngPath)
          .webp({ quality: 92 })
          .toFile(outputWebpPath);
          
        console.log(`Successfully converted and saved to ${outputWebpPath}`);
        fs.unlinkSync(tempPngPath);
      } catch (err) {
        console.error('Error during conversion:', err);
      }
    });
  });
}).on('error', (err) => {
  fs.unlinkSync(tempPngPath);
  console.error('Download error:', err.message);
});
