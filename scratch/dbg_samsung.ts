import { scoreCards } from "../lib/recommend";
const qs: Record<string,any> = {
  "online": { query: "best online shopping card" },
  "grocery": { query: "best grocery card" },
  "dining": { query: "best dining card" },
  "broad": { query: "best credit card" },
  "cashback": { query: "best cashback card" },
};
for (const [n,inp] of Object.entries(qs)) {
  const s = scoreCards(inp);
  const i = s.findIndex(x=>x.card.id==="axis-samsung-signature");
  console.log(n.padEnd(9), i>=0?`#${i+1}/${s.length}`:"(filtered out)");
}
