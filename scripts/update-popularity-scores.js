const fs = require("node:fs");
const path = require("node:path");

const cardsDir = path.join(process.cwd(), "data", "cards");
const cardFiles = fs
  .readdirSync(cardsDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const cardsByFile = new Map(
  cardFiles.map((file) => {
    const filePath = path.join(cardsDir, file);
    return [file, JSON.parse(fs.readFileSync(filePath, "utf8"))];
  })
);
const cards = [...cardsByFile.values()].flat();

const issuerWeights = new Map([
  ["HDFC Bank", 15],
  ["ICICI Bank", 15],
  ["SBI Card", 14],
  ["Axis Bank", 13],
  ["American Express", 12],
  ["YES Bank", 10],
  ["Federal Bank", 10],
  ["IDFC FIRST Bank", 9],
  ["AU Small Finance Bank", 7],
  ["HSBC Bank", 7],
  ["Bank of Baroda", 6]
]);

const curatedScores = new Map([
  ["icici-amazon-pay", 97],
  ["sbi-cashback", 96],
  ["axis-airtel", 94],
  ["hdfc-millennia", 92],
  ["axis-flipkart", 91],
  ["axis-ace", 90],
  ["axis-atlas", 89],
  ["scapia-federal", 88],
  ["hdfc-regalia-gold", 88],
  ["hdfc-diners-club-black-metal", 87],
  ["scapia-bobcard", 87],
  ["au-ixigo", 86],
  ["hdfc-tata-neu-infinity", 86],
  ["amex-platinum-travel", 86],
  ["axis-magnus", 85],
  ["icici-sapphiro", 85],
  ["amex-membership-rewards", 83],
  ["amex-gold", 82],
  ["idfc-wow", 84],
  ["icici-emeralde-private-metal", 84],
  ["hdfc-diners-club-privilege", 83],
  ["icici-makemytrip", 83],
  ["hdfc-tata-neu-plus", 82],
  ["sbi-card-prime", 82],
  ["icici-emeralde", 82],
  ["hdfc-indianoil", 81],
  ["icici-coral", 81],
  ["axis-indianoil", 80],
  ["hsbc-live-plus", 80],
  ["icici-hpcl-super-saver", 80],
  ["hdfc-moneyback-plus", 79],
  ["yes-kiwi", 81],
  ["yes-paisabazaar-paisasave", 82],
  ["yes-anq-phi", 80],
  ["hdfc-pixel-play", 79],
  ["amex-smartearn", 79],
  ["yes-first-preferred", 79],
  ["yes-pop-club", 79],
  ["yes-paisabazaar-paisasave-rupay", 78],
  ["hdfc-pixel-go", 78],
  ["axis-select", 78],
  ["tata-neu-infinity-sbi", 78],
  ["icici-platinum-chip", 78],
  ["flipkart-sbi", 77],
  ["icici-rubyx", 77],
  ["idfc-first-wealth", 77],
  ["hsbc-travelone", 77],
  ["yes-klick-rupay", 76],
  ["yes-elite-plus", 76],
  ["icici-adani-one-signature", 76],
  ["amex-platinum-reserve", 76],
  ["bobcard-eterna", 76],
  ["idfc-first-select", 76],
  ["bpcl-sbi-octane", 75],
  ["icici-adani-one-platinum", 75],
  ["axis-reserve", 75],
  ["yes-select", 74],
  ["hdfc-marriott-bonvoy", 74],
  ["hdfc-phonepe-ultimo", 74],
  ["simplyclick-sbi", 74],
  ["hsbc-taj", 74],
  ["amex-platinum", 73],
  ["idfc-first-millennia", 73],
  ["bobcard-hpcl-energie", 73],
  ["yes-ace", 72],
  ["hdfc-phonepe-uno", 72],
  ["axis-cashback", 72],
  ["idfc-first-power-plus", 72],
  ["hsbc-premier", 72],
  ["bobcard-premier", 72],
  ["yes-marquee", 84],
  ["yes-reserv", 80],
  ["tata-neu-plus-sbi", 71],
  ["idfc-first-classic", 71],
  ["hdfc-irctc", 70],
  ["irctc-rupay-sbi", 70],
  ["bobcard-select", 70],
  ["bobcard-irctc", 70],
  ["phonepe-sbi-purple", 69],
  ["phonepe-sbi-select-black", 68],
  ["axis-my-zone", 69],
  ["axis-neo", 68],
  ["axis-samsung-signature", 67],
  ["hsbc-visa-platinum", 68],
  ["hsbc-rupay-cashback", 67],
  ["hsbc-rupay-platinum", 66],
  ["axis-platinum", 64],
  ["axis-google-pay-flex", 65],
  ["axis-freecharge-plus", 64],
  ["axis-freecharge", 63],
  ["axis-fibe", 62],
  ["idfc-first-earn", 62],
  ["axis-kwik", 61],
  ["bobcard-easy", 61],
  ["reliance-sbi-prime", 60],
  ["bobcard-snapdeal", 58],
  ["ola-money-sbi", 57],
  ["axis-lic-signature", 56],
  ["reliance-sbi", 55],
  ["axis-ikea-family", 55],
  ["axis-lic-platinum", 54]
]);

const categoryBoosts = [
  [/cashback/, 10],
  [/amazon|flipkart|tata neu|airtel|phonepe|google pay/, 9],
  [/upi|rupay/, 7],
  [/lifetime free|no joining|zero annual|annualFee:0/, 6],
  [/fuel|indianoil|bpcl|hpcl/, 6],
  [/travel|atlas|regalia|diners|miles|lounge|airport/, 6],
  [/irctc|railway/, 5],
  [/grocery|dining|utility|utilities/, 4],
  [/premium|elite|prime|select|wealth|premier/, 3]
];

const nichePenalties = [
  [/doctor|shaurya|yoddha|army|navy|rakshamah|sentinel/, -12],
  [/krisflyer|miles and more|marriott|indigo/, -6],
  [/lic|ikea|spar|landmark|max|lifestyle|apollo|reliance|titan|snapdeal/, -5],
  [/corporate|business|professional|icai|icsi|cma/, -10],
  [/invite-only|private|aurum/, -8]
];

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textFor(card) {
  return [
    card.id,
    card.issuer,
    card.name,
    card.rewardType,
    ...(card.bestFor || []),
    ...(card.tags || []),
    ...(card.additionalBenefits || [])
  ]
    .join(" ")
    .toLowerCase();
}

function scoreCard(card) {
  if (curatedScores.has(card.id)) return curatedScores.get(card.id);

  const text = textFor(card);
  let score = 38 + (issuerWeights.get(card.issuer) || 4);

  for (const [pattern, boost] of categoryBoosts) {
    if (pattern.test(text)) score += boost;
  }

  for (const [pattern, penalty] of nichePenalties) {
    if (pattern.test(text)) score += penalty;
  }

  if (card.annualFee === 0) score += 4;
  else if (card.annualFee <= 500) score += 2;
  else if (card.annualFee >= 5000) score -= 3;

  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") score += 4;
  else score += Math.min(4, ((card.loungeDomestic || 0) + (card.loungeInternational || 0)) / 4);

  if (card.verificationStatus === "official-direct") score += 2;
  if (card.verificationStatus === "official-catalogue") score -= 1;
  if (card.verificationStatus === "needs-review") score -= 10;

  return clamp(score);
}

for (const card of cards) {
  card.popularityScore = scoreCard(card);
}

for (const [file, issuerCards] of cardsByFile) {
  issuerCards.sort((a, b) => b.popularityScore - a.popularityScore || a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(cardsDir, file), `${JSON.stringify(issuerCards, null, 2)}\n`);
}

cards.sort((a, b) => b.popularityScore - a.popularityScore || a.name.localeCompare(b.name));

console.log(`Updated popularityScore for ${cards.length} cards across ${cardFiles.length} file(s).`);
console.log(
  cards
    .slice(0, 15)
    .map((card, index) => `${index + 1}. ${card.popularityScore} ${card.name}`)
    .join("\n")
);
