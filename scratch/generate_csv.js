const fs = require('fs');
const path = require('path');

const cardsDir = path.join(__dirname, '..', 'data', 'cards');
const activeCards = [];

function traverse(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      traverse(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (content.status !== 'discontinued' && content.status !== 'closed-to-new') {
        activeCards.push({
          id: content.id,
          name: content.name,
          issuer: content.issuer
        });
      }
    }
  }
}

traverse(cardsDir);

activeCards.sort((a, b) => a.issuer.localeCompare(b.issuer) || a.name.localeCompare(b.name));

const csvRows = ['"card id","card name","issuer"'];
for (const card of activeCards) {
  const id = card.id.replace(/"/g, '""');
  const name = card.name.replace(/"/g, '""');
  const issuer = card.issuer.replace(/"/g, '""');
  csvRows.push(`"${id}","${name}","${issuer}"`);
}

const csvContent = csvRows.join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'active_cards.csv'), csvContent, 'utf8');
console.log(`Generated active_cards.csv with ${activeCards.length} cards.`);
