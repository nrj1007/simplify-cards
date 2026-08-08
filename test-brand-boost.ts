import fs from 'fs';
let content = fs.readFileSync('lib/recommend.ts', 'utf8');
content = content.replace('if (maxDiscount > 0) {', `
        const isMovieCoBrand = /pvr|inox|bookmyshow|bms|play/i.test(card.id) || /pvr|inox|bookmyshow|play/i.test(card.name);
        if (isMovieCoBrand) {
          focusBoost += 40000;
        }
        if (maxDiscount > 0) {`);
fs.writeFileSync('lib/recommend.ts', content);
