import type { Route } from "next";
import Link from "next/link";
import PageHero from "./PageHero";
import {
  buildLandingJsonLd,
  deriveCardSummary,
  getSeoLanding,
  landingLastUpdated,
  SEO_LANDINGS,
  selectCardsForLanding,
  selectSectionsForLanding
} from "@/lib/seo-landing";

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

export default function SeoLandingPage({ slug }: Props) {
  const config = getSeoLanding(slug);
  if (!config) return null;

  const scores = selectCardsForLanding(config);
  const sections = selectSectionsForLanding(config);
  const listedCards = scores.map((score) => score.card);
  const summaries = listedCards.map(deriveCardSummary);
  const relatedGuides = SEO_LANDINGS.filter((landing) => landing.slug !== config.slug).slice(0, 6);
  const jsonLd = buildLandingJsonLd(config, listedCards);

  return (
    <div className="page-shell seo-landing">
      <PageHero eyebrow={config.eyebrow} title={config.h1} lead={config.intro}>
        <div className="seo-landing-hero-actions">
          <Link className="btn btn-primary" href={askHref(config.ctaQuery)}>
            Ask SimplifyCards about this
          </Link>
        </div>
      </PageHero>

      <div className="page-content">
        <div className="container seo-landing-grid">
          <section className="seo-landing-main section" aria-labelledby="ranked-cards">
            <div className="seo-section-head">
              <div>
                <div className="page-eyebrow">Ranked shortlist</div>
                <h2 id="ranked-cards">Top cards for this search</h2>
              </div>
              <p>Ranked from existing SimplifyCards data. Open any card for full rewards, exclusions, redemption, and eligibility details.</p>
            </div>

            {sections ? (
              <div className="recommend-sections">
                {sections.map((section) => {
                  if (section.cards.length === 0) return null;
                  return (
                    <div key={section.title} className="recommend-section">
                      <h3 className="recommend-section-title">{section.title}</h3>
                      <div className="seo-card-list">
                        {section.cards.map((score, index) => {
                          const card = deriveCardSummary(score.card);
                          return (
                            <article className="panel seo-card-row" key={card.id}>
                              <div className="seo-rank">#{index + 1}</div>
                              <div className="seo-card-copy">
                                <div className="issuer">{card.issuer}</div>
                                <h3>{card.name}</h3>
                                <dl className="seo-card-facts">
                                  <div>
                                    <dt>Annual fee</dt>
                                    <dd>{card.annualFee}</dd>
                                  </div>
                                  <div>
                                    <dt>Best use case</dt>
                                    <dd>{card.bestUseCase}</dd>
                                  </div>
                                  <div>
                                    <dt>Key reward or benefit</dt>
                                    <dd>{card.keyBenefit}</dd>
                                  </div>
                                  <div>
                                    <dt>Major limitation</dt>
                                    <dd>{card.limitation}</dd>
                                  </div>
                                </dl>
                              </div>
                              <Link className="action-secondary seo-card-link" href={card.href as Route}>
                                Details
                              </Link>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="seo-card-list">
                {summaries.map((card, index) => (
                  <article className="panel seo-card-row" key={card.id}>
                    <div className="seo-rank">#{index + 1}</div>
                    <div className="seo-card-copy">
                      <div className="issuer">{card.issuer}</div>
                      <h3>{card.name}</h3>
                      <dl className="seo-card-facts">
                        <div>
                          <dt>Annual fee</dt>
                          <dd>{card.annualFee}</dd>
                        </div>
                        <div>
                          <dt>Best use case</dt>
                          <dd>{card.bestUseCase}</dd>
                        </div>
                        <div>
                          <dt>Key reward or benefit</dt>
                          <dd>{card.keyBenefit}</dd>
                        </div>
                        <div>
                          <dt>Major limitation</dt>
                          <dd>{card.limitation}</dd>
                        </div>
                      </dl>
                    </div>
                    <Link className="action-secondary seo-card-link" href={card.href as Route}>
                      Details
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="seo-landing-side" aria-label="Guide summary">
            <section className="panel seo-side-panel">
              <h2>How we picked these cards</h2>
              <p>{config.howWePicked}</p>
            </section>

            <section className="panel seo-side-panel">
              <h2>Things to check before applying</h2>
              <ul className="seo-check-list">
                {config.thingsToCheck.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="panel seo-side-panel">
              <h2>Continue your search</h2>
              <Link className="btn btn-primary seo-side-cta" href={askHref(config.ctaQuery)}>
                Ask SimplifyCards about this
              </Link>
              <p className="micro-note">Use the AI ask flow for your own spend pattern, fee limit, or card shortlist.</p>
            </section>
          </aside>
        </div>

        <section className="container seo-faq-section" aria-labelledby="seo-faq">
          <div className="panel">
            <div className="seo-section-head">
              <div>
                <div className="page-eyebrow">FAQ</div>
                <h2 id="seo-faq">Common questions</h2>
              </div>
            </div>
            <div className="seo-faq-grid">
              {config.faqs.map((faq) => (
                <article key={faq.q}>
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container seo-related-section" aria-labelledby="seo-related">
          <div className="panel seo-related-panel">
            <div>
              <h2 id="seo-related">Related guides</h2>
              <p>Explore nearby card searches or compare specific cards side by side.</p>
            </div>
            <div className="seo-related-links">
              {relatedGuides.map((landing) => (
                <Link key={landing.slug} href={`/${landing.slug}` as Route}>
                  {landing.h1}
                </Link>
              ))}
              {SUPPORT_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="container seo-disclosure" aria-label="Disclosure">
          <p>
            <strong>Disclosure:</strong> Apply buttons may use affiliate links. Check official site links open issuer or partner pages,
            and rankings are generated from card data and scoring logic.
          </p>
          <p>Last updated: {landingLastUpdated(listedCards)}</p>
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
