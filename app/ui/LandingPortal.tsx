"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useNavigationProgress } from "./NavigationProgress";
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Instagram,
  Linkedin,
  Scale,
  Search,
  ShieldCheck,
  Youtube
} from "lucide-react";

export type LandingCard = {
  id: string;
  issuer: string;
  name: string;
  annualFee: string;
  bestFor: string[];
  rewardType: string;
  rewardRate: string;
  highlight: string;
  lounge: string;
  sourceUrl: string;
  applyUrl: string;
  hasAffiliate: boolean;
  imageUrl: string | null;
};

export type LandingUpdate = {
  title: string;
  summary: string;
  publishedAt: string;
  sourceLabel: string;
  sourceUrl?: string;
  cardId: string;
  cardName: string;
  cardIssuer: string;
};

type LandingPortalProps = {
  popularCards: LandingCard[];
  updates: LandingUpdate[];
};

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
    body: ["For questions, corrections, partnerships, or feedback, contact us at:"]
  },
  disclosure: {
    title: "Disclosure",
    body: [
      "SimplifyCards is an informational credit-card research platform and does not provide financial, investment, legal, or tax advice.",
      "Some links, offers, or products may involve affiliate or partner relationships. Such relationships do not change the need to verify final terms on the issuer website.",
      "Credit-card rewards, fees, eligibility criteria, caps, exclusions, and offers can change without notice."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "The default language of this Privacy Policy is English.",
      "SimplifyCards may collect details you voluntarily submit, such as your name, email ID, review, city, and newsletter subscription preferences.",
      "We use a proprietary algorithm to compare credit-card information and improve recommendations. We do not sell your personal information.",
      "You can ask us to update or remove your submitted details by emailing contact@simplifycards.in."
    ]
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By using SimplifyCards, you agree to use the platform only for lawful, informational, and personal research purposes.",
      "Content, comparisons, calculations, and recommendations are estimates based on available rules and assumptions; actual value may vary.",
      "Issuer terms, eligibility checks, approvals, fees, and final benefits are controlled by the respective banks or card issuers."
    ]
  }
} satisfies Record<string, { title: string; body: string[] }>;

type PolicyKey = keyof typeof POLICY_COPY;

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function cardSlug(id: string) {
  return `/cards/${id}` as Route;
}

function LogoMark() {
  return (
    <svg className="sc-logo-mark" viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="scCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="60%" stopColor="#581c87" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
        <linearGradient id="scCheckGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="50%" stopColor="#b8975a" />
          <stop offset="100%" stopColor="#f3e8ff" />
        </linearGradient>
        <linearGradient id="scTopSliceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
      </defs>
      <path d="M40 15 C 54 11, 80 13, 92 16 C 94 17, 95 19, 94 21 C 92 24, 70 24, 44 21 C 41 21, 40 18, 40 15 Z" fill="url(#scTopSliceGrad)" />
      <path d="M16 20 C 16 16, 20 15, 25 16 L88 28 C 92 28, 94 31, 94 35 L88 65 C 88 68, 85 70, 81 70 L22 79 C 18 79, 16 76, 16 71 Z" fill="url(#scCardGrad)" />
      <rect x="22" y="28" width="16" height="12" rx="3.5" fill="#f3edf5" opacity="0.95" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" stroke="#fdfbf7" strokeWidth="6" strokeLinejoin="miter" fill="none" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" fill="url(#scCheckGrad)" />
    </svg>
  );
}

