const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageUrl = 'https://s7ap1.scene7.com/is/image/hdfcbankPWS/tata-neu-p-compare-card?wid=1000&hei=625&fmt=png-alpha';
const tempPath = path.join(__dirname, 'tata_neu_p_temp.png');
const targetPath = path.join(__dirname, '..', 'public', 'images', 'hdfc-tata-neu-plus.webp');

https.get(imageUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download image, status code:', res.statusCode);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(tempPath);
  res.pipe(fileStream);

  fileStream.on('finish', () => {
    console.log('Finished downloading temp image.');
    
    // Trim transparent borders and check trimmed metadata
    sharp(tempPath)
      .trim()
      .metadata()
      .then(m => {
        console.log('Trimmed Image dimensions:', m.width, 'x', m.height);
        
        // Save to target path as WebP
        return sharp(tempPath)
          .trim()
          .webp({ quality: 95 })
          .toFile(targetPath);
      })
      .then(() => {
        console.log('Successfully saved trimmed image to:', targetPath);
        fs.unlinkSync(tempPath);
      })
      .catch(err => {
        console.error('Error processing image:', err);
      });
  });
}).on('error', (err) => {
  console.error('HTTPS request error:', err);
});
