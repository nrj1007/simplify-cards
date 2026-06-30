import type { Metadata } from "next";
import { deriveBestFor, formatRupeesCompact } from "./card-detail";
import { stripScoringAnnotations } from "./cards";
import { scoreCards } from "./recommend";
import { buildCanonicalUrl, buildPageMetadata, SITE_NAME } from "./seo";
import type { CreditCard, RecommendationInput } from "./types";
import { SPLIT_SCOPE } from "./result-strategies";
import { applyResultStrategy } from "./recommend";

export type SeoLandingConfig = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  ctaQuery: string;
  howWePicked: string;
  thingsToCheck: string[];
  faqs: Array<{ q: string; a: string }>;
  ranking: RecommendationInput;
  groupByRewardType?: boolean;
};

const DEFAULT_FALLBACK = "Check issuer terms before applying.";

const COMMON_CHECKS = [
  "Confirm the latest fees, spend caps, exclusions, and offer terms on the issuer website.",
  "Check whether your regular spends fall into rewarded categories or excluded merchant categories.",
  "Review redemption rules before assigning full value to points, miles, vouchers, or cashback.",
  "Compare the annual fee against the value you can realistically use in a normal year."
];

function faqFor(intent: string): Array<{ q: string; a: string }> {
  return [
    {
      q: `How are these ${intent} cards ranked?`,
      a: "SimplifyCards ranks cards using the existing recommendation engine, which weighs fees, rewards, caps, lounge rules, forex markup, milestones, redemption value, exclusions, and card popularity from the verified card dataset."
    },
    {
      q: "Are these card details manually verified?",
      a: "The card data is manually reviewed in the database, but issuer terms can change. Always verify final fees, eligibility, rewards, and exclusions with the issuer before applying."
    },
    {
      q: "Do affiliate links affect the ranking?",
      a: "No. Rankings are generated from card data and scoring logic. Affiliate links, when present, are shown as Apply buttons."
    },
    {
      q: "Why should I still read the card detail page?",
      a: "The detail page includes fuller reward tables, exclusions, eligibility, redemption options, latest updates, and caveats that may not fit into a ranked guide summary."
    },
    {
      q: "Can I ask for a recommendation based on my own spending?",
      a: "Yes. Use the Ask SimplifyCards button on this page to continue into the AI ask flow with this search intent."
    }
  ];
}

