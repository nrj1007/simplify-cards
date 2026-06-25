import { scoreCards } from "../lib/recommend";
for (const q of ["best lounge card", "best international lounge card"]) {
  console.log("\n===== " + q + " =====");
  scoreCards({ query: q }).slice(0, 8).forEach((s, i) => {
    const blend = Math.round((s as any).envelopeScoring?.normalizedFitScore ?? s.fitScore);
    console.log(
      ("#" + (i + 1)).padEnd(3), s.card.id.padEnd(28),
      "blend=" + blend.toString().padStart(8),
      "net=" + Math.round(s.estimatedNetValue).toString().padStart(8),
      "guest:", "gDom=" + (s.card.loungeGuestDomestic ?? 0), "gIntl=" + (s.card.loungeGuestInternational ?? 0), "pool=" + (s.card.loungeGuestSharedPool ?? false)
    );
  });
}
