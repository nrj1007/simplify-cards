const { spawn } = require('child_process');

function downloadCard(cardId) {
  return new Promise((resolve) => {
    console.log(`\n=======================================`);
    console.log(`Starting download for: ${cardId}`);
    console.log(`=======================================`);
    const child = spawn('node', ['scripts/download-axis-card-image.js', cardId]);
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    child.stderr.on('data', (data) => {
      process.stdout.write(data); // pipe error output to stdout stream for cleaner logging
    });
    child.on('close', (code) => {
      console.log(`Finished ${cardId} with exit code ${code}`);
      resolve();
    });
  });
}

async function run() {
  const cards = [
    'axis-indianoil',
    'axis-reserve',
    'axis-indianoil-premium',
    'axis-cashback',
    'axis-rewards',
    'axis-horizon',
    'axis-my-zone',
    'axis-neo',
    'axis-privilege',
    'axis-samsung-signature',
    'axis-indianoil-easy',
    'axis-privilege-easy',
    'axis-google-pay-flex',
    'axis-freecharge-plus'
  ];
  for (const card of cards) {
    await downloadCard(card);
  }
  console.log('\nAll downloads finished!');
}

run();