export const SEO_LANDINGS: SeoLandingConfig[] = [
  {
    slug: "best-credit-cards-india",
    title: "Best Credit Cards in India 2026: Compare Fees, Rewards & Benefits | SimplifyCards",
    description:
      "Compare the best credit cards in India by fees, rewards, lounge access, cashback, travel benefits and exclusions. Find which card fits your spending.",
    h1: "Best Credit Cards in India 2026",
    eyebrow: "Credit card guide",
    intro:
      "A broad shortlist for people comparing Indian credit cards across fees, rewards, lounge access, travel value, cashback, exclusions, and everyday usefulness.",
    ctaQuery: "best credit cards india",
    howWePicked:
      "We rank cards with the same recommendation engine used across SimplifyCards, using a broad credit-card search intent and existing card fields for rewards, fees, lounges, redemption, caps, exclusions, and popularity.",
    thingsToCheck: COMMON_CHECKS,
    faqs: faqFor("credit card"),
    ranking: { query: "best credit card" },
    groupByRewardType: true
  },
  {
    slug: "best-cashback-credit-cards-india",
    title: "Best Cashback Credit Cards in India 2026 | SimplifyCards",
    description:
      "Compare top cashback credit cards in India for online shopping, food delivery, groceries, utilities and everyday spending.",
    h1: "Best Cashback Credit Cards in India",
    eyebrow: "Cashback guide",
    intro:
      "For people who prefer simple value back instead of managing points, miles, or voucher-heavy rewards.",
    ctaQuery: "best cashback credit cards india",
    howWePicked:
      "We use the cashback search intent in the scoring engine and rank cards by verified cashback categories, caps, fees, exclusions, and practical reward value.",
    thingsToCheck: COMMON_CHECKS,
    faqs: faqFor("cashback credit card"),
    ranking: { query: "best cashback card" }
  },
  {
    slug: "best-travel-credit-cards-india",
    title: "Best Travel Credit Cards in India 2026 | SimplifyCards",
    description:
      "Compare travel credit cards in India for flights, hotels, miles, forex markup, lounge access, transfer partners and redemption value.",
    h1: "Best Travel Credit Cards in India",
    eyebrow: "Travel guide",
    intro:
      "For travellers comparing cards by air miles, hotel value, lounge access, forex markup, travel portals, and redemption flexibility.",
    ctaQuery: "best travel credit cards india",
    howWePicked:
      "We score the travel query through the existing engine, which considers travel categories, redemption options, transfer value, lounge access, forex markup, fees, and exclusions from stored card data.",
    thingsToCheck: COMMON_CHECKS,
    faqs: faqFor("travel credit card"),
    ranking: { query: "best travel card" }
  },
  {
    slug: "best-lounge-access-credit-cards-india",
    title: "Best Lounge Access Credit Cards in India 2026 | SimplifyCards",
    description:
      "Compare credit cards in India with airport lounge access, including domestic and international visits, guest access, fees and key conditions.",
    h1: "Best Lounge Access Credit Cards in India",
    eyebrow: "Lounge guide",
    intro:
      "For frequent flyers who care about domestic or international airport lounge access, guest visits, and spend-linked lounge rules.",
    ctaQuery: "best lounge access credit cards india",
    howWePicked:
      "We use the lounge preference mode in the ranking engine, including stored lounge counts, guest access, spend conditions, fees, and other card value signals.",
    thingsToCheck: [
      ...COMMON_CHECKS,
      "Check whether lounge access needs a minimum spend in the previous month or quarter."
    ],
    faqs: faqFor("lounge access credit card"),
    ranking: { wantsLounge: true }
  },
  {
    slug: "best-lifetime-free-credit-cards-india",
    title: "Best Lifetime Free Credit Cards in India 2026 | SimplifyCards",
    description:
      "Compare lifetime free credit cards in India with no annual fee, useful rewards, lounge access, cashback and important exclusions.",
    h1: "Best Lifetime Free Credit Cards in India",
    eyebrow: "No-fee guide",
    intro:
      "For beginners and fee-conscious users who want useful rewards without needing to recover an annual fee.",
    ctaQuery: "best lifetime free credit cards india",
    howWePicked:
      "We use the lifetime-free filter in the ranking engine and compare cards by verified reward value, fees, benefits, exclusions, and practical usefulness.",
    thingsToCheck: COMMON_CHECKS,
    faqs: faqFor("lifetime free credit card"),
    ranking: { wantsLifetimeFree: true }
  },
  {
    slug: "best-fuel-credit-cards-india",
    title: "Best Fuel Credit Cards in India 2026 | SimplifyCards",
    description:
      "Compare fuel credit cards in India for petrol and diesel spends, surcharge waivers, rewards, caps, fees and exclusions.",
    h1: "Best Fuel Credit Cards in India",
    eyebrow: "Fuel guide",
    intro:
      "For people who spend regularly on petrol or diesel and want to compare fuel rewards, surcharge waivers, caps, and partner restrictions.",
    ctaQuery: "best fuel credit cards india",
    howWePicked:
      "We rank cards using the fuel search intent, which restricts results to fuel-relevant cards and then weighs stored reward rates, caps, fees, waivers, and exclusions.",
    thingsToCheck: [
      ...COMMON_CHECKS,
      "Check whether rewards apply only at specific fuel brands such as HPCL, BPCL, IndianOil, or partner pumps."
    ],
    faqs: faqFor("fuel credit card"),
    ranking: { query: "best card for fuel" }
  },
  {
    slug: "best-rupay-credit-cards-india",
    title: "Best RuPay Credit Cards in India 2026 | SimplifyCards",
    description:
      "Compare RuPay credit cards in India for UPI payments, rewards, cashback, fees, caps and important merchant exclusions.",
    h1: "Best RuPay Credit Cards in India",
    eyebrow: "RuPay guide",
    intro:
      "For users who want a RuPay credit card for UPI payments, everyday rewards, cashback, or low-fee spending.",
    ctaQuery: "best rupay credit cards india",
    howWePicked:
      "We use the RuPay network search intent in the scoring engine and rank cards from the existing dataset by fit, reward value, fees, UPI relevance, and exclusions.",
    thingsToCheck: [
      ...COMMON_CHECKS,
      "Confirm whether UPI spends earn rewards, because many cards exclude or cap wallet, rent, fuel, or certain UPI merchant categories."
    ],
    faqs: faqFor("RuPay credit card"),
    ranking: { query: "best rupay card" },
    groupByRewardType: true
  },
  {
    slug: "best-premium-credit-cards-india",
    title: "Best Premium Credit Cards in India 2026 | SimplifyCards",
    description:
      "Compare premium credit cards in India by fees, lounge access, travel rewards, milestone benefits, forex markup and redemption options.",
    h1: "Best Premium Credit Cards in India",
    eyebrow: "Premium guide",
    intro:
      "For high-spend users comparing premium cards where lounge access, travel value, milestones, and fee recovery matter as much as headline rewards.",
    ctaQuery: "best premium credit cards india",
    howWePicked:
      "We use the premium-card segment intent in the recommendation engine and compare stored fees, rewards, lounges, milestones, redemption options, and exclusions.",
    thingsToCheck: COMMON_CHECKS,
    faqs: faqFor("premium credit card"),
    ranking: { query: "best premium card" },
    groupByRewardType: true
  },
  {
    slug: "best-credit-cards-for-online-shopping",
    title: "Best Credit Cards for Online Shopping in India 2026 | SimplifyCards",
    description:
      "Compare credit cards for online shopping in India across cashback, accelerated rewards, merchant offers, caps, fees and exclusions.",
    h1: "Best Credit Cards for Online Shopping",
    eyebrow: "Online shopping guide",
    intro:
      "For shoppers comparing cards for online marketplaces, food delivery, groceries, brand portals, and accelerated online rewards.",
    ctaQuery: "best credit cards for online shopping",
    howWePicked:
      "We use the online-shopping search intent in the scoring engine, which evaluates accelerated online categories, blended merchant coverage, caps, fees, and exclusions.",
    thingsToCheck: [
      ...COMMON_CHECKS,
      "Check whether the online reward rate applies broadly or only on selected merchants or issuer portals."
    ],
    faqs: faqFor("online shopping credit card"),
    ranking: { query: "best online shopping card" },
    groupByRewardType: true
  },
  {
    slug: "best-credit-cards-for-beginners-india",
    title: "Best Credit Cards for Beginners in India 2026 | SimplifyCards",
    description:
      "Compare beginner-friendly credit cards in India with low fees, simple rewards, useful benefits, eligibility notes and key exclusions.",
    h1: "Best Credit Cards for Beginners in India",
    eyebrow: "Beginner guide",
    intro:
      "For first-time cardholders who want a simple, low-maintenance card with understandable fees, rewards, and limitations.",
    ctaQuery: "best credit cards for beginners india",
    howWePicked:
      "We use the beginner-card segment in the recommendation engine and rank cards by low fees, simple benefits, practical rewards, popularity, and exclusions.",
    thingsToCheck: [
      ...COMMON_CHECKS,
      "Check income, age, credit score, and issuer relationship eligibility before applying."
    ],
    faqs: faqFor("beginner credit card"),
    ranking: { query: "best beginner card" },
    groupByRewardType: true
  }
];

