const fs = require('fs');
const path = require('path');

const yesBankDir = path.join(__dirname, '..', 'data', 'cards', 'yes-bank');

function checkCard(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const card = JSON.parse(content);
    const notes = card.internalNotes || [];
    const isVerified = notes.some(note => /manually reviewed and verified by user/i.test(note));
    return {
      id: card.id,
      name: card.name,
      isVerified
    };
  } catch (err) {
    console.error('Error parsing:', filePath, err);
    return null;
  }
}

const files = fs.readdirSync(yesBankDir).filter(f => f.endsWith('.json'));
const results = files.map(file => checkCard(path.join(yesBankDir, file))).filter(Boolean);

console.log('Unverified YES Bank Cards:');
results.forEach(res => {
  if (!res.isVerified) {
    console.log(`- ${res.name} (ID: ${res.id})`);
  }
});

console.log('\nVerified YES Bank Cards:');
results.forEach(res => {
  if (res.isVerified) {
    console.log(`- ${res.name} (ID: ${res.id})`);
  }
});
