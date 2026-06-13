import type { CreditCard } from "./types";

// One-line USP for a card: a curated marketing line for popular cards, otherwise a short line
// generated from the card's own fields. Shared by the /ask results and the /recommend DTO.
export function getCardUsp(card: CreditCard): string {
  // Curated USPs for popular cards
  const curated: Record<string, string> = {
    "hdfc-infinia-metal": "Super-premium card offering 5X rewards (up to 33.3% value) on SmartBuy flight/hotel bookings, unlimited lounge access, and premium golf privileges.",
    "sbi-cashback": "The industry benchmark for cashback, offering flat 5% cashback on all online spends (capped at Rs 5,000/month) and 1% on offline transactions.",
    "axis-atlas": "A premier travel card earning EDGE Miles that transfer at highly lucrative ratios (up to 1:2) to airline and hotel partners, with tiered milestone benefits.",
    "indusind-tiger": "Lifetime-free travel card featuring a low 1.5% forex markup, complimentary lounge access, and quarterly golf privileges.",
    "indusind-legend": "Lifetime-free premium card with weekday/weekend reward structures, discounted 1.8% forex markup, and complimentary quarterly golf privileges.",
    "amex-platinum-travel": "Highly rewarding milestone card offering up to 40,000 bonus points and a Rs 10,000 Taj stay voucher on reaching Rs 4 Lakhs in annual spends.",
    "hsbc-travelone": "A versatile travel companion featuring a low 1.75% forex markup, complimentary lounge access, and instant points transfers to airline and hotel partners.",
    "yes-bank-marquee": "Super-premium card offering 2.2% reward rate on online spends, unlimited lounge access, low 1.75% forex markup, and a generous welcome bonus.",
    "amazon-pay-icici": "Lifetime-free card offering unlimited 5% cashback on Amazon India for Prime members and 1.5% to 2% on partner spends.",
    "axis-fk": "Co-branded cashback card offering unlimited 4% cashback on Flipkart spends and 1.5% flat cashback on all other eligible spends."
  };

  if (curated[card.id]) {
    return curated[card.id];
  }

  // Dynamic fallback generation
  const isLtf = card.joiningFee === 0 && card.annualFee === 0;
  const ltfText = isLtf ? "Lifetime free card" : "";
  const bestForText = card.bestFor.length > 0 ? `Optimized for ${card.bestFor.slice(0, 2).join(" and ")}` : "";

  const features: string[] = [];
  if (card.forexMarkup <= 2) {
    features.push(`low ${card.forexMarkup}% forex markup`);
  }
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") {
    features.push("unlimited airport lounge access");
  } else if (card.loungeDomestic > 0) {
    features.push(`complimentary lounge access`);
  }

  const featuresText = features.length > 0 ? `featuring ${features.join(" and ")}` : "";

  const summary = [ltfText, bestForText, featuresText].filter(Boolean).join(", ").replace(/,\s*,/g, ",").trim();
  return summary ? summary + "." : "High-value rewards credit card.";
}
