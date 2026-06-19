const fs = require('fs');
const path = require('path');

const cardsDir = 'C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/data/cards';
const issuers = fs.readdirSync(cardsDir);

for (const issuer of issuers) {
  const issuerDir = path.join(cardsDir, issuer);
  if (!fs.statSync(issuerDir).isDirectory()) continue;
  
  const files = fs.readdirSync(issuerDir);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(issuerDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.redemption && data.redemption.ecosystemLabel) {
      console.log(`${file}: ecosystemLabel=${data.redemption.ecosystemLabel}, ecosystemValue=${data.redemption.ecosystemValue}`);
    }
  }
}
