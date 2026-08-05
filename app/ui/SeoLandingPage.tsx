import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ShieldCheck, Sparkles } from "lucide-react";
import CardImageFallback from "./CardImageFallback";
import { TrackedExternalLink } from "./TrackedLink";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";
import { getCardUsp } from "@/lib/card-usp";
import { cardRewardTypeIncludesCashback } from "@/lib/reward-type";
import {
  buildLandingJsonLd,
  deriveCardSummary,
  getSeoLanding,
  landingLastUpdated,
  SEO_LANDINGS,
  selectCardsForLanding,
  selectSectionsForLanding
} from "@/lib/seo-landing";
import type { CardScore, CreditCard } from "@/lib/types";

type Props = {
  slug: string;
};

const SUPPORT_LINKS: Array<{ label: string; href: Route }> = [
  { label: "Browse all cards", href: "/finder" },
  { label: "Compare two cards", href: "/compare" }
];

const CLEAN_LANDING_TITLES: Record<string, string> = {
  "best-credit-cards-india": "Best Credit Cards",
  "best-cashback-credit-cards-india": "Best Cashback Cards",
  "best-travel-credit-cards-india": "Best Travel Cards",
  "best-lounge-access-credit-cards-india": "Best Lounge Cards",
  "best-lifetime-free-credit-cards-india": "Best Lifetime-Free Cards",
  "best-fuel-credit-cards-india": "Best Fuel Cards"
};

function askHref(query: string) {
  return `/ask?query=${encodeURIComponent(query)}` as Route;
}

