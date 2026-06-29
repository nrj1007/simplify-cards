import type { Metadata, Route } from "next";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Advertising Disclosure",
  description: "Learn how we support SimplifyCards through affiliate and partner links without compromising our ranking integrity.",
  path: "/disclosure"
});

export default function DisclosurePage() {
  return (
    <div className="page-shell about-page legal-page">
      <PageHero
        eyebrow="Compliance"
        title="Advertising Disclosure"
        lead="Transparent disclosure regarding our affiliate relationships and how we support this platform."
      />

      <div className="page-content">
        <div className="container">
          <div className="about-main">
            <article className="panel about-card">
              <p className="legal-updated">Last updated: June 29, 2026</p>

              <h3>1. Affiliate Partnerships and Links</h3>
              <p>
                SimplifyCards is an independent, user-supported comparison platform. To keep our tools and grounded Q&A completely free to use, we partner with credit card issuers and affiliate networks. Some of the links on this website are affiliate links (typically indicated by buttons like &ldquo;Apply&rdquo; or partner referrals).
              </p>
              <p>
                If you click on an affiliate link and are subsequently approved for a credit card, we may receive a commission or referral fee from the card issuer. This compensation comes at no additional cost to you.
              </p>

              <h3>2. Link Conventions</h3>
              <p>
                To maintain complete clarity and follow web standards, we distinguish between affiliate and non-affiliate links:
              </p>
              <ul className="about-list">
                <li>
                  <strong>&ldquo;Apply&rdquo; Links:</strong> These are affiliate/partner links. They are marked with <code>rel=&ldquo;sponsored&rdquo;</code>.
                </li>
                <li>
                  <strong>&ldquo;Check official site&rdquo; Links:</strong> These are non-affiliate links provided directly to the issuer&apos;s website for informational purposes. They are marked with <code>rel=&ldquo;nofollow&rdquo;</code>.
                </li>
              </ul>

              <h3>3. Core Principle: Editorial and Ranking Independence</h3>
              <p>
                Our affiliate relationships do not influence which cards we recommend, how we score them, or their positions in search rankings.
              </p>
              <p>
                Our recommendation engine uses a deterministic, mathematical scoring algorithm based on the card&apos;s Net Annual Value (rewards minus fees) and relevance to your specific query or spend profile. A card with a lower net yield will not rank above a better card simply because it offers a higher affiliate commission.
              </p>
              <p>
                For a detailed breakdown of how we analyze card rewards, fee waivers, caps, and exclusions, please read our <Link href={"/methodology" as Route} className="text-link">Methodology page</Link>.
              </p>

              <h3>4. Not Financial Advice</h3>
              <p>
                SimplifyCards provides credit card comparisons and estimates based on structured card data, but these do not constitute professional financial advice. All rates, fee waivers, rules, and benefits are subject to change by issuers. Please review the official schedule of charges and card terms carefully on the issuer&apos;s site before submitting an application.
              </p>

              <h3>5. Legal Terms</h3>
              <p>
                Your use of this site is subject to our <Link href={"/terms" as Route} className="text-link">Terms and Conditions</Link> and our <Link href={"/privacy" as Route} className="text-link">Privacy Policy</Link>.
              </p>

              <h3>6. Contact Us</h3>
              <p>
                If you have any questions or feedback regarding our advertising disclosures, affiliate relationships, or data verification practices, please contact us at:
              </p>
              <p style={{ marginTop: "8px" }}>
                Email: <a href="mailto:contact@simplifycards.in" className="text-link">contact@simplifycards.in</a>
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