function PhoneFrame({ variant }: { variant: "recommend" | "calculator" | "cards" | "compare" }) {
  const time = variant === "calculator" ? "2:37" : variant === "cards" ? "2:43" : variant === "compare" ? "2:45" : "2:41";

  return (
    <div className="sc-phone-frame" aria-hidden="true">
      <div className="sc-phone-notch">
        <span />
        <b />
      </div>
      <div className="sc-phone-status">
        <span>{time}</span>
        <span className="sc-phone-network">LTE</span>
      </div>
      <div className="sc-phone-screen">
        {variant === "recommend" ? (
          <>
            <div className="sc-mini-recommend-search">
              <span>recommends loading...</span>
              <b>view ✨</b>
            </div>
            <div className="sc-mini-recommend-card">
              <span>Top Live Recommender:</span>
              <div>
                <b>1. Infinia Metal</b>
                <strong>99% Match</strong>
              </div>
            </div>
            <span className="sc-phone-cta sc-phone-cta-purple">recommend →</span>
          </>
        ) : null}
        {variant === "calculator" ? (
          <>
            <div className="sc-mini-calculator">
              <span>Adjust Spends:</span>
              <div>
                <p>
                  <b>Online shopping</b>
                  <strong>Rs 15k</strong>
                </p>
                <i><em /></i>
              </div>
            </div>
            <span className="sc-phone-cta sc-phone-cta-teal">calculator →</span>
          </>
        ) : null}
        {variant === "cards" ? (
          <>
            <div className="sc-mini-card-art">
              <p>
                <span>Infinia Metal</span>
                <i />
              </p>
              <strong>**** **** **** 8820</strong>
            </div>
            <div className="sc-mini-perks">
              <span>Key Perks:</span>
              <p>• Unlimited global airport lounge access</p>
            </div>
            <span className="sc-phone-cta sc-phone-cta-gold">cards →</span>
          </>
        ) : null}
        {variant === "compare" ? (
          <>
            <div className="sc-mini-compare">
              <span>Comparison Yields:</span>
              <div>
                <p><b>Metric</b><b>Infinia</b><b>SBI CB</b></p>
                <p><span>Rewards</span><strong>Rs 42.5k</strong><strong>Rs 12k</strong></p>
                <p><span>Lounge</span><b>Compl.</b><em>None</em></p>
              </div>
            </div>
            <span className="sc-phone-cta sc-phone-cta-blue">compare →</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Sparkle({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C12 2 13.5 8.5 15 10C16.5 11.5 22 12 22 12C22 12 16.5 12.5 15 14C13.5 15.5 12 22 12 22C12 22 10.5 15.5 9 14C7.5 12.5 2 12 2 12C2 12 7.5 11.5 9 10C10.5 8.5 12 2 12 2Z" />
    </svg>
  );
}

function HeroAskBox() {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function checkHashAndFocus() {
      if (
        window.location.hash === "#ask-widget-container" ||
        window.location.hash === "#hero-ask-input" ||
        window.location.hash === "#ask"
      ) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          inputRef.current?.focus();
        }, 50);
      }
    }
    checkHashAndFocus();
    window.addEventListener("hashchange", checkHashAndFocus);
    return () => window.removeEventListener("hashchange", checkHashAndFocus);
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      inputRef.current?.reportValidity();
      inputRef.current?.focus();
      return;
    }
    startNavigation("ask");
    router.push(`/ask?query=${encodeURIComponent(trimmed)}` as Route);
  }

  return (
    <div id="ask-widget-container" className="sc-ask-wrap">
      <form onSubmit={submit} className="sc-ask-form">
        <Search className="sc-ask-search" size={22} />
        <input
          id="hero-ask-input"
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Which card is best for movie tickets?"
          aria-label="Ask SimplifyCards"
          required
          pattern=".*\S.*"
          title="Enter a question to ask SimplifyCards."
        />
        <button type="submit">
          <span className="sc-pulse" />
          <Sparkle className="sc-sparkle" size={20} />
          <span>ask</span>
        </button>
      </form>
      <div className="sc-prompt-chips">
        <span>try asking:</span>
        {[
          "best card for lounge access",
          "best cashback card for online shopping",
          "best card for fuel spends"
        ].map((prompt) => (
          <button type="button" key={prompt} onClick={() => setQuery(prompt)}>
            &quot;{prompt}&quot;
          </button>
        ))}
      </div>
    </div>
  );
}

function FeatureGrid() {
  const features: Array<{ title: string; copy: string; href: Route; variant: "recommend" | "calculator" | "cards" | "compare" }> = [
    {
      title: "recommend",
      copy: "Tell us your monthly spends and get a ranked shortlist of cards",
      href: "/recommend",
      variant: "recommend"
    },
    {
      title: "calculator",
      copy: "Move spend sliders to estimate annual rewards, fees, and net value",
      href: "/calculator" as Route,
      variant: "calculator"
    },
    {
      title: "cards",
      copy: "Browse verified card details, perks, limits, and exclusions",
      href: "/finder",
      variant: "cards"
    },
    {
      title: "compare",
      copy: "Compare selected cards side by side on rewards, fees, lounge access, and rules",
      href: "/compare",
      variant: "compare"
    }
  ];

  return (
    <div className="sc-feature-grid">
      {features.map((feature) => (
        <Link className={`sc-feature-card sc-feature-${feature.variant}`} href={feature.href} key={feature.title}>
          <div className="sc-poly-bg" />
          <div className="sc-feature-copy">
            <h3>{feature.title}</h3>
            <p>{feature.copy}</p>
          </div>
          <PhoneFrame variant={feature.variant} />
        </Link>
      ))}
    </div>
  );
}