function RankedCard({ card, rank }: { card: CreditCard; rank: number }) {
  const summary = deriveCardSummary(card);

  return (
    <article className="seo-guide-card">
      <div className="seo-guide-rank" aria-label={`Rank ${rank}`}>
        <span>{String(rank).padStart(2, "0")}</span>
      </div>

      <div className="seo-guide-card-visual">
        {card.imageUrl ? (
          <Image src={card.imageUrl} alt={`${card.name} credit card`} fill sizes="(max-width: 640px) 120px, 156px" />
        ) : (
          <CardImageFallback issuer={card.issuer} name={card.name} />
        )}
      </div>

      <div className="seo-guide-card-content">
        <div className="seo-guide-card-heading">
          <div>
            <p className="seo-guide-issuer">{card.issuer}</p>
            <h3>{card.name}</h3>
          </div>
          <Link className="seo-guide-details" href={summary.href as Route} prefetch={false}>
            Details <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>

        <div className="seo-guide-benefit">
          <span>Key reward or benefit</span>
          <p>{summary.keyBenefit}</p>
        </div>

        <dl className="seo-guide-facts">
          <div>
            <dt>Annual fee</dt>
            <dd>{summary.annualFee}</dd>
          </div>
          <div>
            <dt>Best use case</dt>
            <dd>{summary.bestUseCase}</dd>
          </div>
          <div className="seo-guide-fact-wide">
            <dt>Major limitation</dt>
            <dd>{summary.limitation}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function toFitPercent(score: number, topFitRaw: number) {
  return topFitRaw > 0 ? Math.max(1, Math.min(100, Math.round((score / topFitRaw) * 100))) : 100;
}

function pickData(cashbackCards: CardScore[], rewardCards: CardScore[]) {
  let topPickItem: CardScore | undefined;
  let strongAlternativeItem: CardScore | undefined;
  let alsoWorthALookItem: CardScore | undefined;

  if (cashbackCards.length > 0 && rewardCards.length === 0) {
    topPickItem = cashbackCards[0];
    strongAlternativeItem = cashbackCards[1];
    alsoWorthALookItem = cashbackCards[2];
  } else if (rewardCards.length > 0 && cashbackCards.length === 0) {
    topPickItem = rewardCards[0];
    strongAlternativeItem = rewardCards[1];
    alsoWorthALookItem = rewardCards[2];
  } else if (cashbackCards.length >= 1) {
    topPickItem = cashbackCards[0];
    strongAlternativeItem = rewardCards[0];
    alsoWorthALookItem = cashbackCards[1] ?? rewardCards[1];
  } else {
    topPickItem = rewardCards[0];
    strongAlternativeItem = rewardCards[1];
    alsoWorthALookItem = rewardCards[2];
  }

  return [
    { heading: "Top pick", item: topPickItem },
    { heading: "Strong alternative", item: strongAlternativeItem },
    { heading: "Also worth a look", item: alsoWorthALookItem }
  ].filter((pick): pick is { heading: string; item: CardScore } => Boolean(pick.item));
}

function BestCreditCardResult({
  item,
  rank,
  topFitRaw,
  pickLabel,
  page
}: {
  item: CardScore;
  rank: number;
  topFitRaw: number;
  pickLabel: string | null;
  page: string;
}) {
  const { card } = item;
  const pickClass =
    pickLabel === "Top pick"
      ? " sc-result-top-pick best"
      : pickLabel === "Strong alternative"
        ? " sc-result-strong-alt"
        : pickLabel === "Also worth a look"
          ? " sc-result-also-look"
          : "";

  return (
    <article className={`result-card sc-clickable-result-card${pickClass}`} data-details-url={`/cards/${card.id}`}>
      <div className="result-main">
        <div>
          <div className="sc-result-kicker">
            <div className="rank">{rank}</div>
            <span className="sc-result-bank">{card.issuer}</span>
          </div>
          <h3 className="sc-result-title-row">
            <span className="sc-result-card-name">{card.name}</span>
            {pickLabel ? <span className="sc-result-pick-label sc-result-pick-inline">{pickLabel}</span> : null}
          </h3>
          <p>{getCardUsp(card)}</p>
          <div className="result-meta">
            <span className="mini-tag">Fit {toFitPercent(item.fitScore, topFitRaw)}/100</span>
            {card.bestFor[0] ? <span className="mini-tag">{card.bestFor[0]}</span> : null}
            <span className="mini-tag">
              {card.annualFee === 0 ? "Lifetime free" : `₹ ${card.annualFee.toLocaleString("en-IN")} fee`}
            </span>
          </div>
          <Link className="sc-more-details" href={`/cards/${card.id}` as Route} prefetch={false}>
            Click for more details →
          </Link>
        </div>
      </div>
      <div className="result-actions">
        <Link className="mini-btn sc-compare-btn" href={`/compare?a=${card.id}` as Route} prefetch={false}>
          Add to compare
        </Link>
        <TrackedExternalLink
          analyticsEvent={{
            event_name: "apply_clicked",
            page,
            source: "ask",
            card_id: card.id
          }}
          className="mini-btn primary sc-apply-btn"
          href={cardCtaHref(card)}
          rel={cardCtaRel(card)}
          target="_blank"
        >
          {cardCtaLabel(card)}
        </TrackedExternalLink>
      </div>
    </article>
  );
}

function BestCreditCardsCleanPage({
  config,
  title,
  scores,
  listedCards,
  jsonLd
}: {
  config: NonNullable<ReturnType<typeof getSeoLanding>>;
  title: string;
  scores: CardScore[];
  listedCards: CreditCard[];
  jsonLd: ReturnType<typeof buildLandingJsonLd>;
}) {
  const sections = selectSectionsForLanding(config);
  const cashbackSection = sections?.find((section) => /cashback/i.test(section.title));
  const rewardSection = sections?.find((section) => /reward/i.test(section.title));
  const cashbackCards = cashbackSection?.cards ?? scores.filter((score) => cardRewardTypeIncludesCashback(score.card));
  const rewardCards = rewardSection?.cards ?? scores.filter((score) => !cardRewardTypeIncludesCashback(score.card));
  const topFitRaw = scores[0]?.fitScore ?? 0;
  const picks = pickData(cashbackCards, rewardCards);
  const pickLabelByCardId = new Map(picks.map((pick) => [pick.item.card.id, pick.heading]));

  return (
    <div className="ask-results best-cards-clean-page">
      <section aria-labelledby="best-credit-cards-page-title" className="best-cards-simple-title">
        <div className="container best-cards-title-inner">
          <h1 id="best-credit-cards-page-title">{title}</h1>
        </div>
      </section>

      <section className="ask-content">
        <div className="container content-grid best-cards-clean-grid">
          <div className="main-stack">
            <section className="panel sc-results-panel">
              <div className="panel-body">
                <div aria-label="Result view options" className="sc-result-view-toggle">
                  <div className="sc-result-heading-left">
                    <h3>
                      All <span className="sc-purple-number">{listedCards.length}</span> matching cards
                    </h3>
                  </div>
                </div>

                <div className="sc-results-combined-view">
                  {cashbackCards.length ? (
                    <section className="sc-results-category sc-results-category-cashback">
                      <div className="sc-results-category-head">
                        <h3>Cashback Cards</h3>
                        <span className="sc-results-category-count">
                          {cashbackCards.length} card{cashbackCards.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="result-list">
                        {cashbackCards.map((item, index) => (
                          <BestCreditCardResult
                            key={item.card.id}
                            item={item}
                            rank={index + 1}
                            topFitRaw={topFitRaw}
                            pickLabel={pickLabelByCardId.get(item.card.id) ?? null}
                            page={config.slug}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {rewardCards.length ? (
                    <section className="sc-results-category sc-results-category-reward">
                      <div className="sc-results-category-head">
                        <h3>Reward Cards</h3>
                        <span className="sc-results-category-count">
                          {rewardCards.length} card{rewardCards.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="result-list">
                        {rewardCards.map((item, index) => (
                          <BestCreditCardResult
                            key={item.card.id}
                            item={item}
                            rank={index + 1}
                            topFitRaw={topFitRaw}
                            pickLabel={pickLabelByCardId.get(item.card.id) ?? null}
                            page={config.slug}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
        }}
      />
    </div>
  );
}

export default function SeoLandingPage({ slug }: Props) {
  const config = getSeoLanding(slug);
  if (!config) return null;

  const scores = selectCardsForLanding(config);
  const sections = selectSectionsForLanding(config);
  const listedCards = scores.map((score) => score.card);
  const relatedGuides = SEO_LANDINGS.filter((landing) => landing.slug !== config.slug).slice(0, 6);
  const jsonLd = buildLandingJsonLd(config, listedCards);
  const lastUpdated = landingLastUpdated(listedCards);

  const cleanTitle = CLEAN_LANDING_TITLES[config.slug];
  if (cleanTitle) {
    return <BestCreditCardsCleanPage config={config} title={cleanTitle} scores={scores} listedCards={listedCards} jsonLd={jsonLd} />;
  }

  return (
    <div className="page-shell seo-landing seo-guide">
      <section className="seo-guide-hero">
        <div className="container seo-guide-hero-inner">
          <div className="seo-guide-hero-copy">
            <div className="page-eyebrow">{config.eyebrow}</div>
            <h1>{config.h1}</h1>
            <p>{config.intro}</p>
            <div className="seo-guide-hero-actions">
              <Link className="seo-guide-primary-action" href={askHref(config.ctaQuery)}>
                Ask SimplifyCards about this <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="seo-guide-text-action" href="#ranked-cards">
                View ranked shortlist
              </Link>
            </div>
          </div>

          <div className="seo-guide-hero-summary" aria-label="Guide summary">
            <div className="seo-guide-summary-icon"><ShieldCheck aria-hidden="true" size={25} /></div>
            <div>
              <strong>Grounded in verified card data</strong>
              <p>Fees, rewards, exclusions, redemption rules, and benefits from the SimplifyCards dataset</p>
            </div>
            <dl>
              <div>
                <dt>Shortlist</dt>
                <dd>{listedCards.length} cards</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{lastUpdated}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="seo-guide-content">
        <div className="container seo-guide-layout">
          <section className="seo-guide-main" aria-labelledby="ranked-cards">
            <header className="seo-guide-section-head">
              <div>
                <div className="page-eyebrow">Ranked shortlist</div>
                <h2 id="ranked-cards">Top cards for this search</h2>
              </div>
              <p>Ranked from existing SimplifyCards data Open any card for full rewards, exclusions, redemption, and eligibility details</p>
            </header>

            {sections ? (
              <div className="seo-guide-groups">
                {sections.map((section) => {
                  if (section.cards.length === 0) return null;
                  return (
                    <section className="seo-guide-group" aria-labelledby={`seo-group-${section.title.replace(/\s+/g, "-").toLowerCase()}`} key={section.title}>
                      <div className="seo-guide-group-heading">
                        <h3 id={`seo-group-${section.title.replace(/\s+/g, "-").toLowerCase()}`}>{section.title}</h3>
                        <span>{section.cards.length} cards</span>
                      </div>
                      <div className="seo-guide-card-list">
                        {section.cards.map((score, index) => (
                          <RankedCard card={score.card} rank={index + 1} key={score.card.id} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="seo-guide-card-list">
                {listedCards.map((card, index) => (
                  <RankedCard card={card} rank={index + 1} key={card.id} />
                ))}
              </div>
            )}
          </section>

          <aside className="seo-guide-side" aria-label="Guide summary">
            <div className="seo-guide-side-sticky">
              <section className="seo-guide-side-panel seo-guide-method">
                <div className="seo-guide-side-heading">
                  <Sparkles aria-hidden="true" size={19} />
                  <h2>How we picked these cards</h2>
                </div>
                <p>{config.howWePicked}</p>
              </section>

              <section className="seo-guide-side-panel">
                <div className="seo-guide-side-heading">
                  <Check aria-hidden="true" size={19} />
                  <h2>Things to check before applying</h2>
                </div>
                <ul className="seo-guide-check-list">
                  {config.thingsToCheck.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="seo-guide-side-panel seo-guide-continue">
                <CalendarDays aria-hidden="true" size={20} />
                <h2>Continue your search</h2>
                <p>Use the AI ask flow for your own spend pattern, fee limit, or card shortlist</p>
                <Link className="seo-guide-primary-action" href={askHref(config.ctaQuery)}>
                  Ask SimplifyCards <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </section>
            </div>
          </aside>
        </div>

        <section className="container seo-guide-faq" aria-labelledby="seo-faq">
          <header className="seo-guide-section-head">
            <div>
              <div className="page-eyebrow">FAQ</div>
              <h2 id="seo-faq">Common questions</h2>
            </div>
            <p>Practical answers about the shortlist, verification, and how rankings work</p>
          </header>
          <div className="seo-guide-faq-list">
            {config.faqs.map((faq, index) => (
              <details open={index === 0} key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="container seo-guide-related" aria-labelledby="seo-related">
          <div>
            <div className="page-eyebrow">Explore next</div>
            <h2 id="seo-related">Related guides</h2>
            <p>Explore nearby card searches or compare specific cards side by side</p>
          </div>
          <nav className="seo-guide-related-links" aria-label="Related credit card guides">
            {relatedGuides.map((landing) => (
              <Link key={landing.slug} href={`/${landing.slug}` as Route}>
                {landing.h1} <ArrowRight aria-hidden="true" size={15} />
              </Link>
            ))}
            {SUPPORT_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label} <ArrowRight aria-hidden="true" size={15} />
              </Link>
            ))}
          </nav>
        </section>

        <section className="container seo-guide-disclosure" aria-label="Disclosure">
          <p>
            <strong>Disclosure:</strong> Apply buttons may use affiliate links. Check official site links open issuer or partner pages,
            and rankings are generated from card data and scoring logic.
          </p>
          <p>Last updated: {lastUpdated}</p>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
        }}
      />
    </div>
  );
}
