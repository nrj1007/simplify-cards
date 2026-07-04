"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Instagram, Linkedin, Youtube } from "lucide-react";

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

function LogoMark() {
  return (
    <svg className="sc-logo-mark" viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="scSiteCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="60%" stopColor="#581c87" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
        <linearGradient id="scSiteCheckGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="50%" stopColor="#b8975a" />
          <stop offset="100%" stopColor="#f3e8ff" />
        </linearGradient>
        <linearGradient id="scSiteTopSliceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
      </defs>
      <path d="M40 15 C 54 11, 80 13, 92 16 C 94 17, 95 19, 94 21 C 92 24, 70 24, 44 21 C 41 21, 40 18, 40 15 Z" fill="url(#scSiteTopSliceGrad)" />
      <path d="M16 20 C 16 16, 20 15, 25 16 L88 28 C 92 28, 94 31, 94 35 L88 65 C 88 68, 85 70, 81 70 L22 79 C 18 79, 16 76, 16 71 Z" fill="url(#scSiteCardGrad)" />
      <rect x="22" y="28" width="16" height="12" rx="3.5" fill="#f3edf5" opacity="0.95" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" stroke="#fdfbf7" strokeWidth="6" strokeLinejoin="miter" fill="none" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" fill="url(#scSiteCheckGrad)" />
    </svg>
  );
}

function Sparkle({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2C12 2 13.5 8.5 15 10C16.5 11.5 22 12 22 12C22 12 16.5 12.5 15 14C13.5 15.5 12 22 12 22C12 22 10.5 15.5 9 10C7.5 12.5 2 12 2 12C2 12 7.5 11.5 9 10C10.5 8.5 12 2 12 2Z" />
    </svg>
  );
}

export function FloatingAskButton() {
  return (
    <Link href="/ask" className="sc-floating-ask" aria-label="Ask SimplifyCards">
      <span className="sc-pulse" />
      <Sparkle className="sc-sparkle" size={16} />
      <span>ask</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links: Array<{ label: string; href: Route }> = [
    { label: "ask", href: "/ask" },
    { label: "recommend", href: "/recommend" },
    { label: "calculator", href: "/calculator" as Route },
    { label: "cards", href: "/finder" },
    { label: "compare", href: "/compare" }
  ];

  return (
    <nav className="sc-topnav site-header">
      <div className="sc-topnav-inner">
        <Link href="/" className="sc-brand" aria-label="SimplifyCards home">
          <LogoMark />
          <span>
            <b>Simplify</b>Cards
          </span>
        </Link>
        <div className="sc-navlinks">
          {links.map((link) => (
            <Link href={link.href} key={link.href} className={isActiveHeaderLink(pathname, link.href) ? "is-active" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="sc-mobile-menu">
          <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Open navigation menu">
            <span />
            <span />
            <span />
          </button>
          {open ? (
            <div className="sc-mobile-popover">
              {links.map((link) => (
                <Link
                  href={link.href}
                  key={link.href}
                  className={isActiveHeaderLink(pathname, link.href) ? "is-active" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function isActiveHeaderLink(pathname: string, href: Route) {
  if (href === "/finder") {
    return pathname === "/finder" || pathname.startsWith("/cards");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function PolicyModal({ policy, onClose }: { policy: PolicyKey; onClose: () => void }) {
  const copy = POLICY_COPY[policy];

  return (
    <div className="sc-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="sc-modal" role="dialog" aria-modal="true" aria-labelledby="sc-site-policy-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="sc-modal-close" onClick={onClose} aria-label="Close policy modal">
          ×
        </button>
        <h3 id="sc-site-policy-title">{copy.title}</h3>
        {copy.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {policy === "contact" ? (
          <a className="sc-mail-link" href="mailto:contact@simplifycards.in">
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
      <footer className="sc-footer site-footer">
        <div className="sc-footer-grid">
          <div>
            <h4>company</h4>
            <div className="sc-footer-links">
              <button type="button" onClick={() => setPolicy("about")}>About</button>
              <button type="button" onClick={() => setPolicy("contact")}>Contact us</button>
              <button type="button" onClick={() => setPolicy("disclosure")}>Disclosure</button>
              <button type="button" onClick={() => setPolicy("privacy")}>Privacy Policy</button>
              <button type="button" onClick={() => setPolicy("terms")}>Terms & Conditions</button>
            </div>
            <div className="sc-socials" aria-label="Social media links">
              <a href="#" aria-label="Instagram" title="Instagram"><Instagram size={17} /></a>
              <a href="#" aria-label="YouTube" title="YouTube"><Youtube size={17} /></a>
              <a href="#" aria-label="LinkedIn" title="LinkedIn"><Linkedin size={16} /></a>
              <a href="#" aria-label="X" title="X">X</a>
            </div>
          </div>
          <div>
            <h4>quick navigation</h4>
            <div className="sc-footer-links">
              <Link href="/ask">ask</Link>
              <Link href="/recommend">recommend</Link>
              <Link href={"/calculator" as Route}>calculator</Link>
              <Link href="/finder">cards</Link>
              <Link href="/compare">compare</Link>
              <Link href={"/latest" as Route}>latest updates</Link>
            </div>
          </div>
          <div>
            <h4>popular guides</h4>
            <div className="sc-footer-links">
              {GUIDE_LINKS.map((link) => (
                <Link href={link.href} key={link.href}>{link.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4>popular comparisons</h4>
            <div className="sc-footer-links">
              {COMPARISON_LINKS.map((link) => (
                <Link href={link.href} key={link.href}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="sc-footer-bottom">
          <span>© 2026 SimplifyCards. All rights reserved.</span>
        </div>
      </footer>
      {policy ? <PolicyModal policy={policy} onClose={() => setPolicy(null)} /> : null}
    </>
  );
}
