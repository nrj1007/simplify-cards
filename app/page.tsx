import type { Metadata } from "next";
import { cards } from "@/lib/cards";
import { getAllUpdates } from "@/lib/card-content";
import type { CardUpdateWithMeta } from "@/lib/card-content";
import type { CreditCard } from "@/lib/types";
import { SITE_NAME } from "@/lib/seo";
import LandingPortal from "./ui/LandingPortal";
import type { LandingCard, LandingUpdate } from "./ui/LandingPortal";

export const metadata: Metadata = {
  title: "Find the Right Indian Credit Card",
  description:
    "Ask questions, compare cards, estimate rewards, and find the right Indian credit card with verified fees, benefits, lounges, exclusions, and redemption details.",
  alternates: {
    canonical: "./"
  },
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: `Find the Right Indian Credit Card | ${SITE_NAME}`,
    description:
      "Ask questions, compare cards, estimate rewards, and find the right Indian credit card with verified fees, benefits, lounges, exclusions, and redemption details.",
    url: "https://www.simplifycards.in/",
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: `Find the Right Indian Credit Card | ${SITE_NAME}`,
    description:
      "Ask questions, compare cards, estimate rewards, and find the right Indian credit card with verified fees, benefits, lounges, exclusions, and redemption details."
  }
};

const POPULAR_CARD_IDS = [
  "hdfc-infinia-metal",
  "sbi-cashback",
  "amex-platinum-travel",
  "hdfc-millennia",
  "icici-amazon-pay",
  "axis-magnus"
];

function formatFee(value: number) {
  return value === 0 ? "Rs 0" : `Rs ${new Intl.NumberFormat("en-IN").format(value)}`;
}

function firstRewardRate(card: CreditCard) {
  const reward = [...card.rewards].sort((left, right) => right.rate - left.rate)[0];
  if (!reward) return card.rewardType;
  const rate = Number.isInteger(reward.rate) ? reward.rate.toString() : reward.rate.toFixed(1);
  return `up to ${rate}%`;
}

function loungeLabel(card: CreditCard) {
  if (card.combinedLoungeAccessLabel) return card.combinedLoungeAccessLabel;
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") return "Unlimited lounge access";
  const total = Number(card.loungeDomestic || 0) + Number(card.loungeInternational || 0);
  return total > 0 ? `${total} lounge visits/year` : "No complimentary lounge access";
}

function toLandingCard(card: CreditCard): LandingCard {
  return {
    id: card.id,
    issuer: card.issuer,
    name: card.name,
    annualFee: formatFee(card.annualFee),
    bestFor: card.bestFor.slice(0, 3),
    rewardType: card.rewardType,
    rewardRate: firstRewardRate(card),
    highlight: card.additionalBenefits?.[0] ?? card.bestFor.join(", "),
    lounge: loungeLabel(card),
    sourceUrl: card.sourceUrl,
    applyUrl: card.affiliateUrl ?? card.applyUrl ?? card.sourceUrl,
    hasAffiliate: Boolean(card.affiliateUrl),
    imageUrl: card.imageUrl ?? null
  };
}

function toLandingUpdate(update: CardUpdateWithMeta): LandingUpdate {
  return {
    title: update.title,
    summary: update.summary,
    publishedAt: update.publishedAt,
    sourceLabel: update.sourceLabel,
    sourceUrl: update.sourceUrl,
    cardId: update.cardId,
    cardName: update.cardName,
    cardIssuer: update.cardIssuer
  };
}

export default function Home() {
  const selectedCards = POPULAR_CARD_IDS.map((id) => cards.find((card) => card.id === id)).filter(
    (card): card is CreditCard => Boolean(card)
  );
  const fallbackCards = cards.filter((card) => !POPULAR_CARD_IDS.includes(card.id)).slice(0, 6 - selectedCards.length);
  const popularCards = [...selectedCards, ...fallbackCards].map(toLandingCard);
  const updates = getAllUpdates(6).map(toLandingUpdate);

  return <LandingPortal popularCards={popularCards} updates={updates} />;
}
