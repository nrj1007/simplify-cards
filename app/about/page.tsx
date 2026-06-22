import type { Metadata, Route } from "next";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About / Contact",
  description:
    "Learn how SimplifyCards helps compare Indian credit cards using verified card data, transparent trade-offs, and feedback-driven corrections.",
  path: "/about"
});

const PRINCIPLES = [
  "Card recommendations are grounded in the local verified card dataset, not generic web claims.",
  "Fees, reward caps, exclusions, redemption assumptions, and lounge rules are surfaced alongside headline benefits.",
  "User feedback and manual audits are used to catch stale issuer terms and improve card coverage."
];

const CONTACT_REASONS = [
  "Report outdated fees, rewards, caps, exclusions, lounge rules, or eligibility details.",
  "Suggest a missing Indian credit card, issuer page, or official terms document.",
  "Share feedback on rankings, calculator assumptions, Ask results, or comparison pages."
];

export default function AboutPage() {
  return (
    <div className="page-shell about-page">
      <PageHero
        eyebrow="About / Contact"
        title="Credit-card guidance built around verified details."
        lead="SimplifyCards helps people in India compare credit cards by actual fees, rewards, caps, exclusions, redemption rules, and fit for their spending."
      >
        <div className="about-hero-actions">
          <Link className="btn btn-primary" href="/ask">
            Ask SimplifyCards
          </Link>
          <Link className="btn btn-ghost" href="/finder">
            Browse cards
          </Link>
        </div>
      </PageHero>

      <div className="page-content">
        <div className="container about-grid">
          <section className="about-main">
            <article className="panel about-card">
              <div className="page-eyebrow">What we do</div>
              <h2>Make card decisions less opaque.</h2>
              <p>
                Credit-card marketing often highlights the best-case reward rate while hiding caps, exclusions, redemption value, and
                renewal conditions. SimplifyCards is designed to show those trade-offs together so you can shortlist cards with more
                context before applying.
              </p>
            </article>

            <article className="panel about-card">
              <div className="page-eyebrow">How it works</div>
              <h2>Data first, AI second.</h2>
              <ul className="about-list">
                {PRINCIPLES.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
            </article>

            <article className="panel about-card">
              <div className="page-eyebrow">Contact</div>
              <h2>Send corrections and suggestions through the product.</h2>
              <p>
                If you spot a stale card detail or a ranking that looks wrong, the fastest path is to open the relevant card, Ask result,
                calculator, or comparison and share feedback from there. That keeps the report tied to the exact card or query.
              </p>
              <ul className="about-list">
                {CONTACT_REASONS.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="contact-actions">
                <Link
                  className="btn btn-primary"
                  href={"/ask?query=I%20want%20to%20report%20a%20credit%20card%20data%20correction" as Route}
                >
                  Report a correction
                </Link>
                <Link className="btn btn-ghost" href="/finder">
                  Find a card to review
                </Link>
              </div>
            </article>
          </section>

          <aside className="about-side" aria-label="SimplifyCards summary">
            <section className="panel about-card">
              <h2>Built for India</h2>
              <p>
                The app focuses on Indian credit cards, including cashback, travel, lounge, RuPay UPI, fuel, beginner, and premium-card
                use cases.
              </p>
            </section>

            <section className="panel about-card">
              <h2>What to verify</h2>
              <div className="about-pill-list">
                <span>Issuer terms</span>
                <span>Eligibility</span>
                <span>Reward caps</span>
                <span>Exclusions</span>
                <span>Redemption value</span>
                <span>Official-site terms</span>
              </div>
            </section>

            <section className="panel about-card">
              <h2>Disclosure</h2>
              <p>
                SimplifyCards is not financial advice. Official-site links open issuer or partner pages, and no affiliate links are
                currently used.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
