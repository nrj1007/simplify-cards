import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import type { CardScore, CreditCard } from "@/lib/types";
import { SITE_NAME } from "@/lib/seo";
import { scoreCards } from "@/lib/recommend";
import CardTile from "./ui/CardTile";
import AskBox from "./ui/AskBox";

export const metadata: Metadata = {
  title: "Find the Right Indian Credit Card",
  description:
    "Ask questions, compare cards, estimate rewards, and find the right Indian credit card with verified fees, benefits, lounges, exclusions, and redemption details.",
  alternates: {
    canonical: "./"
  },
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: `Find the Right Indian Credit Card | ${SITE_NAME}`,
    description:
      "Ask questions, compare cards, estimate rewards, and find the right Indian credit card with verified fees, benefits, lounges, exclusions, and redemption details.",
    url: "https://www.simplifycards.in/",
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: `Find the Right Indian Credit Card | ${SITE_NAME}`,
    description:
      "Ask questions, compare cards, estimate rewards, and find the right Indian credit card with verified fees, benefits, lounges, exclusions, and redemption details."
  }
};

const WORKFLOW = [
  {
    title: "Share your use case",
    desc: "Tell us what matters: cashback, lounge access, travel, UPI, low fees, fuel, forex, or premium benefits."
  },
  {
    title: "Check card rules",
    desc: "We look at fees, reward rates, caps, exclusions, milestones, redemption options, and key issuer rules."
  },
  {
    title: "Choose with context",
    desc: "See the best fit, sensible alternatives, who should avoid each card, and what to verify before applying."
  }
];

const USE_CASES: Array<{ icon: string; title: string; desc: string; cta: string; href: Route }> = [
  { icon: "₹", title: "Cashback", desc: "Maximize returns on online shopping, food delivery, groceries, and everyday spends.", cta: "Ask about cashback", href: "/ask?query=Best%20cashback%20card%20for%20online%20shopping" },
  { icon: "✈", title: "Travel", desc: "Evaluate miles, hotel value, forex markup, lounge access, and fee recovery.", cta: "Ask about travel", href: "/ask?query=Best%20travel%20credit%20card%20for%20miles%20and%20lounge%20access" },
  { icon: "UPI", title: "UPI cards", desc: "Understand RuPay/UPI rewards, caps, exclusions, fees, and where value drops.", cta: "Ask about UPI", href: "/ask?query=Best%20UPI%20card%20for%20rewards" },
  { icon: "%", title: "Calculator", desc: "Estimate the rewards and rupee value you'd earn on any card from your monthly spend.", cta: "Open calculator", href: "/calculator" as Route },
  { icon: "⚖", title: "Compare", desc: "Compare shortlisted cards side by side and see which one wins for your exact use case.", cta: "Compare cards", href: "/compare" }
];

const REC_SLOTS = [
  { label: "Best overall", className: "rec-item best" },
  { label: "Strong alternative", className: "rec-item" },
  { label: "Value pick", className: "rec-item" }
];

function shortDescriptor(card: CreditCard) {
  const first = card.bestFor[0];
  if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  return `${card.rewardType} rewards`;
}

function makeFit(scores: CardScore[]) {
  const max = scores[0]?.fitScore ?? 0;
  const min = scores[scores.length - 1]?.fitScore ?? 0;
  const range = max - min || 1;
  return (score: CardScore) => Math.round(80 + (15 * (score.fitScore - min)) / range);
}

