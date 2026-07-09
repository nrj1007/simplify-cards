import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import {
  getCardsByCardSegment,
  getCardsByRewardCategory,
  getCardsByTag,
  getCardsByUseCase,
  getCardById,
  getPopularCards
} from "@/lib/cards";
import type { CreditCard } from "@/lib/types";
import CardsCarousel, { type CardsCarouselItem } from "../ui/CardsCarousel";

export const metadata: Metadata = buildPageMetadata({
  title: "Cards | SimplifyCards",
  description:
    "Browse the best Indian credit cards by category: cashback, travel, lounge access, lifetime-free cards, fuel cards, and more.",
  path: "/cards"
});

const CARD_TONES: CardsCarouselItem["tone"][] = ["plum", "gold", "blue", "ruby", "green", "slate"];

const MOCKUP_ROW_IDS = {
  best: [
    "hsbc-premier",
    "icici-emeralde-private-metal",
    "hdfc-infinia-metal",
    "hdfc-diners-club-black-metal",
    "sbi-card-elite",
    "hdfc-regalia-gold"
  ],
  cashback: [
    "sbi-cashback",
    "axis-flipkart",
    "kotak-cashback-plus",
    "hdfc-pixel-play",
    "flipkart-sbi",
    "kotak-league-platinum"
  ],
  travel: [
    "indusind-tiger",
    "hdfc-marriott-bonvoy",
    "bobcard-eterna",
    "hdfc-infinia-metal",
    "hdfc-diners-club-black-metal",
    "hdfc-regalia-gold"
  ],
  lounge: [
    "indusind-tiger",
    "bobcard-eterna",
    "sbi-card-elite",
    "hdfc-marriott-bonvoy",
    "hdfc-diners-club-black-metal",
    "hsbc-premier"
  ],
  lifetimeFree: ["indusind-tiger", "icici-amazon-pay", "idfc-first-select", "idfc-first-wealth", "scapia-federal"],
  fuel: [
    "bpcl-sbi-octane",
    "axis-indianoil",
    "icici-hpcl-super-saver",
    "idfc-first-power-plus",
    "hdfc-indianoil",
    "kotak-indianoil"
  ]
} as const;

function dedupeCards(cards: readonly CreditCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return card.status !== "discontinued" && card.status !== "closed-to-new";
  });
}

function cardTypeLabel(card: CreditCard) {
  return /cashback/i.test(card.rewardType) || card.tags.includes("cashback") ? "CASHBACK CARD" : "REWARD CARD";
}

function rateLabel(card: CreditCard) {
  const displayRate = card.rewards
    .map((reward) => reward.displayRate)
    .find((value): value is string => Boolean(value));
  if (displayRate) return displayRate.toLowerCase().startsWith("up to") ? displayRate : `up to ${displayRate}`;

  const maxRate = Math.max(0, ...card.rewards.map((reward) => reward.rate * (reward.valuePerUnit ?? 1)));
  return maxRate > 0 ? `up to ${Number(maxRate.toFixed(2))}%` : card.rewardType;
}

function summaryForCard(card: CreditCard) {
  if (card.bestFor.length > 0) {
    return `Strong fit for ${card.bestFor.slice(0, 2).join(" and ").toLowerCase()} spends`;
  }
  if (card.additionalBenefits?.[0]) return card.additionalBenefits[0];
  return `${card.rewardType} card from ${card.issuer}`;
}

function toCarouselItems(cards: readonly CreditCard[], limit = 8): CardsCarouselItem[] {
  return dedupeCards(cards)
    .slice(0, limit)
    .map((card, index) => ({
      card,
      tone: CARD_TONES[index % CARD_TONES.length],
      summary: summaryForCard(card),
      rateLabel: rateLabel(card),
      typeLabel: cardTypeLabel(card)
    }));
}

function rowCards(ids: readonly string[], fallback: readonly CreditCard[]) {
  const fixedCards = ids.map((id) => getCardById(id)).filter((card): card is CreditCard => Boolean(card));
  return dedupeCards([...fixedCards, ...fallback]);
}

export default function CardsPage() {
  const rows = [
    {
      title: "Best credit cards",
      description: "Premium cards with strong overall value, rewards, and privileges",
      items: toCarouselItems(rowCards(MOCKUP_ROW_IDS.best, getPopularCards(12)), 8)
    },
    {
      title: "Best cashback cards",
      description: "Simple value-back cards for online shopping, food, grocery, and UPI spends",
      items: toCarouselItems(rowCards(MOCKUP_ROW_IDS.cashback, getCardsByUseCase("cashback")), 8)
    },
    {
      title: "Best travel cards",
      description: "Cards built for flights, hotels, forex, rewards transfer, and travel perks",
      items: toCarouselItems(rowCards(MOCKUP_ROW_IDS.travel, getCardsByUseCase("travel")), 8)
    },
    {
      title: "Best lounge cards",
      description: "Cards to shortlist when airport lounge access matters",
      items: toCarouselItems(rowCards(MOCKUP_ROW_IDS.lounge, getCardsByTag("lounge")), 8)
    },
    {
      title: "Best lifetime-free cards",
      description: "Low-friction cards with no annual fee positioning",
      items: toCarouselItems(rowCards(MOCKUP_ROW_IDS.lifetimeFree, getCardsByCardSegment("ltf")), 8)
    },
    {
      title: "Best fuel cards",
      description: "Cards to compare for petrol, diesel, surcharge waiver, and fuel rewards",
      items: toCarouselItems(rowCards(MOCKUP_ROW_IDS.fuel, getCardsByRewardCategory("fuel")), 8)
    }
  ].filter((row) => row.items.length > 0);

  return (
    <div className="cards-page-main">
      <div className="cards-netflix-shell">
        <section aria-labelledby="cards-page-title" className="cards-simple-title">
          <h1 id="cards-page-title">cards</h1>
        </section>
        <div className="cards-rows-stack">
          {rows.map((row) => (
            <CardsCarousel description={row.description} items={row.items} key={row.title} title={row.title} />
          ))}
        </div>
      </div>
    </div>
  );
}