export const SEO_LANDING_SLUGS = SEO_LANDINGS.map((landing) => landing.slug);

export function getSeoLanding(slug: string) {
  return SEO_LANDINGS.find((landing) => landing.slug === slug);
}

export function landingsForCard(cardId: string, limit = 4): SeoLandingConfig[] {
  return SEO_LANDINGS.filter((landing) => {
    const topCards = selectCardsForLanding(landing);
    return topCards.some((score) => score.card.id === cardId);
  }).slice(0, limit);
}

export function buildSeoLandingMetadata(slug: string): Metadata {
  const landing = getSeoLanding(slug);
  if (!landing) {
    return buildPageMetadata({
      title: "Credit Card Guide",
      description: "Compare Indian credit cards by fees, rewards, benefits, and exclusions.",
      path: `/${slug}`
    });
  }

  const metadata = buildPageMetadata({
    title: landing.title,
    description: landing.description,
    path: `/${landing.slug}`
  });

  return {
    ...metadata,
    title: {
      absolute: landing.title
    }
  };
}

export function selectCardsForLanding(config: SeoLandingConfig) {
  return scoreCards(config.ranking).slice(0, 10);
}

export function selectSectionsForLanding(config: SeoLandingConfig) {
  const isSplit = config.groupByRewardType && SPLIT_SCOPE !== "off";
  if (!isSplit) return null;

  const scored = scoreCards(config.ranking);
  const resultSections = applyResultStrategy(scored, { ...config.ranking, resultStrategy: "reward-type-split" }, 5);
  
  // Null-on-degrade guard: if it degraded to single-list, return null so the page renders flat
  const hasSplit = resultSections.length > 1 || (resultSections.length === 1 && resultSections[0].title !== "");
  if (!hasSplit) return null;

  return resultSections;
}

