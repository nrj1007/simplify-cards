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

const unverifiedCards = [];

for (const issuer of issuers) {
  const issuerDir = path.join(cardsDir, issuer);
  const files = fs.readdirSync(issuerDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(issuerDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const userVerifiedNote = (data.internalNotes || []).find(note => 
        note.toLowerCase().includes('verified by user') || 
        note.toLowerCase().includes('manually reviewed')
      );
      
      if (!userVerifiedNote) {
        unverifiedCards.push({
          id: data.id,
          name: data.name,
          issuer: data.issuer || issuer,
          popularityScore: data.popularityScore !== undefined ? data.popularityScore : null,
          filePath: path.relative(path.join(__dirname, '..'), filePath)
        });
      }
    } catch (err) {
      console.error(`Error parsing ${file} in ${issuer}:`, err);
    }
  }
}

// Sort by popularity
unverifiedCards.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));

console.log(`Found ${unverifiedCards.length} unverified cards:\n`);
unverifiedCards.forEach(c => {
  console.log(`- ${c.id} (${c.name}) [${c.issuer}] - Popularity: ${c.popularityScore}`);
});
