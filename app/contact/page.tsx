import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description:
    "Get in touch with Simplify Cards. Report credit card details corrections, suggest missing cards, or reach out via email.",
  path: "/contact"
});

const CONTACT_REASONS = [
  "Report outdated fees, rewards, caps, exclusions, lounge rules, or eligibility details.",
  "Suggest a missing Indian credit card, issuer page, or official terms document.",
  "Share feedback on rankings, calculator assumptions, Ask results, or comparison pages."
];

export default function ContactPage() {
  return (
    <div className="page-shell about-page">
      <PageHero
        eyebrow="Contact"
        title="We'd love to hear from you."
        lead="Help us keep Simplify Cards accurate and complete. You can reach us via email or send feedback directly through our tools."
      />

      <div className="page-content">
        <div className="container about-grid">
          <section className="about-main">
            <article className="panel about-card">
              <div className="page-eyebrow">Email</div>
              <h2>Email Us</h2>
              <p>
                For general inquiries, partnership proposals, or feedback, send us an email at:
              </p>
              <p style={{ marginTop: "12px", fontSize: "18px", fontWeight: "bold" }}>
                <a href="mailto:contact@simplifycards.in" className="text-link">
                  contact@simplifycards.in
                </a>
              </p>
              <p style={{ marginTop: "12px" }}>
                We read every email and try our best to respond within 2-3 business days.
              </p>
            </article>

            <article className="panel about-card">
              <div className="page-eyebrow">In-Product</div>
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
                <Link className="btn btn-primary" href="/finder">
                  Report a correction
                </Link>
                <Link className="btn btn-ghost" href="/ask">
                  Open Ask
                </Link>
              </div>
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
