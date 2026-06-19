const fs = require('fs');
const path = require('path');

const axisDir = 'C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/data/cards/axis';
const files = fs.readdirSync(axisDir);

console.log('Scanning Axis cards...');
const unverified = [];
const verified = [];

for (const file of files) {
  if (!file.endsWith('.json')) continue;
  const filePath = path.join(axisDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const internalNotes = data.internalNotes || [];
  const notesText = internalNotes.join(' ');
  const isUserVerified = notesText.includes('manually reviewed and verified by user');
  
  const info = {
    file,
    id: data.id,
    name: data.name,
    lastVerified: data.lastVerified,
    verificationStatus: data.verificationStatus,
    isUserVerified
  };
  
  if (isUserVerified) {
    verified.push(info);
  } else {
    unverified.push(info);
  }
}

console.log('\n--- UNVERIFIED CARDS ---');
for (const card of unverified) {
  console.log(`- ${card.name} (${card.file}): lastVerified=${card.lastVerified}, verificationStatus=${card.verificationStatus}`);
}

console.log('\n--- VERIFIED CARDS ---');
for (const card of verified) {
  console.log(`- ${card.name} (${card.file})`);
}

console.log(`\nTotal: ${files.length} files. Verified: ${verified.length}, Unverified: ${unverified.length}`);
