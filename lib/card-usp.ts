import type { CreditCard } from "./types";

export interface CardUSPItem {
  cardKey: string;
  cardName: string;
  usp: string;
  shortUsp: string;
}

export const creditCardUSPs: CardUSPItem[] = [
  {
    cardKey: "hdfc-infinia-metal",
    cardName: "HDFC Bank Infinia Metal Credit Card",
    usp: "A super-premium all-rounder for high spenders who want strong rewards, luxury travel benefits, premium hotel offers, and high-value redemptions through HDFC SmartBuy.",
    shortUsp: "Luxury all-rounder"
  },
  {
    cardKey: "hdfc-diners-club-black-metal",
    cardName: "HDFC Diners Club Black Metal Credit Card",
    usp: "Best suited for premium users who want high rewards, milestone benefits, travel perks, and a strong mix of lifestyle privileges at a lower fee than many ultra-premium cards.",
    shortUsp: "Premium rewards"
  },
  {
    cardKey: "axis-atlas",
    cardName: "Axis Bank Atlas Credit Card",
    usp: "A strong travel-first card for users who prefer airline and hotel points, with EDGE Miles, tier-based benefits, and flexible transfer partners.",
    shortUsp: "Miles powerhouse"
  },
  {
    cardKey: "axis-magnus-burgundy",
    cardName: "Axis Bank Magnus Burgundy Credit Card",
    usp: "Built for high-value Axis Burgundy customers who want premium travel rewards, luxury privileges, and accelerated value on large monthly spends.",
    shortUsp: "High-spend luxury"
  },
  {
    cardKey: "axis-burgundy-private",
    cardName: "Axis Bank Burgundy Private Credit Card",
    usp: "An ultra-premium card for private banking customers who want top-tier lifestyle access, concierge benefits, premium travel privileges, and strong relationship-led value.",
    shortUsp: "Private banking elite"
  },
  {
    cardKey: "icici-emeralde-private-metal",
    cardName: "ICICI Emeralde Private Metal Credit Card",
    usp: "A premium lifestyle card for users who want simple rewards, luxury travel benefits, golf, concierge, and high-end ICICI banking privileges in one package.",
    shortUsp: "Simple luxury"
  },
  {
    cardKey: "sbi-aurum",
    cardName: "SBI Aurum Credit Card",
    usp: "A luxury card for affluent SBI customers who value concierge service, premium travel access, hotel benefits, golf privileges, and high-end lifestyle experiences.",
    shortUsp: "SBI luxury"
  },
  {
    cardKey: "amex-platinum-charge",
    cardName: "American Express Platinum Card",
    usp: "Best for luxury travellers who value premium hotel status, airport lounge access, concierge service, fine dining offers, and global lifestyle privileges.",
    shortUsp: "Global luxury"
  },
  {
    cardKey: "amex-platinum-travel",
    cardName: "American Express Platinum Travel Credit Card",
    usp: "A milestone-focused travel card for users who can hit annual spend targets and want travel vouchers, Membership Rewards points, and premium Amex service.",
    shortUsp: "Milestone travel"
  },
  {
    cardKey: "amex-mrcc",
    cardName: "American Express Membership Rewards Credit Card",
    usp: "Great for disciplined monthly spenders who want predictable reward points through monthly milestones and flexible redemption options.",
    shortUsp: "Monthly rewards"
  },
  {
    cardKey: "hdfc-regalia-gold",
    cardName: "HDFC Bank Regalia Gold Credit Card",
    usp: "A balanced premium card for users who want travel, lounge access, dining, brand vouchers, and rewards without entering super-premium fee territory.",
    shortUsp: "Balanced premium"
  },
  {
    cardKey: "hdfc-marriott-bonvoy",
    cardName: "HDFC Bank Marriott Bonvoy Credit Card",
    usp: "Best for Marriott loyalists who want hotel-focused rewards, complimentary Marriott benefits, and value from stays across Marriott properties.",
    shortUsp: "Marriott loyalists"
  },
  {
    cardKey: "hsbc-travelone",
    cardName: "HSBC TravelOne Credit Card",
    usp: "A travel rewards card for users who want airline and hotel transfer options, lounge benefits, and a clean travel-focused rewards structure.",
    shortUsp: "Transfer-friendly travel"
  },
  {
    cardKey: "hsbc-premier",
    cardName: "HSBC Premier Credit Card",
    usp: "A premium relationship card for HSBC Premier customers who want travel, lifestyle, dining, and international banking-linked privileges.",
    shortUsp: "Premier banking perks"
  },
  {
    cardKey: "sbi-cashback",
    cardName: "SBI Cashback Credit Card",
    usp: "One of the simplest cashback cards for online shoppers who prefer direct savings over complicated reward point conversions.",
    shortUsp: "Online cashback"
  },
  {
    cardKey: "amazon-pay-icici",
    cardName: "Amazon Pay ICICI Bank Credit Card",
    usp: "A practical lifetime-free card for Amazon users who want straightforward cashback on Amazon, partner merchants, and everyday spends.",
    shortUsp: "Amazon savings"
  },
  {
    cardKey: "axis-ace",
    cardName: "Axis Bank Ace Credit Card",
    usp: "A simple cashback card for users who want strong value on bill payments, utilities, and everyday offline spends without complex redemption rules.",
    shortUsp: "Bill-pay cashback"
  },
  {
    cardKey: "flipkart-axis",
    cardName: "Flipkart Axis Bank Credit Card",
    usp: "Best for Flipkart-first shoppers who want direct cashback on Flipkart, selected partner brands, and regular everyday spending.",
    shortUsp: "Flipkart cashback"
  },
  {
    cardKey: "hdfc-millennia",
    cardName: "HDFC Bank Millennia Credit Card",
    usp: "A good lifestyle card for young online spenders who frequently shop across popular digital brands and want simple cashback-style rewards.",
    shortUsp: "Digital lifestyle"
  },
  {
    cardKey: "tata-neu-infinity",
    cardName: "Tata Neu Infinity HDFC Bank Credit Card",
    usp: "Best for Tata ecosystem users who spend on BigBasket, Croma, Tata CLiQ, IHCL, Air India, and UPI through the Tata Neu app.",
    shortUsp: "Tata ecosystem"
  },
  {
    cardKey: "kiwi-rupay",
    cardName: "Kiwi RuPay Credit Card",
    usp: "A UPI-first credit card for users who want rewards on everyday QR payments while keeping the convenience of UPI.",
    shortUsp: "UPI rewards"
  },
  {
    cardKey: "scapia-federal",
    cardName: "Scapia Federal Bank Credit Card",
    usp: "A travel-friendly card for users who want zero forex markup, simple travel rewards, and value on international spends.",
    shortUsp: "Zero-forex travel"
  },
  {
    cardKey: "au-ixigo",
    cardName: "AU ixigo Credit Card",
    usp: "A budget travel card for users who book flights, trains, buses, and hotels through ixigo and want travel-focused savings.",
    shortUsp: "Budget travel"
  },
  {
    cardKey: "idfc-first-wealth",
    cardName: "IDFC FIRST Wealth Credit Card",
    usp: "A no-fuss premium card for users who want decent lifestyle benefits, airport lounge access, low forex markup, and no annual fee pressure.",
    shortUsp: "Low-cost premium"
  },
  {
    cardKey: "yes-marquee",
    cardName: "YES Bank Marquee Credit Card",
    usp: "A premium rewards card for high spenders who want strong reward earning, travel benefits, lifestyle privileges, and milestone-led value.",
    shortUsp: "Premium rewards"
  }
];

