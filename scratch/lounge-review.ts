import { scoreCards } from "../lib/recommend";
for (const q of ["best lounge card", "best international lounge card", "best cards for guest lounge access"]) {
  console.log("\n===== " + q + " =====");
  const scores = scoreCards({ query: q }).slice(0, 8);
  for (const s of scores) {
    const d: any = (s as any).debug ?? {};
    console.log(
      s.card.id.padEnd(28),
      "#"+(rank++)+" "+"blend="+Math.round((s as any).envelopeScoring?.normalizedFitScore ?? s.fitScore).toString().padStart(8),
      "net=" + Math.round(s.estimatedNetValue).toString().padStart(8),
      "lounge=" + Math.round(d.loungeBoost ?? 0).toString().padStart(8),
      "fee=" + (s.card.annualFee ?? 0).toString().padStart(6),
      "| dom=" + JSON.stringify(s.card.loungeDomestic), "intl=" + JSON.stringify(s.card.loungeInternational),
      "gDom=" + (s.card.loungeGuestDomestic ?? 0), "gIntl=" + (s.card.loungeGuestInternational ?? 0), "pool=" + (s.card.loungeGuestSharedPool ?? false)
    );
  }
}
