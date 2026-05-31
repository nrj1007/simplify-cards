"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { RecommendResult, SpendCategory, SpendProfile } from "@/lib/types";

type Props = {
  defaultSpend: SpendProfile;
  initialResults: RecommendResult[];
};

const CATEGORY_LABELS: Record<SpendCategory, string> = {
  online: "Online shopping",
  base: "Other offline / retail",
  travel: "Travel (flights, hotels)",
  fuel: "Fuel",
  dining: "Dining & food delivery",
  grocery: "Groceries",
  amazon: "Amazon",
  upi: "UPI payments",
  utilities: "Utility bills",
  rent: "Rent",
  insurance: "Insurance",
  education: "Education",
  gold: "Gold / jewellery"
};

const CORE_CATEGORIES: SpendCategory[] = ["online", "dining", "travel", "fuel", "grocery", "utilities", "upi"];
const MORE_CATEGORIES: SpendCategory[] = ["base", "amazon", "rent", "insurance", "education", "gold"];
const ALL_CATEGORIES: SpendCategory[] = [...CORE_CATEGORIES, ...MORE_CATEGORIES];

const SLIDER_MAX = 100_000;
const SLIDER_STEP = 500;

function formatINR(value: number) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function buildInitialSpend(defaultSpend: SpendProfile): Record<SpendCategory, number> {
  const spend = {} as Record<SpendCategory, number>;
  for (const category of ALL_CATEGORIES) {
    spend[category] = defaultSpend[category] ?? 0;
  }
  return spend;
}

export default function RecommendCalculator({ defaultSpend, initialResults }: Props) {
  const [spend, setSpend] = useState<Record<SpendCategory, number>>(() => buildInitialSpend(defaultSpend));
  const [showMore, setShowMore] = useState(false);
  const [maxAnnualFee, setMaxAnnualFee] = useState<string>("");
  const [wantsLounge, setWantsLounge] = useState(false);
  const [wantsLifetimeFree, setWantsLifetimeFree] = useState(false);
  const [results, setResults] = useState<RecommendResult[]>(initialResults);
  const [pending, setPending] = useState(false);

  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip the first run: initialResults already match the default profile (server-rendered).
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPending(true);
      fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spend, maxAnnualFee: maxAnnualFee || null, wantsLounge, wantsLifetimeFree }),
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((data: { results?: RecommendResult[] }) => {
          setResults(data.results ?? []);
          setPending(false);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) setPending(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [spend, maxAnnualFee, wantsLounge, wantsLifetimeFree]);

  const totalMonthly = ALL_CATEGORIES.reduce((sum, category) => sum + spend[category], 0);
  const visibleCategories = showMore ? ALL_CATEGORIES : CORE_CATEGORIES;

  function setCategory(category: SpendCategory, value: number) {
    setSpend((prev) => ({ ...prev, [category]: value }));
  }

  return (
    <div className="recommend-layout">
      <aside className="panel recommend-controls">
        <div className="recommend-total">
          <div>
            <strong>{formatINR(totalMonthly)}</strong>
            <span>per month</span>
          </div>
          <div>
            <strong>{formatINR(totalMonthly * 12)}</strong>
            <span>per year</span>
          </div>
        </div>

        <div className="recommend-sliders">
          {visibleCategories.map((category) => (
            <div className="slider-row" key={category}>
              <div className="slider-head">
                <label htmlFor={`spend-${category}`}>{CATEGORY_LABELS[category]}</label>
                <span className="slider-value">{formatINR(spend[category])}</span>
              </div>
              <input
                className="slider"
                id={`spend-${category}`}
                max={SLIDER_MAX}
                min={0}
                step={SLIDER_STEP}
                type="range"
                value={spend[category]}
                onChange={(event) => setCategory(category, Number(event.target.value))}
              />
            </div>
          ))}
        </div>

        <button className="recommend-more" type="button" onClick={() => setShowMore((value) => !value)}>
          <ChevronDown className={showMore ? "is-open" : ""} size={16} />
          {showMore ? "Fewer categories" : "More categories"}
        </button>

        <div className="recommend-filters">
          <label className="recommend-check">
            <input checked={wantsLounge} type="checkbox" onChange={(event) => setWantsLounge(event.target.checked)} />
            Needs airport lounge access
          </label>
          <label className="recommend-check">
            <input
              checked={wantsLifetimeFree}
              type="checkbox"
              onChange={(event) => setWantsLifetimeFree(event.target.checked)}
            />
            Lifetime free only
          </label>
          <div className="field">
            <label htmlFor="recommend-max-fee">Max annual fee</label>
            <select
              disabled={wantsLifetimeFree}
              id="recommend-max-fee"
              value={maxAnnualFee}
              onChange={(event) => setMaxAnnualFee(event.target.value)}
            >
              <option value="">Any fee</option>
              <option value="0">Rs 0</option>
              <option value="1000">Rs 1,000</option>
              <option value="5000">Rs 5,000</option>
            </select>
          </div>
        </div>
      </aside>

      <div className="recommend-results">
        <div className="section-head recommend-results-head">
          <div>
            <h2>Top picks for your spend</h2>
            <p>Ranked by estimated net value per year, after fees.</p>
          </div>
          {pending ? <span className="recommend-updating">Updating…</span> : null}
        </div>

        {totalMonthly === 0 ? (
          <div className="panel card">
            <p className="muted" style={{ margin: 0 }}>
              Move a slider to set your spend and see recommendations.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="panel card">
            <p className="muted" style={{ margin: 0 }}>
              No cards match these filters — try loosening them.
            </p>
          </div>
        ) : (
          <div className="recommend-cards">
            {results.map((result, index) => (
              <article
                className={`panel card recommend-card${index === 0 ? " recommend-card-top" : ""}`}
                key={result.id}
              >
                <div className="meta recommend-card-meta">
                  <span className="badge">#{index + 1}</span>
                  <span>{result.issuer}</span>
                </div>
                <h3>{result.name}</h3>
                <div className="meta">
                  {result.tags.map((tag) => (
                    <span className="badge" key={`${result.id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="stats recommend-stats">
                  <div className="stat">
                    <strong>{formatINR(result.estimatedAnnualRewards)}</strong>
                    <span>Annual rewards</span>
                  </div>
                  <div className="stat">
                    <strong>{formatINR(result.estimatedAnnualFee)}</strong>
                    <span>Effective annual fee</span>
                  </div>
                  <div className="stat">
                    <strong>{formatINR(result.estimatedNetValue)}</strong>
                    <span>Net value / year</span>
                  </div>
                </div>

                {result.breakdown.length > 0 ? (
                  <details className="recommend-breakdown" open={index === 0}>
                    <summary>Reward breakdown</summary>
                    <div className="table-wrap">
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Your monthly spend</th>
                            <th>Annual reward</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.breakdown.map((row) => (
                            <tr key={`${result.id}-${row.spendCategory}`}>
                              <td>{CATEGORY_LABELS[row.spendCategory]}</td>
                              <td>{formatINR(row.monthlySpend)}</td>
                              <td>{formatINR(row.annualReward)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ) : null}

                <div className="actions">
                  <Link className="button secondary" href={`/cards/${result.id}`}>
                    Details
                  </Link>
                  <a className="button" href={result.applyUrl} rel="nofollow sponsored" target="_blank">
                    Apply <ExternalLink size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
