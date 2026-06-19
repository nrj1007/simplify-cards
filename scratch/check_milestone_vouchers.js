const fs = require('node:fs');
const path = require('node:path');

const cardsDir = path.join(__dirname, '..', 'data', 'cards');
const issuers = fs.readdirSync(cardsDir).filter(f => fs.statSync(path.join(cardsDir, f)).isDirectory());

for (const issuer of issuers) {
  const issuerDir = path.join(cardsDir, issuer);
  const files = fs.readdirSync(issuerDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(issuerDir, file), 'utf8'));
    if (data.milestones) {
      for (const m of data.milestones) {
        if (m.kind === 'voucher') {
          console.log(`${data.id}: threshold=${m.threshold}, value=${m.value}, label="${m.label}"`);
        }
      }
    }
  }
}