function clean(value: string | undefined | null) {
  const stripped = stripScoringAnnotations(value ?? "").trim();
  return stripped || DEFAULT_FALLBACK;
}

function annualFeeLabel(card: CreditCard) {
  return card.annualFee === 0 ? "Lifetime free (no annual fee)" : formatRupeesCompact(card.annualFee);
}

function rewardFallback(card: CreditCard) {
  const reward = card.rewards.find((item) => item.displayRate) ?? card.rewards[0];
  if (!reward) return DEFAULT_FALLBACK;
  const category = reward.displayCategory ?? reward.category;
  const rate = reward.displayRate ?? `${reward.rate} ${card.rewardType} per Rs 100`;
  return `${rate} on ${category}.`;
}

function limitationFor(card: CreditCard) {
  const exclusion = card.exclusions[0];
  if (exclusion) return clean(exclusion);
  if (card.feeWaiverSpend) return `Renewal fee waived only on ${formatRupeesCompact(card.feeWaiverSpend)} annual spend.`;
  if (card.rewards.some((reward) => typeof reward.capMonthly === "number" && reward.capMonthly > 0)) {
    return "Top reward categories are capped monthly.";
  }
  return DEFAULT_FALLBACK;
}

export function deriveCardSummary(card: CreditCard) {
  const bestFor = deriveBestFor(card)[0];
  return {
    id: card.id,
    name: card.name,
    issuer: card.issuer,
    annualFee: annualFeeLabel(card),
    bestUseCase: bestFor?.title ?? (card.bestFor.length ? card.bestFor.slice(0, 3).join(", ") : "General everyday spending."),
    keyBenefit: bestFor?.desc ?? rewardFallback(card),
    limitation: limitationFor(card),
    href: `/cards/${card.id}`
  };
}

export function buildLandingJsonLd(config: SeoLandingConfig, listedCards: CreditCard[]) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a
        }
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: config.h1,
      itemListElement: listedCards.map((card, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: buildCanonicalUrl(`/cards/${card.id}`),
        name: card.name
      }))
    }
  ];
}

export function landingLastUpdated(listedCards: CreditCard[]) {
  const dates = listedCards
    .map((card) => (card.lastVerified ? new Date(card.lastVerified) : null))
    .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  const latest = dates[0] ?? new Date();
  return latest.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
