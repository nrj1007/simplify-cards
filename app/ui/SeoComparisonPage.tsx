import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "./PageHero";
import {
  chooseReasons,
  comparisonDisplayName,
  comparisonFaqs,
  comparisonLastUpdated,
  comparisonRows,
  comparisonTitle,
  forexComparisonSummary,
  finalRecommendation,
  getSeoComparison,
  getSeoComparisonCards,
  loungeComparisonSummary,
  quickVerdict,
  relatedComparisons,
  rewardsComparisonSummary
} from "@/lib/seo-comparisons";

type Props = {
  slug: string;
};

function compareToolHref(cardAId: string, cardBId: string) {
  return `/compare?a=${cardAId}&b=${cardBId}` as Route;
}

function cardHref(cardId: string) {
  return `/cards/${cardId}` as Route;
}

export default function SeoComparisonPage({ slug }: Props) {
  const config = getSeoComparison(slug);
  const pair = config ? getSeoComparisonCards(config) : null;
  if (!config || !pair) notFound();

  const { cardA, cardB } = pair;
  const nameA = comparisonDisplayName(cardA);
  const nameB = comparisonDisplayName(cardB);
  const rows = comparisonRows(cardA, cardB);
  const faqs = comparisonFaqs(cardA, cardB);
  const related = relatedComparisons(config.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a
      }
    }))
  };

  return (
    <div className="page-shell seo-comparison">
      <PageHero
        eyebrow="Credit card comparison"
        title={`${nameA} vs ${nameB}`}
        lead={`Compare ${nameA} and ${nameB} by fees, rewards, lounge access, forex markup, exclusions, milestones, and fit.`}
      >
        <div className="seo-landing-hero-actions">
          <Link className="btn btn-primary" href={compareToolHref(cardA.id, cardB.id)}>
            Open in compare tool
          </Link>
          <Link className="btn btn-ghost" href={cardHref(cardA.id)}>
            {nameA} details
          </Link>
          <Link className="btn btn-ghost" href={cardHref(cardB.id)}>
            {nameB} details
          </Link>
        </div>
      </PageHero>

      <div className="page-content">
        <div className="container seo-comparison-grid">
          <section className="seo-comparison-main">
            <article className="panel seo-verdict-card">
              <div className="page-eyebrow">Quick verdict</div>
              <h2>{comparisonTitle(config)}</h2>
              <p>{quickVerdict(cardA, cardB)}</p>
            </article>

            <div className="seo-choice-grid">
              <section className="panel seo-choice-card">
                <h2>Choose {nameA} if...</h2>
                <ul>
                  {chooseReasons(cardA, cardB).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <Link className="action-secondary" href={cardHref(cardA.id)}>
                  View {nameA}
                </Link>
              </section>

              <section className="panel seo-choice-card">
                <h2>Choose {nameB} if...</h2>
                <ul>
                  {chooseReasons(cardB, cardA).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <Link className="action-secondary" href={cardHref(cardB.id)}>
                  View {nameB}
                </Link>
              </section>
            </div>

            <section className="panel seo-comparison-table-panel" aria-labelledby="comparison-table">
              <div className="seo-section-head">
                <div>
                  <div className="page-eyebrow">Side-by-side</div>
                  <h2 id="comparison-table">Fees, rewards and benefits compared</h2>
                </div>
              </div>
              <div className="table-wrap">
                <table className="compare-table compare-table-rich seo-comparison-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th>{cardA.name}</th>
                      <th>{cardB.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{row.valueA}</td>
                        <td>{row.valueB}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Rewards comparison</h2>
              <p>
                {cardA.name}: {rewardsComparisonSummary(cardA)}
              </p>
              <p>
                {cardB.name}: {rewardsComparisonSummary(cardB)}
              </p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Lounge access comparison</h2>
              <p>{loungeComparisonSummary(cardA, cardB)}</p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Forex and international travel comparison</h2>
              <p>{forexComparisonSummary(cardA, cardB)} Check issuer terms before using either card for large international spends.</p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Exclusions and limitations</h2>
              <p>Review the exclusions row carefully. Reward caps, merchant restrictions, and excluded spends can materially change real value.</p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Final recommendation</h2>
              <p>{finalRecommendation(cardA, cardB)}</p>
            </section>
          </section>

          <aside className="seo-comparison-side">
            <section className="panel seo-side-panel">
              <h2>Compare tool</h2>
              <p>Open this pair in the interactive compare tool if you want to switch cards or inspect more rows.</p>
              <Link className="btn btn-primary seo-side-cta" href={compareToolHref(cardA.id, cardB.id)}>
                Open compare tool
              </Link>
            </section>

            <section className="panel seo-side-panel">
              <h2>Card detail pages</h2>
              <div className="seo-related-links">
                <Link href={cardHref(cardA.id)}>{cardA.name}</Link>
                <Link href={cardHref(cardB.id)}>{cardB.name}</Link>
              </div>
            </section>

            <section className="panel seo-side-panel">
              <h2>Related comparisons</h2>
              <div className="seo-related-links">
                {related.map((item) => (
                  <Link key={item.slug} href={`/compare/${item.slug}` as Route}>
                    {comparisonTitle(item)}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="container seo-faq-section" aria-labelledby="comparison-faq">
          <div className="panel">
            <div className="seo-section-head">
              <div>
                <div className="page-eyebrow">FAQ</div>
                <h2 id="comparison-faq">Common questions</h2>
              </div>
            </div>
            <div className="seo-faq-grid">
              {faqs.map((faq) => (
                <article key={faq.q}>
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container seo-disclosure" aria-label="Disclosure">
          <p>
            <strong>Disclosure:</strong> Official-site links open issuer or partner pages. No affiliate links are currently used, and this
            comparison uses existing card data.
          </p>
          <p>Last updated: {comparisonLastUpdated(cardA, cardB)}</p>
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
