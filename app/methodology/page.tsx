import type { Metadata, Route } from "next";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "How We Rate Cards",
  description:
    "Learn how SimplifyCards ranks and scores Indian credit cards. We use verified card data, realistic spend models, and transparent benefit calculations.",
  path: "/methodology"
});

const RANKING_MODES = [
  {
    title: "Category Focus",
    description: "When you search for cards for specific categories (e.g., dining, grocery, utilities, or online shopping), we evaluate cards at realistic monthly spends for that specific category. The specialists win based on their category reward rates, capping rules, and merchant coverage."
  },
  {
    title: "Segment & Fee Bands",
    description: "Cards are grouped into clear tiers based on annual fees: beginner/lifetime-free, mid-premium, premium, and super-premium. We score them using representative monthly spends matching those fee levels, ensuring we don't compare beginner cards directly to super-premium cards."
  },
  {
    title: "UPI & RuPay",
    description: "For UPI transaction queries, we filter for RuPay credit cards and analyze base vs. accelerated reward economics (including paid membership options) to surface the best card for scan-and-pay spending."
  },
  {
    title: "Forex & International Travel",
    description: "For travel queries involving international spend, we weigh rewards against the card's real foreign currency markup fee. A high-reward card with a high markup may rank lower than a low-fee, low-markup card."
  },
  {
    title: "Lounge Access",
    description: "We parse domestic and international lounge benefits, including complex spend-conditioned rules (e.g., spend ₹35,000 in the previous quarter to unlock access) and guest visit allowances, so you know exactly what is required to access a lounge."
  },
  {
    title: "Fuel Cards",
    description: "We filter specifically for fuel co-branded cards, matching fuel surcharge waivers and accelerated rewards against typical monthly fuel spends."
  }
];

export default function MethodologyPage() {
  return (
    <div className="page-shell about-page">
      <PageHero
        eyebrow="Methodology"
        title="How We Rate Cards"
        lead="A transparent look at the math, data rules, and scoring modes behind our credit card recommendations."
      >
        <div className="about-hero-actions">
          <Link className="btn btn-primary" href="/recommend">
            Try the Recommender
          </Link>
          <Link className="btn btn-ghost" href="/ask">
            Ask a Question
          </Link>
        </div>
      </PageHero>

      <div className="page-content">
        <div className="container about-grid">
          <section className="about-main">
            <article className="panel about-card">
              <div className="page-eyebrow">Data First, AI Second</div>
              <h2>Verified Data is the Source of Truth</h2>
              <p>
                Unlike generic blogs or AI chatbots that search the web in real-time and hallucinate details, SimplifyCards processes decisions through a manually-curated dataset of over 200 Indian credit cards (stored locally under <code>data/cards/</code>).
              </p>
              <p>
                Every card fee, reward multiplier, monthly cap, category exclusion, lounge spend requirement, and milestone tier in our database is verified by hand. Our AI is only used to format and phrase answers—never to invent card facts, terms, or rates.
              </p>
            </article>

            <article className="panel about-card">
              <div className="page-eyebrow">The Scoring Engine</div>
              <h2>How Fit is Calculated</h2>
              <p>
                When you compare cards or use the spend recommender, our engine calculates a <strong>Fit Score</strong> based on two core factors:
              </p>
              <ul className="about-list">
                <li>
                  <strong>Net Annual Value (NAV):</strong> We calculate the actual monetary value you would receive in a year in rupees:
                  <div className="methodology-formula">
                    Net Value = (Annual Reward Points Value + Milestone Benefits) - (Annual Fees)
                  </div>
                  This calculation includes joining benefits, factors in renewal fee waivers (if your spend exceeds the waiver threshold), and applies correct redemption rates for cash, statement credit, or travel points.
                </li>
                <li>
                  <strong>Relevance Weight:</strong> We parse your search query or spend profile to detect specific preferences (e.g., a specific bank, lounge access, or network). We then apply a boost to cards matching those criteria.
                </li>
              </ul>
            </article>

            <article className="panel about-card">
              <div className="page-eyebrow">Ranking Modes</div>
              <h2>Tailored Scoring Strategies</h2>
              <p>
                Our recommendation engine (<code>scoreCards</code>) does not use a one-size-fits-all formula. It analyzes the intent behind your query and routes it to specialized ranking modes:
              </p>
              <div className="methodology-modes">
                {RANKING_MODES.map((mode) => (
                  <div key={mode.title} className="methodology-mode">
                    <h3>{mode.title}</h3>
                    <p>{mode.description}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <aside className="about-side" aria-label="Methodology details">
            <section className="panel about-card">
              <h2>What We Surface</h2>
              <p>
                We believe in full transparency. Alongside headline benefits, SimplifyCards explicitly surfaces the details that matter most:
              </p>
              <div className="about-pill-list methodology-pills">
                <span>Annual & Joining Fees</span>
                <span>Renewal Fee Waivers</span>
                <span>Exclusion Categories</span>
                <span>Monthly Reward Caps</span>
                <span>Lounge Spend Rules</span>
                <span>Redemption Policies</span>
              </div>
            </section>

            <section className="panel about-card">
              <h2>Limitations & Audit</h2>
              <p>
                Credit card terms change frequently. While we verify card details regularly, you should always check the official card issuer site before applying.
              </p>
              <p>
                If you spot a stale term, an incorrect rate, or a missing card, please let us know so we can fix it.
              </p>
              <div className="methodology-footer-links">
                <Link href={"/contact" as Route} className="text-link">
                  Report Correction
                </Link>
                <Link href={"/about" as Route} className="text-link">
                  About SimplifyCards
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
