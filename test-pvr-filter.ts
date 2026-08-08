import fs from 'fs';
const card = JSON.parse(fs.readFileSync('data/cards/kotak-mahindra/kotak-pvr-inox.json', 'utf-8'));
const benefitStrings = [
  ...(card.additionalBenefits || []),
  ...(card.milestoneBenefits?.map((m: any) => m.label) || []),
  ...(card.rewards.map((r: any) => r.displayCategory + " " + r.displayRate))
];
const movieBenefitStrings = benefitStrings
  .filter(s => /movie|bookmyshow|pvr|inox|ticket|district/i.test(s))
  .join(" ")
  .toLowerCase();
console.log("Movie strings:", movieBenefitStrings ? true : false);
console.log("String:", movieBenefitStrings);
