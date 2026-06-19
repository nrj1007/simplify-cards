import { scoreCards } from "../lib/recommend";
for (const q of ["samsung card","best samsung card","samsung","best card for myntra","best lounge card"]) {
  const s = scoreCards({ query: q });
  const i = s.findIndex(x=>x.card.id==="axis-samsung-signature");
  console.log(q.padEnd(22), i>=0?`#${i+1}/${s.length}`:"(not found)");
}
