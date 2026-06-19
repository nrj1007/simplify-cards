const fs = require('node:fs');
const path = require('node:path');

const cardsDir = path.join(__dirname, '..', 'data', 'cards');

if (!fs.existsSync(cardsDir)) {
  console.error(`Cards directory not found at: ${cardsDir}`);
  process.exit(1);
}

const issuers = fs.readdirSync(cardsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

const cards = [];

for (const issuer of issuers) {
  const issuerDir = path.join(cardsDir, issuer);
  const files = fs.readdirSync(issuerDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(issuerDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      cards.push({
        id: data.id,
        issuer: data.issuer || issuer,
        name: data.name,
        status: data.status || 'active',
        sourceUrl: data.sourceUrl || '',
        applyUrl: data.applyUrl || '',
        filePath: path.relative(path.join(__dirname, '..'), filePath)
      });
    } catch (err) {
      console.error(`Error parsing ${file} in ${issuer}:`, err);
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'all_cards.json'), JSON.stringify(cards, null, 2), 'utf8');
console.log(`Successfully wrote ${cards.length} cards to scratch/all_cards.json`);
