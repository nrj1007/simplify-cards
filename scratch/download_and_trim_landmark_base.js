const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const imageUrl = 'https://www.sbicard.com/static-resources/img/card/card-face-assets/for-website/front/vertical/landmark-base-front.png';
const tempPng = path.join(__dirname, '..', 'public', 'images', 'landmark-rewards-sbi.png');
const tempWebp = path.join(__dirname, '..', 'public', 'images', 'landmark-rewards-sbi.webp');
const finalWebp = path.join(__dirname, '..', 'public', 'images', 'landmark-rewards-sbi.webp');

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status code ${res.statusCode}`));
                return;
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

const CANVAS_W = 800;
const CANVAS_H = 500;
const BG_COLOR = { r: 247, g: 244, b: 237, alpha: 1 }; // #f7f4ed beige

async function main() {
    console.log('Downloading...', imageUrl);
    await download(imageUrl, tempPng);
    console.log('Downloaded temporary PNG.');

    // Save as temporary webp
    const webpPath = tempPng.replace('.png', '-raw.webp');
    await sharp(tempPng).webp().toFile(webpPath);
    console.log('Converted to raw webp.');

    // Now compose it
    const meta = await sharp(webpPath).metadata();
    const maxW = Math.round(CANVAS_W * 0.72);
    const maxH = Math.round(CANVAS_H * 0.88);
    const scale = Math.min(maxW / meta.width, maxH / meta.height);
    const cardW = Math.round(meta.width * scale);
    const cardH = Math.round(meta.height * scale);
    const left = Math.round((CANVAS_W - cardW) / 2);
    const top = Math.round((CANVAS_H - cardH) / 2);

    const cardBuf = await sharp(webpPath)
        .resize(cardW, cardH, { fit: 'fill' })
        .webp({ quality: 92 })
        .toBuffer();

    await sharp({
        create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG_COLOR }
    })
    .composite([{ input: cardBuf, left, top }])
    .webp({ quality: 92 })
    .toFile(tempWebp);

    console.log('✅ Saved composed webp:', tempWebp);

    // Clean up temporary files
    fs.unlinkSync(tempPng);
    fs.unlinkSync(webpPath);
    console.log('Cleaned up temp files.');
}

main().catch(err => {
    console.error('Error:', err);
});