function PopularPicks({ cards }: { cards: LandingCard[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const colors = [
    ["#181223", "#581c87", "#b8975a"],
    ["#173b35", "#256d5a", "#d7b46a"],
    ["#1c2536", "#49617f", "#d8b76b"],
    ["#5f2d1f", "#b46c3f", "#f0d7a4"],
    ["#1e112c", "#35224d", "#b8975a"],
    ["#102a43", "#375a7f", "#d6b15e"]
  ];

  function scroll(direction: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.min(window.innerWidth * 0.86, 420), behavior: "smooth" });
  }

  return (
    <section id="popular-cards" className="sc-section sc-popular">
      <div className="sc-section-head">
        <h2>
          Popular picks at <span>Simplify</span>Cards
        </h2>
        <div className="sc-scroll-controls">
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll popular picks left">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll popular picks right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={trackRef} className="sc-popular-track">
        {cards.map((card, index) => {
          const palette = colors[index % colors.length];
          return (
            <article className="sc-pick-card" key={card.id}>
              <Link
                className="sc-pick-visual"
                href={cardSlug(card.id)}
                style={{ background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 58%, ${palette[2]} 100%)` }}
              >
                <div className="sc-poly-bg" />
                <span>{card.issuer}</span>
                <h3>{card.name}</h3>
              </Link>
              <p>{card.highlight}</p>
              <div className="sc-pick-tags">
                <span>{card.annualFee} fee</span>
                <span>{card.rewardRate}</span>
              </div>
              <a
                className="sc-pick-cta"
                href={card.applyUrl}
                target="_blank"
                rel={card.hasAffiliate ? "sponsored noopener noreferrer" : "nofollow noopener noreferrer"}
              >
                {card.hasAffiliate ? "Apply now" : "Check official site"}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LatestUpdates({ updates }: { updates: LandingUpdate[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = updates[activeIndex];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (updates.length <= 1) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % updates.length), 4500);
    return () => window.clearInterval(timer);
  }, [updates.length]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatus("error");
      setErrorMessage("Please enter your name");
      return;
    }
    if (!email.trim()) {
      setStatus("error");
      setErrorMessage("Please enter your email ID");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Subscription failed");
      }

      setStatus("success");
      setName("");
      setEmail("");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to subscribe. Please try again.");
    }
  };

  if (!active) {
    return (
      <section id="latest-news" className="sc-section sc-latest">
        <div className="sc-section-head sc-section-head-simple">
          <h2>Latest updates</h2>
        </div>
        <article className="sc-latest-card">
          <p>No verified updates yet. Check back soon.</p>
        </article>
      </section>
    );
  }

  return (
    <section id="latest-news" className="sc-section sc-latest">
      <div className="sc-section-head sc-section-head-simple">
        <Link href={"/latest" as Route}>Latest updates</Link>
      </div>
      <div className="sc-latest-grid">
        <article className="sc-latest-card">
          <time dateTime={active.publishedAt}>{formatDate(active.publishedAt)}</time>
          <Link href={cardSlug(active.cardId)} className="sc-latest-card-name">
            {active.cardName}
          </Link>
          <h3>{active.title}</h3>
          <p>{active.summary}</p>
          <div className="sc-news-controls">
            <button type="button" onClick={() => setActiveIndex((activeIndex - 1 + updates.length) % updates.length)} aria-label="Previous news">
              <ChevronLeft size={17} />
            </button>
            <div>
              {updates.map((update, index) => (
                <button
                  type="button"
                  key={`${update.cardId}-${update.publishedAt}-${update.title}`}
                  className={index === activeIndex ? "active" : ""}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${update.title}`}
                />
              ))}
            </div>
            <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % updates.length)} aria-label="Next news">
              <ChevronRight size={17} />
            </button>
          </div>
        </article>
        <aside className="sc-subscribe-card">
          <h3>Subscribe to latest updates</h3>
          {status === "success" ? (
            <div className="sc-subscribe-success-container">
              <p className="sc-subscribe-success">
                ✓ Thank you for subscribing!
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="sc-subscribe-reset-btn"
              >
                Subscribe another email
              </button>
            </div>
          ) : (
            <>
              <p>We promise only useful updates and no spam</p>
              <form onSubmit={handleSubscribe}>
                <input
                  type="text"
                  placeholder="Name"
                  aria-label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status === "loading"}
                  required
                />
                <input
                  type="email"
                  placeholder="Email ID"
                  aria-label="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  required
                />
                <button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "Subscribing..." : "Subscribe"}
                </button>
              </form>
              {status === "error" && (
                <p className="sc-subscribe-error">
                  {errorMessage}
                </p>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function ReviewsPanel() {
  return (
    <section id="user-reviews" className="sc-section sc-reviews">
      <div className="sc-section-head sc-section-head-simple">
        <h2>Reviews by our users</h2>
      </div>
      <article className="sc-review-form-card">
        <h3>Your review matters</h3>
        <textarea rows={3} placeholder="Share your experience..." aria-label="Share your experience" />
        <input type="text" placeholder="Enter your name" aria-label="Enter your name" />
        <select defaultValue="" aria-label="Select state or city">
          <option value="" disabled>
            Select state / city
          </option>
          <option value="delhi-ncr">Delhi NCR</option>
          <option value="mumbai">Mumbai</option>
          <option value="bengaluru">Bengaluru</option>
          <option value="chennai">Chennai</option>
          <option value="hyderabad">Hyderabad</option>
          <option value="other">Other city / not listed</option>
        </select>
        <label>
          <input type="checkbox" />
          <span>Post anonymously</span>
        </label>
        <button type="button">Submit review</button>
      </article>
    </section>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const links: Array<{ label: string; href: Route }> = [
    { label: "recommend", href: "/recommend" },
    { label: "calculator", href: "/calculator" as Route },
    { label: "cards", href: "/finder" },
    { label: "compare", href: "/compare" }
  ];

  return (
    <nav className="sc-topnav">
      <div className="sc-topnav-inner">
        <Link href="/" className="sc-brand" aria-label="SimplifyCards home">
          <LogoMark />
          <span>
            <b>Simplify</b>Cards
          </span>
        </Link>
        <div className="sc-navlinks">
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
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
                <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
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

function Footer({ onOpenPolicy }: { onOpenPolicy: (policy: PolicyKey) => void }) {
  return (
    <footer className="sc-footer">
      <div className="sc-footer-grid">
        <div>
          <h4>company</h4>
          <div className="sc-footer-links">
            <button type="button" onClick={() => onOpenPolicy("about")}>About</button>
            <button type="button" onClick={() => onOpenPolicy("contact")}>Contact us</button>
            <button type="button" onClick={() => onOpenPolicy("disclosure")}>Disclosure</button>
            <button type="button" onClick={() => onOpenPolicy("privacy")}>Privacy Policy</button>
            <button type="button" onClick={() => onOpenPolicy("terms")}>Terms & Conditions</button>
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
  );
}

function PolicyModal({ policy, onClose }: { policy: PolicyKey; onClose: () => void }) {
  const copy = POLICY_COPY[policy];
  return (
    <div className="sc-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="sc-modal" role="dialog" aria-modal="true" aria-labelledby="sc-modal-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3 id="sc-modal-title">{copy.title}</h3>
          <button type="button" onClick={onClose} aria-label="Close popup">×</button>
        </header>
        <div>
          {copy.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {policy === "contact" ? (
            <a href="mailto:contact@simplifycards.in" className="sc-mail-link">contact@simplifycards.in</a>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function LandingPortal({ popularCards, updates }: LandingPortalProps) {
  const [policy, setPolicy] = useState<PolicyKey | null>(null);
  const headlinePhrases = useMemo(() => ["save you more", "reward you faster", "upgrade your lifestyle"], []);
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setHeadlineIndex((index) => (index + 1) % headlinePhrases.length), 3200);
    return () => window.clearInterval(timer);
  }, [headlinePhrases.length]);

  return (
    <div className="sc-landing">
      <Header />
      <div className="sc-nav-spacer" aria-hidden="true" />
      <header className="sc-hero">
        <div className="sc-hero-badge">
          <span><Cpu size={15} />AI-Powered</span>
          <b>•</b>
          <span><ShieldCheck size={15} />Expert Verified</span>
          <b>•</b>
          <span><Scale size={15} />Bias-Free</span>
        </div>
        <h1>
          <span>Find the cards that</span>{" "}
          <strong key={headlineIndex}>{headlinePhrases[headlineIndex]}</strong>
        </h1>
        <p>
          Our proprietary algorithm compares <b>200+ credit cards</b> across <span>rewards, fees, caps, and exclusions</span> to
          find your best fit
        </p>
        <HeroAskBox />
        <FeatureGrid />
      </header>
      <PopularPicks cards={popularCards} />
      <LatestUpdates updates={updates} />
      {/* <ReviewsPanel /> */}
      <Footer onOpenPolicy={setPolicy} />
      {policy ? <PolicyModal policy={policy} onClose={() => setPolicy(null)} /> : null}
    </div>
  );
}