export default function Home() {
  const top = scoreCards({ query: "best cashback card", maxAnnualFee: 2000 }).slice(0, 3);
  const fitFor = makeFit(top);

  return (
    <div className="home">
      <section className="hero" id="ask">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">✦ Smart credit-card guidance for India</div>
            <h1>
              Ask SimplifyCards. <span className="text-teal">Find the right card for your spending.</span>
            </h1>
            <p className="hero-copy">
              Tell us how you spend. We&apos;ll shortlist the right Indian credit cards and explain the fees, rewards, and
              catches—before you apply.
            </p>
            <div className="hero-proof">
              <span className="proof-pill">✓ Personalized shortlists</span>
              <span className="proof-pill">✓ Fees and exclusions explained</span>
              <span className="proof-pill">✓ Compare before you apply</span>
            </div>
          </div>

          <div>
            <AskBox variant="hero" />
          </div>
        </div>
      </section>

      <section className="recommendation-hero" id="recommendations">
        <div className="container recommendation-grid">
          <div className="recommendation-copy">
            <div className="home-section-kicker">Recommendation engine</div>
            <h2>A shortlist tailored to your spending.</h2>
            <p>
              The Recommend page turns your inputs into clear options: best overall pick, value alternative, premium upgrade, and
              cards you should skip.
            </p>
            <div className="recommendation-actions">
              <Link className="btn btn-primary" href="/recommend">
                Get recommendations →
              </Link>
              <Link className="btn btn-ghost" href="#ask">
                Ask a question
              </Link>
            </div>
          </div>

          <aside className="recommendation-card" aria-label="Recommendation preview">
            <div className="rec-head">
              <span>Your shortlist</span>
              <strong>Online + travel</strong>
            </div>
            <div className="rec-list">
              {top.map((score, index) => {
                const slot = REC_SLOTS[index] ?? REC_SLOTS[REC_SLOTS.length - 1];
                return (
                  <div className={slot.className} key={score.card.id}>
                    <div>
                      <small>{slot.label}</small>
                      <strong>{score.card.name}</strong>
                      <span>{shortDescriptor(score.card)}</span>
                    </div>
                    <b>{fitFor(score)} fit</b>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="home-section alt" id="how">
        <div className="container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">How it works</div>
              <h2>From question to decision in three steps.</h2>
            </div>
            <p>
              Start with your real use case. SimplifyCards checks card rules and benefits, then explains the recommendation so you know
              why it fits.
            </p>
          </div>
          <div className="workflow-grid">
            {WORKFLOW.map((step, index) => (
              <article className="workflow-card" key={step.title}>
                <div className="step-badge">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" id="use-cases">
        <div className="container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Use cases</div>
              <h2>Start with what you care about.</h2>
            </div>
            <p>Pick a goal below or ask your own question. SimplifyCards will turn it into a card shortlist you can compare.</p>
          </div>
          <div className="usecase-grid">
            {USE_CASES.map((useCase) => (
              <article className="usecase-card" key={useCase.title}>
                <div>
                  <div className="usecase-icon">{useCase.icon}</div>
                  <h3>{useCase.title}</h3>
                  <p>{useCase.desc}</p>
                </div>
                <Link href={useCase.href}>{useCase.cta} →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section alt" id="cards">
        <div className="container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Popular cards</div>
              <h2>Start with cards people often compare.</h2>
            </div>
            <p>
              Use these as starting points. The right choice still depends on your spend pattern, eligibility, and how you redeem
              rewards.
            </p>
          </div>
          <div className="cards-grid">
            {top.map((score) => (
              <CardTile key={score.card.id} score={score} />
            ))}
          </div>
        </div>
      </section>

      <section className="home-section" id="trust">
        <div className="container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Trust and transparency</div>
              <h2>Built to avoid guesswork.</h2>
            </div>
            <p>
              Credit-card benefits change often. SimplifyCards shows caveats clearly and flags uncertain items for review instead of
              pretending to know.
            </p>
          </div>
          <article className="trust-card">
            <ul className="trust-list trust-list-row">
              <li>
                <span className="check">✓</span>
                <span>Surfaces fees, caps, and exclusions—not just the headline rewards.</span>
              </li>
              <li>
                <span className="check">✓</span>
                <span>Flags cards you should skip for your use case, with the latest review date shown.</span>
              </li>
              <li>
                <span className="check">✓</span>
                <span>Grounded in manually verified card facts, not generic web results.</span>
              </li>
              <li>
                <span className="check">✓</span>
                <span>Not financial advice. Affiliate links are disclosed and never change the ranking.</span>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
