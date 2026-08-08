import fs from 'fs';
let content = fs.readFileSync('lib/recommend.ts', 'utf8');
content = content.replace('let maxDiscount = 0;', `if (card.id === "kotak-pvr-inox") console.log("movieBenefitStrings:", movieBenefitStrings); let maxDiscount = 0;`);
fs.writeFileSync('lib/recommend.ts', content);
