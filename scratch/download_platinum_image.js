const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://cardinsider.com/wp-content/uploads/2021/08/Axis-Bank-Platinum-Credit-Card.webp';
const dest = path.join(__dirname, '..', 'public', 'images', 'axis-platinum.webp');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function downloadFile(fileUrl, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const parsedUrl = new URL(fileUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      timeout: 15000,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    };
    
    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        const redirectUrl = new URL(res.headers.location, fileUrl).toString();
        return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error(`Download failed with status ${res.statusCode} for ${fileUrl}`));
        return;
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

downloadFile(url, dest)
  .then(() => console.log('Successfully downloaded standard card image to ' + dest))
  .catch(err => {
    console.error('Error downloading:', err.message);
    process.exit(1);
  });
