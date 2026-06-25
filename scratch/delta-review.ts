import { scoreCards } from "../lib/recommend";
const s = scoreCards({ query: "top card under 5000" }).find((x) => x.card.id === "hsbc-travelone");
console.log("hsbc-travelone reasons:");
for (const r of s?.reasons ?? []) console.log("  -", r);
console.log("has milestone-upside reason:", (s?.reasons ?? []).some((r) => /milestone and fee-waiver upside/i.test(r)));
console.log("debug has comparisonMilestoneAndWaiverDelta:", "comparisonMilestoneAndWaiverDelta" in ((s as any)?.debug ?? {}));
console.log("fit - net =", Math.round((s?.fitScore ?? 0) - (s?.estimatedNetValue ?? 0)));
