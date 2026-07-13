import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ShieldCheck, Sparkles } from "lucide-react";
import CardImageFallback from "./CardImageFallback";
import {
  buildLandingJsonLd,
  deriveCardSummary,
  getSeoLanding,
  landingLastUpdated,
  SEO_LANDINGS,
  selectCardsForLanding,
  selectSectionsForLanding
} from "@/lib/seo-landing";
import type { CreditCard } from "@/lib/types";

type Props = {
  slug: string;
};

const SUPPORT_LINKS: Array<{ label: string; href: Route }> = [
  { label: "Browse all cards", href: "/finder" },
  { label: "Compare two cards", href: "/compare" }
];

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
          <Link className="seo-guide-details" href={summary.href as Route}>
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

export default function SeoLandingPage({ slug }: Props) {
  const config = getSeoLanding(slug);
  if (!config) return null;

  const scores = selectCardsForLanding(config);
  const sections = selectSectionsForLanding(config);
  const listedCards = scores.map((score) => score.card);
  const relatedGuides = SEO_LANDINGS.filter((landing) => landing.slug !== config.slug).slice(0, 6);
  const jsonLd = buildLandingJsonLd(config, listedCards);
  const lastUpdated = landingLastUpdated(listedCards);

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
              <p>Fees, rewards, exclusions, redemption rules, and benefits from the SimplifyCards dataset.</p>
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
              <p>Ranked from existing SimplifyCards data. Open any card for full rewards, exclusions, redemption, and eligibility details.</p>
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
                <p>Use the AI ask flow for your own spend pattern, fee limit, or card shortlist.</p>
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
            <p>Practical answers about the shortlist, verification, and how rankings work.</p>
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
            <p>Explore nearby card searches or compare specific cards side by side.</p>
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
