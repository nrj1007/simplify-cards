const { calculateRewards } = require("../lib/reward-calculator");
const fs = require("fs");
const path = require("path");

const cardPath = path.join(__dirname, "../data/cards/sbi/simplyclick-sbi.json");
const card = JSON.parse(fs.readFileSync(cardPath, "utf8"));

const result = calculateRewards(card, {
  online: 10000,
  base: 10000,
  fuel: 5000
});

console.log("Result monthlyUnits:", result.monthlyUnits);
console.log("Rows:", JSON.stringify(result.rows, null, 2));
