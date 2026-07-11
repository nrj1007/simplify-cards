"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Instagram, Linkedin, Youtube } from "lucide-react";
import styles from "./SiteChrome.module.css";

const GUIDE_LINKS: Array<{ label: string; href: Route }> = [
  { label: "Best credit cards", href: "/best-credit-cards-india" as Route },
  { label: "Best cashback cards", href: "/best-cashback-credit-cards-india" as Route },
  { label: "Best travel cards", href: "/best-travel-credit-cards-india" as Route },
  { label: "Best lounge cards", href: "/best-lounge-access-credit-cards-india" as Route },
  { label: "Best lifetime-free cards", href: "/best-lifetime-free-credit-cards-india" as Route },
  { label: "Best fuel cards", href: "/best-fuel-credit-cards-india" as Route }
];

const COMPARISON_LINKS: Array<{ label: string; href: Route }> = [
  { label: "Axis Bank Atlas vs HDFC Bank Regalia Gold", href: "/compare/axis-atlas-vs-hdfc-regalia-gold" as Route },
  { label: "SBI Cashback vs HDFC Millennia", href: "/compare/sbi-cashback-vs-hdfc-millennia" as Route },
  { label: "SBI Cashback vs Swiggy HDFC Bank", href: "/compare/sbi-cashback-vs-hdfc-swiggy" as Route },
  {
    label: "HDFC Bank Infinia Metal vs HDFC Bank Diners Club Black Metal",
    href: "/compare/hdfc-infinia-metal-vs-hdfc-diners-club-black-metal" as Route
  }
];

const POLICY_COPY = {
  about: {
    title: "About SimplifyCards",
    body: [
      "SimplifyCards is an AI-powered credit-card research platform built to help Indian users choose cards with more clarity and less guesswork.",
      "Our proprietary algorithm compares 200+ credit cards across rewards, fees, caps, exclusions, and practical fit so users can shortlist better options faster.",
      "The platform is designed for information, education, and comparison; final application decisions should always be based on issuer terms."
    ]
  },
  contact: {
    title: "Contact us",
    body: ["For corrections, partnerships, or feedback, email us at contact@simplifycards.in."]
  },
  disclosure: {
    title: "Disclosure",
    body: [
      "Some outbound application links may be affiliate links. This may earn SimplifyCards a commission at no additional cost to you.",
      "Affiliate relationships do not determine the data stored for a card or the reward math shown in recommendations."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We use submitted queries, calculator inputs, and feedback to improve the product experience.",
      "We do not sell personal financial data. Avoid entering sensitive identifiers such as full card numbers, PAN, Aadhaar, or passwords."
    ]
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "SimplifyCards provides informational tools only and does not provide financial advice.",
      "Card terms, fees, eligibility, offers, and rewards can change. Always verify details directly with the issuer before applying."
    ]
  }
};

type PolicyKey = keyof typeof POLICY_COPY;

function joinClasses(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PolicyModal({ policy, onClose }: { policy: PolicyKey; onClose: () => void }) {
  const copy = POLICY_COPY[policy];

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="sc-site-policy-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close policy modal">
          ×
        </button>
        <h3 id="sc-site-policy-title">{copy.title}</h3>
        {copy.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {policy === "contact" ? (
          <a className={styles.mailLink} href="mailto:contact@simplifycards.in">
            contact@simplifycards.in
          </a>
        ) : null}
      </section>
    </div>
  );
}

export function SiteFooter() {
  const [policy, setPolicy] = useState<PolicyKey | null>(null);

  return (
    <>
      <footer className={joinClasses(styles.footer, "site-footer")}>
        <div className={styles.footerGrid}>
          <div>
            <h4>company</h4>
            <div className={styles.footerLinks}>
              <button type="button" className={styles.footerLink} onClick={() => setPolicy("about")}>About</button>
              <button type="button" className={styles.footerLink} onClick={() => setPolicy("contact")}>Contact us</button>
              <button type="button" className={styles.footerLink} onClick={() => setPolicy("disclosure")}>Disclosure</button>
              <button type="button" className={styles.footerLink} onClick={() => setPolicy("privacy")}>Privacy Policy</button>
              <button type="button" className={styles.footerLink} onClick={() => setPolicy("terms")}>Terms & Conditions</button>
            </div>
            <div className={styles.socials} aria-label="Social media links">
              <a className={joinClasses(styles.socialLink, styles.instagram)} href="https://www.instagram.com/simplifycardsin/" aria-label="Instagram" title="Instagram"><Instagram size={17} /></a>
              <a className={joinClasses(styles.socialLink, styles.youtube)} href="https://www.youtube.com/@SimplifyCards" aria-label="YouTube" title="YouTube"><Youtube size={17} /></a>
              <a className={joinClasses(styles.socialLink, styles.linkedin)} href="https://www.linkedin.com/company/simplifycards/" aria-label="LinkedIn" title="LinkedIn"><Linkedin size={16} /></a>
              <a className={joinClasses(styles.socialLink, styles.x)} href="https://x.com/SimplifyCards" aria-label="X" title="X">X</a>
            </div>
          </div>
          <div>
            <h4>quick navigation</h4>
            <div className={styles.footerLinks}>
              <Link className={styles.footerLink} href="/ask">Ask</Link>
              <Link className={styles.footerLink} href="/recommend">Recommend</Link>
              <Link className={styles.footerLink} href={"/calculator" as Route}>Calculator</Link>
              <Link className={styles.footerLink} href="/cards">Cards</Link>
              <Link className={styles.footerLink} href="/compare">Compare</Link>
              <Link className={styles.footerLink} href={"/latest" as Route}>Latest updates</Link>
            </div>
          </div>
          <div>
            <h4>popular guides</h4>
            <div className={styles.footerLinks}>
              {GUIDE_LINKS.map((link) => (
                <Link className={styles.footerLink} href={link.href} key={link.href}>{link.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4>popular comparisons</h4>
            <div className={styles.footerLinks}>
              {COMPARISON_LINKS.map((link) => (
                <Link className={styles.footerLink} href={link.href} key={link.href}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 SimplifyCards. All rights reserved.</span>
        </div>
      </footer>
      {policy ? <PolicyModal policy={policy} onClose={() => setPolicy(null)} /> : null}
    </>
  );
}