// Card ID alias map to support dataset card IDs that differ from marketing cardKeys
const CARD_KEY_ALIASES: Record<string, string[]> = {
  "sbi-aurum": ["aurum-sbi"],
  "amex-platinum-charge": ["amex-platinum"],
  "amex-mrcc": ["amex-membership-rewards"],
  "amazon-pay-icici": ["icici-amazon-pay"],
  "flipkart-axis": ["axis-flipkart", "axis-fk"],
  "tata-neu-infinity": ["hdfc-tata-neu-infinity", "tata-neu-infinity-sbi"],
  "kiwi-rupay": ["yes-kiwi"],
  "scapia-federal": ["scapia-bobcard"],
  "yes-marquee": ["yes-bank-marquee"],
};

// Additional curated fallbacks for cards outside the list of 25
const additionalCurated: Record<string, string> = {
  "indusind-tiger": "Lifetime-free travel card featuring a low 1.5% forex markup, complimentary lounge access, and quarterly golf privileges.",
  "indusind-legend": "Lifetime-free premium card with weekday/weekend reward structures, discounted 1.8% forex markup, and complimentary quarterly golf privileges."
};

const additionalCuratedShort: Record<string, string> = {
  "indusind-tiger": "Lifetime-free travel card with 1.5% forex, lounge access, and quarterly golf.",
  "indusind-legend": "Lifetime-free premium card with weekday/weekend rewards and 1.8% forex."
};

// Build lookup maps
const curatedMap: Record<string, string> = { ...additionalCurated };
const curatedShortMap: Record<string, string> = { ...additionalCuratedShort };

for (const item of creditCardUSPs) {
  curatedMap[item.cardKey] = item.usp;
  curatedShortMap[item.cardKey] = item.shortUsp;

  const aliases = CARD_KEY_ALIASES[item.cardKey] || [];
  for (const alias of aliases) {
    curatedMap[alias] = item.usp;
    curatedShortMap[alias] = item.shortUsp;
  }
}

// One-line USP for a card: a curated marketing line for popular cards, otherwise a short line
// generated from the card's own fields. Shared by the /ask results and the /recommend DTO.
export function getCardUsp(card: CreditCard): string {
  if (curatedMap[card.id]) {
    return curatedMap[card.id];
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

// Compact USP for a card: curated short line for popular cards, otherwise a very short line.
// Used for display constraints (e.g., homepage/popular picks section).
export function getCardShortUsp(card: CreditCard): string {
  if (curatedShortMap[card.id]) {
    return curatedShortMap[card.id];
  }

  // Dynamic fallback: compact description
  const parts: string[] = [];
  if (card.joiningFee === 0 && card.annualFee === 0) {
    parts.push("Lifetime free");
  }
  if (card.bestFor.length > 0) {
    parts.push(`best for ${card.bestFor.slice(0, 2).join(" & ")}`);
  } else {
    parts.push(`${card.rewardType} card`);
  }

  return parts.join(", ") + ".";
}
