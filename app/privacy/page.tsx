import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "Learn how SimplifyCards handles data. Simple, clear, and privacy-first.",
  path: "/privacy"
});

export default function PrivacyPage() {
  return (
    <div className="page-shell about-page legal-page">
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        lead="We are committed to operating SimplifyCards as a transparent, privacy-first platform."
      />

      <div className="page-content">
        <div className="container">
          <div className="about-main">
            <article className="panel about-card">
              <p className="legal-updated">Last updated: June 28, 2026</p>

              <h3>1. Introduction</h3>
              <p>
                Welcome to SimplifyCards (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website at <Link href="/" className="text-link">simplifycards.in</Link>.
              </p>

              <h3>2. Information We Collect</h3>
              <p>
                SimplifyCards is designed to be privacy-first. We do not require user accounts, logins, or registration, and we do not collect any personal financial data, bank account details, or credit card numbers. We only collect the following minimal data:
              </p>
              <ul className="about-list">
                <li>
                  <strong>Anonymous Question Logs:</strong> When you use our grounded Q&A tool (Ask SimplifyCards), we log the queries submitted to analyze and improve the relevance of search results and rankings. These logs do not contain personal identifiers.
                </li>
                <li>
                  <strong>Feedback Logs:</strong> If you report a correction or submit feedback, we log the details you voluntarily provide (e.g., correction notes) alongside the query or card ID you referenced.
                </li>
                <li>
                  <strong>Server Logs:</strong> Standard web server log files (such as IP addresses, browser types, referring pages, and timestamps) are processed for security, troubleshooting, and basic traffic analytics.
                </li>
              </ul>

              <h3>3. Cookies and Analytics</h3>
              <p>
                We may use cookies or similar tracking technologies to store standard visitor preferences and compile anonymous, aggregate data about website traffic. You can choose to disable cookies through your browser settings, though some features of the site might function differently as a result.
              </p>

              <h3>4. How We Use Your Information</h3>
              <p>
                The minimal information we collect is used solely to:
              </p>
              <ul className="about-list">
                <li>Provide, operate, and maintain the website.</li>
                <li>Improve, personalize, and expand our search, comparison, and calculator features.</li>
                <li>Monitor and analyze usage trends and diagnose technical issues.</li>
                <li>Incorporate feedback and correct credit card details in our database.</li>
              </ul>

              <h3>5. Affiliate Links and Third-Party Sites</h3>
              <p>
                SimplifyCards contains links to third-party website portals and credit card issuers. Some application buttons may use affiliate/sponsored links. We are not responsible for the privacy practices or the content of external websites. We encourage you to read the privacy policy of any third-party website you visit.
              </p>

              <h3>6. Data Sharing and Disclosure</h3>
              <p>
                We do not sell, trade, or rent any information to third parties. We do not share any data unless required to comply with legal obligations, enforce our site policies, or protect our or others&apos; rights, property, or safety.
              </p>

              <h3>7. Data Retention</h3>
              <p>
                We retain anonymous search queries and feedback logs for as long as necessary to improve the product and maintain accurate card data. If you wish to request the removal of any feedback you submitted, please contact us.
              </p>

              <h3>8. Children&apos;s Information</h3>
              <p>
                SimplifyCards does not knowingly collect any personal identifiable information from children under the age of 18. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately, and we will do our best to promptly remove such records.
              </p>

              <h3>9. Governing Law</h3>
              <p>
                This Privacy Policy is governed by and construed in accordance with the laws of India.
              </p>

              <h3>10. Changes to This Privacy Policy</h3>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &ldquo;Last updated&rdquo; date at the top.
              </p>

              <h3>11. Contact Us</h3>
              <p>
                If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at:
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
