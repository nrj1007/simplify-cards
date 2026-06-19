const fs = require('fs');
const path = require('path');

const files = [
  'landmark-rewards-sbi-prime.json',
  'landmark-rewards-sbi-select.json',
  'landmark-rewards-sbi.json',
  'lifestyle-home-centre-sbi-prime.json',
  'lifestyle-home-centre-sbi-select.json',
  'lifestyle-home-centre-sbi.json',
  'max-sbi-prime.json',
  'max-sbi-select.json',
  'max-sbi.json',
  'spar-sbi.json',
  'ola-money-sbi.json',
  'flipkart-sbi.json'
];

files.forEach(f => {
  const filePath = path.join('data', 'cards', 'sbi', f);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping: ${f} (does not exist)`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  // Rebuild object to insert "status": "discontinued" right after "name"
  const rebuilt = {};
  for (const key of Object.keys(data)) {
    rebuilt[key] = data[key];
    if (key === 'name') {
      rebuilt['status'] = 'discontinued';
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(rebuilt, null, 2) + '\n', 'utf8');
  console.log(`Updated: ${f}`);
});
