import { scoreCards } from "../lib/recommend";
import { getCardById } from "../lib/cards";
// Magnus rent: 6 EDGE/Rs100 ; Amex Plat fuel: 5 MR/Rs100. Back out the rupee value per point.
const rent = scoreCards({ query: "best rent card" });
const fuel = scoreCards({ query: "best card for fuel" });
function effVal(scores:any, id:string, cat:string, ratePer100:number) {
  const s = scores.find((x:any)=>x.card.id===id); if(!s) return;
  const rows = s.rewardBreakdown.filter((b:any)=>b.spendCategory===cat);
  const monthlyRupee = rows.reduce((t:number,b:any)=>t+b.monthlyReward,0);
  const monthlySpendOnCat = rows.reduce((t:number,b:any)=>t+b.monthlySpend,0);
  const points = monthlySpendOnCat/100*ratePer100;
  console.log(`${id.padEnd(22)} ${cat}: spend Rs${Math.round(monthlySpendOnCat)} x ${ratePer100}/100 = ${Math.round(points)} pts -> Rs${Math.round(monthlyRupee)}  => Rs${(monthlyRupee/points).toFixed(2)}/point`);
}
effVal(rent,"axis-magnus-burgundy","rent",6);
effVal(rent,"axis-magnus","rent",6);
effVal(rent,"hsbc-premier","rent",3);
effVal(fuel,"amex-platinum","fuel",5);
const m = getCardById("axis-magnus-burgundy")!;
console.log("\nmagnus-burgundy redemption:", JSON.stringify(m.redemption?.transferPartnerValuations ?? m.redemption));
