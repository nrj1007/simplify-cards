import fs from 'fs';
let content = fs.readFileSync('lib/recommend.ts', 'utf8');
content = content.replace('let disqualifyCard = false;', `console.log(card.id, "matchesFocus:", matchesFocus); let disqualifyCard = false;`);
fs.writeFileSync('lib/recommend.ts', content);
