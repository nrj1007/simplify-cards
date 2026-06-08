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

const bankArg = process.argv[2];

let selectedIssuers = [];

if (!bankArg || bankArg.toLowerCase() === 'all') {
  // If 'all' or no argument, search all issuer directories
  selectedIssuers = issuers;
} else {
  // Try to find matching issuer directory (case-insensitive, supports partial matching)
  const target = bankArg.toLowerCase();
  const match = issuers.find(name => name.toLowerCase() === target || name.toLowerCase().replace(/-/g, '') === target.replace(/-/g, ''));
  
  if (match) {
    selectedIssuers = [match];
  } else {
    console.error(`Error: Bank/Issuer "${bankArg}" not found.`);
    console.error('Available issuers:');
    issuers.forEach(i => console.error(`  - ${i}`));
    process.exit(1);
  }
}

const cards = [];

for (const issuer of selectedIssuers) {
  const issuerDir = path.join(cardsDir, issuer);
  const files = fs.readdirSync(issuerDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(issuerDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Look for a user verification note in internalNotes
      const userVerifiedNote = (data.internalNotes || []).find(note => 
        note.toLowerCase().includes('verified by user') || 
        note.toLowerCase().includes('manually reviewed')
      );
      const userVerified = userVerifiedNote 
        ? (userVerifiedNote.match(/\d{4}-\d{2}-\d{2}/)?.[0] || 'Yes') 
        : 'No';

      cards.push({
        id: data.id,
        name: data.name,
        issuer: data.issuer || issuer,
        popularityScore: data.popularityScore !== undefined ? data.popularityScore : null,
        verificationStatus: data.verificationStatus || 'N/A',
        lastVerified: data.lastVerified || 'N/A',
        userVerified: userVerified,
        filePath: path.relative(path.join(__dirname, '..'), filePath)
      });
    } catch (err) {
      console.error(`Error parsing ${file} in ${issuer}:`, err);
    }
  }
}

// Sort cards by popularityScore (descending), then name (ascending)
cards.sort((a, b) => {
  if (b.popularityScore !== a.popularityScore) {
    return (b.popularityScore || 0) - (a.popularityScore || 0);
  }
  return a.name.localeCompare(b.name);
});

console.log(JSON.stringify(cards, null, 2));
