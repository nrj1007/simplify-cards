const https = require('https');
const fs = require('fs');
const path = require('path');

const imageUrl = 'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/landmark-select-front.png';
const targetPath = path.join(__dirname, 'landmark_select_front_orig.png');

https.get(imageUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed to download image, status code:', res.statusCode);
    process.exit(1);
  }

  const fileStream = fs.createWriteStream(targetPath);
  res.pipe(fileStream);

  fileStream.on('finish', () => {
    console.log('Successfully downloaded original image to:', targetPath);
  });
}).on('error', (err) => {
  console.error('HTTPS request error:', err);
});
