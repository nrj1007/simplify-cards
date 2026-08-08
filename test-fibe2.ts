import fs from 'fs';
const card = JSON.parse(fs.readFileSync('data/cards/axis/axis-fibe.json', 'utf-8'));
const benefitStrings = [
  ...(card.additionalBenefits || []),
  ...(card.milestoneBenefits || []),
  ...(card.rewards.map(r => r.displayCategory + " " + r.displayRate))
];
const movieBenefitStrings = benefitStrings
  .filter(s => /movie|bookmyshow|pvr|inox|ticket|district/i.test(s))
  .join(" ")
  .toLowerCase();
let maxDiscount = 0;
const regex = /(?:up\s*to|upto|capped\s*at|worth\s*up\s*to|worth)\s*(?:rs\.?|₹|rs)?\s*(\d{2,4})/gi;
let match;
while ((match = regex.exec(movieBenefitStrings)) !== null) {
  const val = parseInt(match[1], 10);
  if (!isNaN(val) && val > maxDiscount && val <= 2000) {
    maxDiscount = val;
  }
}
console.log("Movie strings:", movieBenefitStrings);
console.log("Max Discount:", maxDiscount);
