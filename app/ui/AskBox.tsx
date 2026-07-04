"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/LoadingButton";
import { Sparkle } from "@/components/icons/Sparkle";
import { loadingCopy } from "@/lib/loading-copy";
import { useNavigationProgress } from "./NavigationProgress";

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
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();

    if (!query || isLoading) {
      event.preventDefault();
      return;
    }

    setIsLoading(true);
    startNavigation("ask");
    const nextParams = new URLSearchParams({ query });
    if (defaultMaxAnnualFee !== undefined) {
      nextParams.set("maxAnnualFee", String(defaultMaxAnnualFee));
    }
    router.push(`/ask?${nextParams.toString()}` as Route);
  }

  if (variant === "hero") {
    return (
      <form action="/ask" className="ask-card" method="GET" onSubmit={handleSubmit}>
        <div className="ask-top">
          <span className="ask-title">
            <Search size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            Ask SimplifyCards
          </span>
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
          disabled={isLoading}
          id="query"
          name="query"
          placeholder="Example: I spend Rs 25k on Amazon/Flipkart, Rs 8k on food delivery, and travel 3 times a year. Which cards should I consider?"
        />

        {defaultMaxAnnualFee !== undefined ? <input name="maxAnnualFee" type="hidden" value={defaultMaxAnnualFee} /> : null}

        <div className="ask-actions">
          <LoadingButton className="btn btn-primary" loading={isLoading} loadingText={loadingCopy.ask.title} type="submit">
            <span className="sc-pulse" aria-hidden="true" />
            <Sparkle className="sc-sparkle" size={16} />
            <span>Get my shortlist</span>
            <ArrowRight size={16} />
          </LoadingButton>
          <Link className="btn btn-ghost" href="#use-cases">
            Browse by goal
          </Link>
        </div>

        <div className="micro-note">No guaranteed approvals. We help you evaluate fit before you apply.</div>
      </form>
    );
  }

  return (
    <form action="/ask" className="panel ask-panel" method="GET" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="query">
          <Search size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Ask about Indian credit cards
        </label>
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
          disabled={isLoading}
          id="query"
          name="query"
          placeholder="e.g. Best cashback card under Rs 2000 annual fee"
        />
      </div>
      {defaultMaxAnnualFee !== undefined ? <input name="maxAnnualFee" type="hidden" value={defaultMaxAnnualFee} /> : null}
      <LoadingButton className="button" loading={isLoading} loadingText={loadingCopy.ask.title} type="submit">
        <span className="sc-pulse" aria-hidden="true" />
        <Sparkle className="sc-sparkle" size={16} />
        <span>Ask</span>
        <ArrowRight size={16} />
      </LoadingButton>
      {showHelperText ? (
        <p className="muted" style={{ margin: 0 }}>
          Answers are grounded in verified card data, not generic web results.
        </p>
      ) : null}
    </form>
  );
}
