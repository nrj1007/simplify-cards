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

const bankStats = {};

for (const issuer of issuers) {
  const issuerDir = path.join(cardsDir, issuer);
  const files = fs.readdirSync(issuerDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(issuerDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const issuerName = data.issuer || issuer;

      const userVerifiedNote = (data.internalNotes || []).find(note => 
        note.toLowerCase().includes('verified by user') || 
        note.toLowerCase().includes('manually reviewed')
      );
      const isVerified = !!userVerifiedNote;

      if (!bankStats[issuerName]) {
        bankStats[issuerName] = { verified: 0, unverified: 0, total: 0 };
      }

      bankStats[issuerName].total++;
      if (isVerified) {
        bankStats[issuerName].verified++;
      } else {
        bankStats[issuerName].unverified++;
      }
    } catch (err) {
      console.error(`Error parsing ${file} in ${issuer}:`, err);
    }
  }
}

console.log(JSON.stringify(bankStats, null, 2));
