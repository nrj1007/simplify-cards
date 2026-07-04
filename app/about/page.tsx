import type { Metadata, Route } from "next";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Learn how Simplify Cards helps compare Indian credit cards using verified card data, transparent trade-offs, and feedback-driven corrections.",
  path: "/about"
});

const PRINCIPLES = [
  "Card recommendations are grounded in the local verified card dataset, not generic web claims.",
  "Fees, reward caps, exclusions, redemption assumptions, and lounge rules are surfaced alongside headline benefits.",
  "User feedback and manual audits are used to catch stale issuer terms and improve card coverage."
];

export default function AboutPage() {
  return (
    <div className="page-shell about-page">
      <PageHero
        eyebrow="About"
        title="Credit-card guidance built around verified details."
        lead="Simplify Cards helps people in India compare credit cards by actual fees, rewards, caps, exclusions, redemption rules, and fit for their spending."
      >
        <div className="about-hero-actions">
          <Link className="btn btn-primary" href="/ask">
            Ask Simplify Cards
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
                renewal conditions. Simplify Cards is designed to show those trade-offs together so you can shortlist cards with more
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
              <p style={{ marginTop: "16px" }}>
                Learn more about our scoring algorithm on our <Link href={"/methodology" as Route} className="text-link">Methodology page</Link>, or visit our <Link href={"/contact" as Route} className="text-link">Contact page</Link> if you spot an error.
              </p>
            </article>
          </section>

          <aside className="about-side" aria-label="Simplify Cards summary">
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
                Simplify Cards is not financial advice. Apply buttons may use affiliate links, while Check official site links open issuer
                or partner pages.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
