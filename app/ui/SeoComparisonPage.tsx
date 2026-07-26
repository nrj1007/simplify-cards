import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ComparePicker from "./ComparePicker";
import {
  chooseReasons,
  comparisonDisplayName,
  comparisonFaqs,
  comparisonLastUpdated,
  comparisonRows,
  comparisonTitle,
  forexComparisonSummary,
  finalRecommendation,
  formatCurrency,
  getSeoComparison,
  getSeoComparisonCards,
  keyBenefit,
  loungeComparisonSummary,
  quickVerdict,
  relatedComparisons,
  rewardsComparisonSummary,
  totalLoungeLabel
} from "@/lib/seo-comparisons";
import { cards } from "@/lib/cards";

type Card = (typeof cards)[number];

type Props = {
  slug: string;
};

function compareToolHref(cardAId: string, cardBId: string) {
  return `/compare?a=${cardAId}&b=${cardBId}` as Route;
}

function cardHref(cardId: string) {
  return `/cards/${cardId}` as Route;
}

function cleanText(value: string) {
  return value.replace(/(?<!\d)\.(?=\s|$|[;,])/g, "");
}

function SeoCompareCard({ card, other }: { card: Card; other: Card }) {
  return (
    <article className="panel card compare-card">
      <div>
        <div className="meta">
          <span>{card.issuer}</span>
        </div>
        <h2>{card.name}</h2>
      </div>

      <div className="meta">
        {card.tags.slice(0, 5).map((tag) => (
          <span className="badge" key={`${card.id}-${tag}`}>
            {tag}
          </span>
        ))}
      </div>

      <div className="stats compare-card-stats">
        <div className="stat">
          <strong>{cleanText(formatCurrency(card.annualFee))}</strong>
          <span>Annual fee</span>
        </div>
        <div className="stat">
          <strong>{cleanText(formatCurrency(card.feeWaiverSpend))}</strong>
          <span>Fee waiver spend</span>
        </div>
        <div className="stat">
          <strong>{totalLoungeLabel(card)}</strong>
          <span>Total lounge</span>
        </div>
        <div className="stat">
          <strong>{card.forexMarkup}%</strong>
          <span>Forex markup</span>
        </div>
      </div>

      <div className="compare-card-section">
        <strong>Best for</strong>
        <p className="muted">{cleanText(keyBenefit(card))}</p>
      </div>

      <div className="compare-card-section">
        <strong>Choose this if</strong>
        <p className="muted">{cleanText(chooseReasons(card, other).join(" "))}</p>
      </div>

      <div className="actions">
        <Link className="button secondary details-link" href={cardHref(card.id)}>
          Click for more details
        </Link>
        <Link className="button apply-now-button" href={compareToolHref(card.id, other.id)}>
          Open in compare tool
        </Link>
      </div>
    </article>
  );
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
  const cleanedFaqs = faqs.map((faq) => ({ ...faq, a: cleanText(faq.a) }));
  const related = relatedComparisons(config.slug);
  const pickerCards = cards
    .map(({ id, issuer, name }) => ({ id, issuer, name }))
    .sort((a, b) => a.issuer.localeCompare(b.issuer) || a.name.localeCompare(b.name));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cleanedFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a
      }
    }))
  };

  return (
    <div className="page-shell compare-reference-page seo-comparison has-results">
      <section className="compare-reference-hero">
        <div className="container">
          <h1>Compare</h1>
        </div>
      </section>

      <div className="page-content">
        <div className="container">
          <ComparePicker cards={pickerCards} initialFirst={cardA.id} initialSecond={cardB.id} />

          <div className="seo-comparison-heading">
            <div className="page-eyebrow">Popular comparison</div>
            <h2>{nameA} vs {nameB}</h2>
            <p>{cleanText(quickVerdict(cardA, cardB))}</p>
          </div>

          <div className="grid compare-overview">
            <SeoCompareCard card={cardA} other={cardB} />
            <SeoCompareCard card={cardB} other={cardA} />
          </div>
        </div>

        <div className="container seo-comparison-grid">
          <section className="seo-comparison-main">
            <article className="panel seo-verdict-card seo-comparison-section">
              <div className="page-eyebrow">Quick verdict</div>
              <h2>{comparisonTitle(config)}</h2>
              <p>{cleanText(quickVerdict(cardA, cardB))}</p>
            </article>

            <div className="seo-choice-grid">
              <section className="panel seo-choice-card">
                <h2>Choose {nameA} if</h2>
                <ul>
                  {chooseReasons(cardA, cardB).map((reason) => (
                    <li key={reason}>{cleanText(reason)}</li>
                  ))}
                </ul>
                <Link className="action-secondary" href={cardHref(cardA.id)}>
                  View {nameA}
                </Link>
              </section>

              <section className="panel seo-choice-card">
                <h2>Choose {nameB} if</h2>
                <ul>
                  {chooseReasons(cardB, cardA).map((reason) => (
                    <li key={reason}>{cleanText(reason)}</li>
                  ))}
                </ul>
                <Link className="action-secondary" href={cardHref(cardB.id)}>
                  View {nameB}
                </Link>
              </section>
            </div>

            <section className="panel compare-table-shell seo-comparison-table-panel" aria-labelledby="comparison-table">
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
                        <td>{cleanText(row.valueA)}</td>
                        <td>{cleanText(row.valueB)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Rewards comparison</h2>
              <p>
                {cardA.name}: {cleanText(rewardsComparisonSummary(cardA))}
              </p>
              <p>
                {cardB.name}: {cleanText(rewardsComparisonSummary(cardB))}
              </p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Lounge access comparison</h2>
              <p>{cleanText(loungeComparisonSummary(cardA, cardB))}</p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Forex and international travel comparison</h2>
              <p>{cleanText(forexComparisonSummary(cardA, cardB))} Check issuer terms before using either card for large international spends</p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Exclusions and limitations</h2>
              <p>Review the exclusions row carefully Reward caps, merchant restrictions, and excluded spends can materially change real value</p>
            </section>

            <section className="panel seo-comparison-section">
              <h2>Final recommendation</h2>
              <p>{cleanText(finalRecommendation(cardA, cardB))}</p>
            </section>
          </section>

          <aside className="seo-comparison-side">
            <section className="panel seo-side-panel">
              <h2>Compare tool</h2>
              <p>Open this pair in the interactive compare tool if you want to switch cards or inspect more rows</p>
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
              {cleanedFaqs.map((faq) => (
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
            <strong>Disclosure:</strong> Apply buttons may use affiliate links Check official site links open issuer or partner pages,
            and this comparison uses existing card data
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
