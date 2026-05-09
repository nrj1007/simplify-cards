"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type ApiResult = {
  summary: string;
  cards: Array<{
    card: { id: string; name: string; issuer: string; annualFee: number };
    estimatedAnnualRewards: number;
    estimatedAnnualFee: number;
    estimatedNetValue: number;
    fitScore: number;
    reasons: string[];
  }>;
};

export default function AskBox() {
  const [query, setQuery] = useState("Best card for online shopping and lounge access under Rs 5000 fee");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, maxAnnualFee: 5000 })
    });
    setResult(await response.json());
    setLoading(false);
  }

  return (
    <section className="panel ask-panel">
      <div className="field">
        <label htmlFor="query">Ask about Indian credit cards</label>
        <textarea id="query" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <button className="button" onClick={ask} disabled={loading}>
        <Send size={16} /> {loading ? "Thinking..." : "Ask"}
      </button>
      {result ? (
        <div className="results">
          <p className="notice">{result.summary}</p>
          {result.cards.map((item) => (
            <div className="panel card result-card" key={item.card.id}>
              <strong>{item.card.name}</strong>
              <span className="muted">
                {item.card.issuer} · Rs {item.estimatedAnnualRewards.toLocaleString("en-IN")} rewards · Rs{" "}
                {item.estimatedAnnualFee.toLocaleString("en-IN")} effective fee · Rs{" "}
                {item.estimatedNetValue.toLocaleString("en-IN")} net value
              </span>
              <span className="muted">{item.reasons.slice(0, 3).join(" · ")}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
