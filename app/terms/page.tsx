import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms and Conditions",
  description: "Terms and conditions for using Simplify Cards. Informational only, not financial advice.",
  path: "/terms"
});

export default function TermsPage() {
  return (
    <div className="page-shell about-page legal-page">
      <PageHero
        eyebrow="Legal"
        title="Terms and Conditions"
        lead="Please read these terms carefully before using Simplify Cards."
      />

      <div className="page-content">
        <div className="container">
          <div className="about-main">
            <article className="panel about-card">
              <p className="legal-updated">Last updated: June 28, 2026</p>

              <h3>1. Acceptance of Terms</h3>
              <p>
                By accessing and using <Link href="/" className="text-link">Simplify Cards</Link> (simplifycards.in), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our website.
              </p>

              <h3>2. Informational Purposes Only (Not Financial Advice)</h3>
              <p>
                The content on Simplify Cards is provided for informational and educational purposes only. We are not a bank, financial institution, or licensed financial advisor. The calculations, rewards estimates, fit scores, and rankings displayed on the site do not constitute financial advice, solicitation, or recommendation to apply for any financial product. You should independently verify all card terms and evaluate your own financial situation before making credit card decisions.
              </p>

              <h3>3. Accuracy and Verification Disclaimer</h3>
              <p>
                While we make reasonable efforts to ensure that credit card information (such as fees, interest rates, reward rates, reward caps, lounge access rules, and eligibility criteria) is accurate and up-to-date by verifying details against official issuer documents, card terms change frequently. Simplify Cards does not guarantee the accuracy, completeness, or timeliness of any information on the site. You must check official issuer terms and schedules of charges before applying.
              </p>

              <h3>4. Affiliate Link Disclosure</h3>
              <p>
                Simplify Cards may receive compensation from credit card issuers or partner networks via affiliate links (often marked as &ldquo;Apply&rdquo; or similar). This compensation helps support the maintenance of our free comparison tools. Clicking on these links is voluntary, and does not affect the fees or terms of the cards you apply for.
              </p>

              <h3>5. Acceptable Use</h3>
              <p>
                You agree to use Simplify Cards only for lawful purposes. You shall not:
              </p>
              <ul className="about-list">
                <li>Attempt to scrape, extract, or copy credit card datasets or code without our prior written permission.</li>
                <li>Use any automated system (including robots, spiders, or offline readers) to access the website in a manner that sends more request messages to our servers than a human can reasonably produce.</li>
                <li>Interfere with or disrupt the security or performance of the website.</li>
              </ul>

              <h3>6. Intellectual Property</h3>
              <p>
                All content, layout, design, calculations, scoring methodologies, and code on Simplify Cards (unless otherwise specified) are the intellectual property of Simplify Cards and are protected by applicable copyright, trademark, and other laws.
              </p>

              <h3>7. Third-Party Links</h3>
              <p>
                Our site contains links to third-party websites or services that are not owned or controlled by us. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites.
              </p>

              <h3>8. Disclaimer of Warranties</h3>
              <p>
                THE WEBSITE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW, SIMPLIFYCARDS DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>

              <h3>9. Limitation of Liability</h3>
              <p>
                IN NO EVENT SHALL SIMPLIFYCARDS, ITS OPERATORS, OR CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, INCURRED BY YOU OR ANY THIRD PARTY, WHETHER IN AN ACTION IN CONTRACT OR TORT, ARISING FROM YOUR ACCESS TO, OR USE OF, THE WEBSITE.
              </p>

              <h3>10. Changes to Terms</h3>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms and Conditions at any time. We will indicate the date of the latest update at the top of this page. Your continued use of the website following any changes constitutes acceptance of those changes.
              </p>

              <h3>11. Governing Law</h3>
              <p>
                These Terms and Conditions are governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of India.
              </p>

              <h3>12. Contact Us</h3>
              <p>
                If you have any questions about these Terms and Conditions, please contact us at:
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
