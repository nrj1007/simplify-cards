const fs = require('node:fs');
const path = require('node:path');

const cardsDir = path.join(__dirname, '..', 'data', 'cards');

if (!fs.existsSync(cardsDir)) {
  console.error(`Cards directory not found at: ${cardsDir}`);
  process.exit(1);
}

// Get all issuer subdirectories
const issuers = fs.readdirSync(cardsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

const stats = {};

for (const issuer of issuers) {
  const issuerDir = path.join(cardsDir, issuer);
  const files = fs.readdirSync(issuerDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(issuerDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const issuerName = data.issuer || issuer;
      if (!stats[issuerName]) {
        stats[issuerName] = { verified: 0, unverified: 0, total: 0 };
      }

      // Look for a user verification note in internalNotes
      const userVerifiedNote = (data.internalNotes || []).find(note => 
        note.toLowerCase().includes('verified by user') || 
        note.toLowerCase().includes('manually reviewed')
      );
      const isVerified = !!userVerifiedNote;

      if (isVerified) {
        stats[issuerName].verified++;
      } else {
        stats[issuerName].unverified++;
      }
      stats[issuerName].total++;

    } catch (err) {
      console.error(`Error parsing ${file} in ${issuer}:`, err);
    }
  }
}

console.log(JSON.stringify(stats, null, 2));
