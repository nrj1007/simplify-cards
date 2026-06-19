const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function run() {
  const years = ['2022', '2023', '2024'];
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const names = [
    'Standard-Chartered-Beyond-Credit-Card',
    'Standard-Chartered-Beyond-Card',
    'sc-beyond-credit-card',
    'sc-beyond-card'
  ];
  const extensions = ['.webp', '.png', '.jpg'];

  console.log('Starting scan of CardInsider date folders...');
  for (const year of years) {
    for (const month of months) {
      for (const name of names) {
        for (const ext of extensions) {
          const url = `https://cardinsider.com/wp-content/uploads/${year}/${month}/${name}${ext}`;
          const ok = await checkUrl(url);
          if (ok) {
            console.log(`SUCCESS! Found valid image at: ${url}`);
            return;
          }
        }
      }
    }
  }
  console.log('Scan complete. No valid card face image found.');
}

run();
