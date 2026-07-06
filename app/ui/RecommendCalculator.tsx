"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { RecommendResult, SpendCategory, SpendProfile } from "@/lib/types";
import { buildRecommendationMetadata } from "@/lib/analytics-events";
import { trackEvent } from "@/lib/analytics-client";
import { TrackedExternalLink, TrackedLink } from "./TrackedLink";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResultSection = {
  title: string;
  results: RecommendResult[];
};

type Props = {
  defaultSpend: SpendProfile;
  initialSections: ResultSection[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<SpendCategory, string> = {
  online: "Online shopping",
  base: "Other offline / retail",
  travel: "Travel (cab, train, etc)",
  hotels: "Hotel bookings",
  airlines: "Flight bookings",
  fuel: "Fuel",
  dining: "Dining & food delivery",
  grocery: "Groceries",
  amazon: "Amazon",
  upi: "UPI payments",
  utilities: "Utility bills",
  rent: "Rent",
  insurance: "Insurance",
  education: "Education",
  gold: "Gold / jewellery",
  government: "Tax / Government payments",
  international: "International spends"
};

const CORE_CATEGORIES: SpendCategory[] = ["online", "dining", "travel", "hotels", "airlines", "fuel", "grocery", "utilities", "upi"];
const MORE_CATEGORIES: SpendCategory[] = ["base", "amazon", "rent", "insurance", "education", "gold", "government", "international"];
const ALL_CATEGORIES: SpendCategory[] = [...CORE_CATEGORIES, ...MORE_CATEGORIES];

const SLIDER_MAX = 100_000;
const SLIDER_STEP = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatINR(value: number) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatINRCompact(value: number) {
  const v = Math.round(value);
  if (v >= 100000) {
    const lakhs = v / 100000;
    const formatted = lakhs % 1 === 0 ? `${lakhs}` : lakhs.toFixed(1);
    return `Rs ${formatted}L`;
  }
  return `Rs ${v.toLocaleString("en-IN")}`;
}

function formatINRInput(value: number) {
  return Math.round(value).toString();
}

function cardTypeLabel(result: RecommendResult) {
  return /cashback/i.test(result.rewardType) || result.netValueContextLabel === "as cashback"
    ? "Cashback Card"
    : "Reward Card";
}

function calculatorMilestoneLine(result: RecommendResult) {
  if (result.estimatedMilestoneValue > 0) {
    return `Milestones add ${formatINR(result.estimatedMilestoneValue)} per year.`;
  }

  if (result.nextMilestoneGap !== null) {
    return `${formatINR(result.nextMilestoneGap)} more yearly spend to unlock the next milestone.`;
  }

  return "No milestone uplift at this spend.";
}

function calculatorFeeWaiverLine(result: RecommendResult) {
  if (result.annualFee === 0) return "No annual fee on this card.";
  if (result.feeWaiverHit) return "Fee waiver hit at your current yearly spend.";
  if (result.nextFeeWaiverGap !== null) {
    return `${formatINR(result.nextFeeWaiverGap)} more yearly spend to unlock fee waiver.`;
  }

  return "Fee waiver not listed for this card.";
}

function calculatorNextUnlockLine(result: RecommendResult) {
  const candidates = [
    result.nextMilestoneGap !== null
      ? {
          gap: result.nextMilestoneGap,
          text: `Next milestone in ${formatINR(result.nextMilestoneGap)} yearly spend.`
        }
      : null,
    result.nextFeeWaiverGap !== null
      ? {
          gap: result.nextFeeWaiverGap,
          text: `Fee waiver in ${formatINR(result.nextFeeWaiverGap)} yearly spend.`
        }
      : null
  ].filter((item): item is { gap: number; text: string } => Boolean(item));

  if (candidates.length === 0) return "No near-term unlock remaining.";
  return candidates.sort((a, b) => a.gap - b.gap)[0].text;
}

function calculatorAdjustmentLines(result: RecommendResult) {
  const lines = [];
  if (result.estimatedJoiningAndRenewalValue > 0) {
    lines.push(
      <p key="joining-renewal"><strong>Joining/renewal value:</strong> Adds {formatINR(result.estimatedJoiningAndRenewalValue)} per year.</p>
    );
  }
  if (result.estimatedForexCost > 0) {
    lines.push(
      <p key="forex-cost"><strong>Forex cost:</strong> Deducts {formatINR(result.estimatedForexCost)} per year.</p>
    );
  }
  return lines;
}

function buildInitialSpend(defaultSpend: SpendProfile): Record<SpendCategory, number> {
  const spend = {} as Record<SpendCategory, number>;
  for (const category of ALL_CATEGORIES) {
    spend[category] = defaultSpend[category] ?? 0;
  }
  return spend;
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

function RecommendCard({ result, index, isTopOfSection }: { result: RecommendResult; index: number; isTopOfSection: boolean }) {
  const router = useRouter();
  const detailsHref = `/cards/${result.id}` as Route;

  function openDetails() {
    router.push(detailsHref);
  }

  return (
    <article
      className={`panel card recommend-card clickable-card${isTopOfSection && index === 0 ? " recommend-card-top" : ""}`}
      data-detail-url={detailsHref}
      key={result.id}
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
    >
      <div className="meta recommend-card-meta">
        <span className="badge">#{index + 1}</span>
        <span>{result.issuer}</span>
      </div>
      <div className="recommend-title-line">
        <h3>{result.name}</h3>
        <span className="card-type-badge">{cardTypeLabel(result)}</span>
      </div>

      {result.usp ? (
        <p className="card-usp">{result.usp}</p>
      ) : null}

      <div className="stats recommend-stats">
        <div className="stat">
          <strong>{formatINR(result.estimatedAnnualRewards)}</strong>
          <span>Rewards / year</span>
        </div>
        <div className="stat">
          <strong>{formatINR(result.estimatedMilestoneValue)}</strong>
          <span>Milestones / year</span>
        </div>
        {result.estimatedJoiningAndRenewalValue > 0 ? (
          <div className="stat">
            <strong>{formatINR(result.estimatedJoiningAndRenewalValue)}</strong>
            <span>Joining/renewal value</span>
          </div>
        ) : null}
        {result.estimatedForexCost > 0 ? (
          <div className="stat">
            <strong>-{formatINR(result.estimatedForexCost)}</strong>
            <span>Forex cost / year</span>
          </div>
        ) : null}
        <div className="stat">
          <strong>{formatINR(result.estimatedAnnualFee)}</strong>
          <span>Fee after waiver</span>
        </div>
        <div className="stat">
          <strong>{formatINR(result.estimatedNetValue)}</strong>
          <span>{result.netValueContextLabel ? `Net value / year · ${result.netValueContextLabel}` : "Net value / year"}</span>
        </div>
      </div>

      <div className="recommend-explain">
        <p><strong>Milestones:</strong> {calculatorMilestoneLine(result)}</p>
        <p><strong>Fee waiver:</strong> {calculatorFeeWaiverLine(result)}</p>
        {calculatorAdjustmentLines(result)}
        <p><strong>Next unlock:</strong> {calculatorNextUnlockLine(result)}</p>
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
                {result.breakdown.map((row, rowIndex) => (
                  <tr key={`${result.id}-${row.spendCategory}-${rowIndex}`}>
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
        <TrackedLink
          analyticsEvent={{
            event_name: "details_clicked",
            page: "recommend",
            source: "recommend",
            card_id: result.id
          }}
          className="details-link"
          href={detailsHref}
          onClick={(event) => event.stopPropagation()}
        >
          Click for more details -&gt;
        </TrackedLink>
        <TrackedExternalLink
          analyticsEvent={{
            event_name: "apply_clicked",
            page: "recommend",
            source: "recommend",
            card_id: result.id
          }}
          className="button apply-now-button"
          href={cardCtaHref(result)}
          onClick={(event) => event.stopPropagation()}
          rel={cardCtaRel(result)}
          target="_blank"
        >
          {cardCtaLabel(result)}
        </TrackedExternalLink>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RecommendCalculator({ defaultSpend, initialSections }: Props) {
  const [spend, setSpend] = useState<Record<SpendCategory, number>>(() => buildInitialSpend(defaultSpend));
  const [showMore, setShowMore] = useState(false);
  const [maxAnnualFee, setMaxAnnualFee] = useState<string>("");
  const [wantsLounge, setWantsLounge] = useState(false);
  const [wantsLifetimeFree, setWantsLifetimeFree] = useState(false);
  const [groupByType, setGroupByType] = useState(false);
  const [sections, setSections] = useState<ResultSection[]>(initialSections);
  const [pending, setPending] = useState(false);

  const isFirstRun = useRef(true);
  const trackedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip the first run: initialSections already match the default profile (server-rendered).
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
        body: JSON.stringify({
          spend,
          maxAnnualFee: maxAnnualFee || null,
          wantsLounge,
          wantsLifetimeFree,
          resultStrategy: groupByType ? "reward-type-split" : "single-list"
        }),
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((data: { results?: RecommendResult[]; sections?: ResultSection[] }) => {
          if (data.sections) {
            setSections(data.sections);
          } else if (data.results) {
            // Flat results (backwards compat) — wrap as a single untitled section
            setSections([{ title: "", results: data.results }]);
          }
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
  }, [spend, maxAnnualFee, wantsLounge, wantsLifetimeFree, groupByType]);

  const totalMonthly = ALL_CATEGORIES.reduce((sum, category) => sum + spend[category], 0);
  const visibleCategories = showMore ? ALL_CATEGORIES : CORE_CATEGORIES;

  // Flat list of all results across sections for analytics
  const allResults = sections.flatMap((s) => s.results);
  const hasSections = sections.length > 1 || (sections.length === 1 && sections[0].title !== "");

  function setCategory(category: SpendCategory, value: number) {
    setSpend((prev) => ({ ...prev, [category]: Math.max(0, Math.min(SLIDER_MAX, value)) }));
  }

  useEffect(() => {
    const topThreeCardIds = allResults.slice(0, 3).map((result) => result.id);
    const signature = JSON.stringify(topThreeCardIds);
    if (trackedSignatureRef.current === signature) return;
    trackedSignatureRef.current = signature;

    trackEvent({
      event_name: "recommendation_generated",
      page: "recommend",
      source: "recommend",
      card_ids: topThreeCardIds,
      metadata: buildRecommendationMetadata(spend, maxAnnualFee, wantsLounge, wantsLifetimeFree, allResults)
    });
  }, [sections, spend, maxAnnualFee, wantsLounge, wantsLifetimeFree]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="recommend-layout">
      <aside className="panel recommend-controls">
        <div className="recommend-controls-head">
          <h2>Spend profile</h2>
          <p>Edit monthly spends to refine your shortlist</p>
        </div>

        <div className="recommend-total">
          <div>
            <strong>{formatINRCompact(totalMonthly)}</strong>
            <span>per month</span>
          </div>
          <div>
            <strong>{formatINRCompact(totalMonthly * 12)}</strong>
            <span>per year</span>
          </div>
        </div>

        <div className="recommend-sliders">
          {visibleCategories.map((category) => (
            <div className="slider-row" data-category-row={category} key={category}>
              <div className="slider-head">
                <label htmlFor={`spend-${category}`}>{CATEGORY_LABELS[category]}</label>
              </div>
              <div className="spend-control">
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
                <label className="spend-input-wrap" htmlFor={`spend-${category}-amount`}>
                  <span className="currency-prefix" aria-hidden="true">Rs</span>
                  <input
                    aria-label={`${CATEGORY_LABELS[category]} monthly spend`}
                    className="spend-amount-input"
                    id={`spend-${category}-amount`}
                    inputMode="numeric"
                    max={SLIDER_MAX}
                    min={0}
                    step={SLIDER_STEP}
                    type="number"
                    value={formatINRInput(spend[category])}
                    onChange={(event) => setCategory(category, Number(event.target.value))}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          aria-expanded={showMore}
          className="recommend-more"
          type="button"
          onClick={() => setShowMore((value) => !value)}
        >
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
          <label className="recommend-check">
            <input
              checked={groupByType}
              disabled={wantsLounge || wantsLifetimeFree}
              id="recommend-group-by-type"
              type="checkbox"
              onChange={(event) => setGroupByType(event.target.checked)}
            />
            Group by reward type
          </label>
        </div>
      </aside>

      <div className="recommend-results panel recommend-results-panel">
        <div className="section-head recommend-results-head">
          <div>
            <h2>Top picks for you by <span className="simplify-word">Simplify</span>Cards</h2>
            <p>Built for your spend profile and ranked by annual value after fees</p>
          </div>
          {pending ? <span className="recommend-updating">Updating…</span> : null}
        </div>

        {totalMonthly === 0 ? (
          <div className="panel card">
            <p className="muted" style={{ margin: 0 }}>
              Move a slider to set your spend and see recommendations.
            </p>
          </div>
        ) : allResults.length === 0 ? (
          <div className="panel card">
            <p className="muted" style={{ margin: 0 }}>
              No cards match these filters — try loosening them.
            </p>
          </div>
        ) : hasSections ? (
          // Sectioned view: two headed groups (e.g. Rewards + Cashback)
          <div className="recommend-sections">
            {sections.map((section) =>
              section.results.length === 0 ? null : (
                <div className="recommend-section" key={section.title}>
                  <h3 className="recommend-section-title">{section.title}</h3>
                  <div className="recommend-cards">
                    {section.results.map((result, index) => (
                      <RecommendCard
                        key={result.id}
                        result={result}
                        index={index}
                        isTopOfSection={index === 0}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          // Flat single-list view (default)
          <div className="recommend-cards">
            {(sections[0]?.results ?? []).map((result, index) => (
              <RecommendCard
                key={result.id}
                result={result}
                index={index}
                isTopOfSection={index === 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
