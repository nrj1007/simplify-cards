import fs from 'fs';
let content = fs.readFileSync('lib/recommend.ts', 'utf8');
content = content.replace('const candidateCards = cards', 'console.log("Card matches filter 1?", !shouldHideCardFromGenericRanking(cards.find(c=>c.id==="kotak-pvr-inox")!, input, intent)); const candidateCards = cards');
fs.writeFileSync('lib/recommend.ts', content);
