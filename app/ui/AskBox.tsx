import Link from "next/link";
import { ArrowRight } from "lucide-react";

const EXAMPLE_QUERIES = [
  "Best lifetime free cashback card",
  "Top cards for airport lounge access",
  "Best travel card under Rs 5000 fee",
  "Best card for online shopping",
];

const HERO_PROMPTS = [
  "Best card for Rs 40k online spend?",
  "Which card gives lounge access?",
  "Best UPI card for rewards?",
  "Best travel card under Rs 5000?",
];

type Props = {
  defaultQuery?: string;
  defaultMaxAnnualFee?: number;
  showHelperText?: boolean;
  variant?: "default" | "hero";
};

export default function AskBox({
  defaultQuery = "",
  defaultMaxAnnualFee,
  showHelperText = true,
  variant = "default"
}: Props) {
  if (variant === "hero") {
    return (
      <form action="/ask" className="ask-card" method="GET">
        <div className="ask-top">
          <span className="ask-title">Ask myCards</span>
          <span className="live-badge">
            <span className="live-dot" aria-hidden="true" /> Data-backed
          </span>
        </div>

        <div className="prompt-grid">
          {HERO_PROMPTS.map((prompt) => (
            <Link key={prompt} className="prompt-chip" href={`/ask?query=${encodeURIComponent(prompt)}`}>
              {prompt}
            </Link>
          ))}
        </div>

        <label htmlFor="query" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Ask about Indian credit cards
        </label>
        <textarea
          className="ask-input"
          defaultValue={defaultQuery}
          id="query"
          name="query"
          placeholder="Example: I spend Rs 25k on Amazon/Flipkart, Rs 8k on food delivery, and travel 3 times a year. Which cards should I consider?"
        />

        {defaultMaxAnnualFee !== undefined ? <input name="maxAnnualFee" type="hidden" value={defaultMaxAnnualFee} /> : null}

        <div className="ask-actions">
          <button className="btn btn-primary" type="submit">
            Get my shortlist <ArrowRight size={16} />
          </button>
          <Link className="btn btn-ghost" href="#use-cases">
            Browse by goal
          </Link>
        </div>

        <div className="micro-note">No guaranteed approvals. We help you evaluate fit before you apply.</div>
      </form>
    );
  }

  return (
    <form action="/ask" className="panel ask-panel" method="GET">
      <div className="field">
        <label htmlFor="query">Ask about Indian credit cards</label>
        {showHelperText ? (
          <div className="ask-examples">
            {EXAMPLE_QUERIES.map((q) => (
              <Link
                key={q}
                className="ask-example"
                href={`/ask?query=${encodeURIComponent(q)}`}
              >
                {q}
              </Link>
            ))}
          </div>
        ) : null}
        <textarea
          defaultValue={defaultQuery}
          id="query"
          name="query"
          placeholder="e.g. Best cashback card under Rs 2000 annual fee"
        />
      </div>
      {defaultMaxAnnualFee !== undefined ? <input name="maxAnnualFee" type="hidden" value={defaultMaxAnnualFee} /> : null}
      <button className="button" type="submit">
        Ask <ArrowRight size={16} />
      </button>
      {showHelperText ? (
        <p className="muted" style={{ margin: 0 }}>
          Answers are grounded in verified card data, not generic web results.
        </p>
      ) : null}
    </form>
  );
}
