import Link from "next/link";
import type { Route } from "next";
import type { CardScore, CreditCard } from "@/lib/types";
import { scoreCards } from "@/lib/recommend";
import CardTile from "./ui/CardTile";
import AskBox from "./ui/AskBox";

const STEPS = [
  { b: "Ask", s: "Tell us what you need" },
  { b: "Recommend", s: "Get a ranked shortlist" },
  { b: "Compare", s: "Check fees and exclusions" },
  { b: "Decide", s: "Apply only when it fits" }
];

const EXAMPLE_QUESTIONS = [
  "Which credit card is best for Rs 40k monthly online spend?",
  "SBI Cashback vs HDFC Swiggy: which one fits my spending?",
  "Is Axis Atlas worth Rs 5,000 if I travel twice a year?",
  "Which card is best for UPI payments and rewards?",
  "Best credit card for airport lounge access under Rs 2,000 annual fee?",
  "Which card is better for international travel and low forex markup?"
];

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
              Ask myCards. <span className="text-teal">Find the right card for your spending.</span>
            </h1>
            <p className="hero-copy">
              myCards helps you compare Indian credit cards using your spending, goals, and preferences—then explains the fees,
              rewards, caps, and trade-offs.
            </p>
            <div className="hero-proof">
              <span className="proof-pill">✓ Personalized shortlists</span>
              <span className="proof-pill">✓ Fees and exclusions explained</span>
              <span className="proof-pill">✓ Compare before you apply</span>
            </div>
          </div>

          <div>
            <AskBox variant="hero" />
            {top.length >= 2 ? (
              <div className="answer-preview">
                <div className="answer-preview-head">
                  <span>Example shortlist</span>
                  <span>Based on online spend</span>
                </div>
                <div className="mini-reco">
                  {top.slice(0, 2).map((score) => (
                    <div className="mini-row" key={score.card.id}>
                      <div>
                        <strong>{score.card.name}</strong>
                        <span>{shortDescriptor(score.card)}</span>
                      </div>
                      <div className="fit">{fitFor(score)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="How myCards works">
        <div className="container stats-grid">
          {STEPS.map((step) => (
            <div className="home-stat" key={step.b}>
              <b>{step.b}</b>
              <span>{step.s}</span>
            </div>
          ))}
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

      <section className="home-section" id="examples">
        <div className="container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Questions you can ask</div>
              <h2>Ask the way you actually think.</h2>
            </div>
            <p>Start with one of these questions, or describe your own spending pattern.</p>
          </div>
          <div className="examples-grid">
            {EXAMPLE_QUESTIONS.map((q, index) => (
              <Link className="example-question" href={`/ask?query=${encodeURIComponent(q)}`} key={q}>
                <span>{index + 1}</span>
                {q}
              </Link>
            ))}
          </div>
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
              Start with your real use case. myCards checks card rules and benefits, then explains the recommendation so you know
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
            <p>Pick a goal below or ask your own question. myCards will turn it into a card shortlist you can compare.</p>
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

      <section className="home-section" id="compare">
        <div className="container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Compare with context</div>
              <h2>See the reasoning behind every recommendation.</h2>
            </div>
            <p>After myCards shortlists cards, compare the fees, rewards, caps, exclusions, and best-use cases side by side.</p>
          </div>
          <div className="compare-layout">
            <article className="home-compare-card dark">
              <h3>Ask → shortlist → compare</h3>
              <p>
                A useful recommendation shows both the upside and the catch. myCards helps you see when a card is worth it—and when
                it is not.
              </p>
              <div className="compare-controls">
                <div className="select-box">Need: online cashback + low fee</div>
                <div className="select-box">Shortlist: SBI Cashback, HDFC Swiggy, Amazon Pay ICICI</div>
                <Link className="btn btn-primary" href="/compare">
                  Compare shortlist
                </Link>
              </div>
            </article>

            <article className="home-compare-card">
              <h3>Example comparison</h3>
              <p>Keep comparisons short, practical, and focused on the user&apos;s decision.</p>
              <table className="home-compare-table">
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>SBI Cashback</th>
                    <th>HDFC Swiggy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Best for</td>
                    <td>Broad online spends</td>
                    <td>Swiggy-heavy users</td>
                  </tr>
                  <tr>
                    <td>Watch out for</td>
                    <td>Caps and exclusions</td>
                    <td>Value is niche</td>
                  </tr>
                  <tr>
                    <td>myCards take</td>
                    <td>Better default cashback pick.</td>
                    <td>Better only if Swiggy spend is high.</td>
                  </tr>
                </tbody>
              </table>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section alt" id="trust">
        <div className="container">
          <div className="home-section-head">
            <div>
              <div className="home-section-kicker">Trust and transparency</div>
              <h2>Built to avoid guesswork.</h2>
            </div>
            <p>
              Credit-card benefits change often. myCards shows caveats clearly and flags uncertain items for review instead of
              pretending to know.
            </p>
          </div>
          <div className="trust-grid">
            <article className="trust-card">
              <h3>Responsible recommendations</h3>
              <p>Every answer explains why a card fits, where the value may drop, and what to verify before applying.</p>
              <ul className="trust-list">
                <li>
                  <span className="check">✓</span>
                  <span>Show the latest review date so you know how current the details are.</span>
                </li>
                <li>
                  <span className="check">✓</span>
                  <span>Surface fees, caps, and exclusions—not just the headline rewards.</span>
                </li>
                <li>
                  <span className="check">✓</span>
                  <span>Flag cards you should skip for your use case, not only the ones to apply for.</span>
                </li>
              </ul>
            </article>
            <article className="trust-card">
              <h3>Grounded in verified data</h3>
              <p>Recommendations are matched against manually verified card facts, not generic web results.</p>
              <ul className="trust-list">
                <li>
                  <span className="check">✓</span>
                  <span>Not financial advice—always verify terms with the issuer before applying.</span>
                </li>
                <li>
                  <span className="check">✓</span>
                  <span>Affiliate links are clearly disclosed and never change the ranking.</span>
                </li>
                <li>
                  <span className="check">✓</span>
                  <span>Uncertain or out-of-date details are sent for review rather than guessed.</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
