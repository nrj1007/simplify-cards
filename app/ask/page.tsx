import Link from "next/link";
import LoungeInfo from "../ui/LoungeInfo";
import AskFeedback from "../ui/AskFeedback";
import AskQueryForm from "../ui/AskQueryForm";
import AnalyticsMount from "../ui/AnalyticsMount";
import CardTile from "../ui/CardTile";
import { TrackedExternalLink, TrackedLink } from "../ui/TrackedLink";
import { answerQuestion } from "@/lib/ask-ai";
import { getCardById } from "@/lib/cards";
import { buildAskResultMetadata } from "@/lib/analytics-events";
import { getLoungeConditions, getTotalLoungeAccess } from "@/lib/lounge";
import { stripScoringAnnotations } from "@/lib/card-index";
import { scoreCards } from "@/lib/recommend";
import { getCardUsp } from "@/lib/card-usp";
import type { CreditCard, RecommendationInput } from "@/lib/types";

const ASK_EXAMPLES = [
  "Best lifetime free cashback card",
  "Top cards for airport lounge access",
  "Axis Atlas",
  "Best travel card under Rs 5000 fee",
  "SBI Cashback"
];

const DECISION_TONES = ["good", "warn", "skip"] as const;
const DECISION_LABELS = ["Top pick", "Strong alternative", "Also worth a look"];
const MATTER_CHIPS = ["Travel", "Cashback", "Lounge access", "Low annual fee"];
const SPEND_CHIPS = [
  { label: "Under Rs 25k", href: "/recommend" },
  { label: "Rs 25k-75k", href: "/recommend" },
  { label: "Rs 75k+", href: "/recommend" }
] as const;

type Props = {
  searchParams: Promise<{
    query?: string;
    maxAnnualFee?: string;
    feedbackSaved?: string;
    feedbackError?: string;
  }>;
};

function parseInput(params: { query?: string; maxAnnualFee?: string }): RecommendationInput | null {
  const query = params.query?.trim();
  if (!query) return null;

  const parsedMaxFee = params.maxAnnualFee ? Number(params.maxAnnualFee) : undefined;

  return {
    query,
    maxAnnualFee: parsedMaxFee !== undefined && !Number.isNaN(parsedMaxFee) ? parsedMaxFee : undefined
  };
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not listed";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatRewardRate(reward: { rate: number; displayRate?: string }, rewardType: string) {
  if (reward.displayRate) return reward.displayRate;

  const rewardTypeLower = rewardType.toLowerCase();

  if (rewardTypeLower.includes("mile") || rewardTypeLower.includes("point")) {
    return `${reward.rate} ${rewardType} / Rs 100`;
  }

  return `${reward.rate}%`;
}

function formatRewardCap(value: number | null | undefined, rewardType: string) {
  if (!value) return "-";
  return `${value.toLocaleString("en-IN")} ${rewardType}`;
}

function formatStatementQuarterCap(value: number | null | undefined) {
  if (!value) return "-";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatLoungeValue(value: number | "unlimited") {
  return value === "unlimited" ? "Unlimited" : value.toLocaleString("en-IN");
}

function formatFeeWaiverSpend(value: number | null | undefined) {
  if (!value) return "-";
  if (value >= 100000) {
    const lakhs = value / 100000;
    const formattedLakhs = Number.isInteger(lakhs) ? `${lakhs}` : lakhs.toFixed(1);
    return `Rs ${formattedLakhs} lakhs`;
  }
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function hasFeeWaiverSpend(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
}

function bestRedemptionValue(card: CreditCard) {
  const values = [
    card.redemption?.statementBalanceValue,
    card.redemption?.smartBuyFlightHotelValue,
    card.redemption?.travelEdgeValue,
    card.redemption?.airMilesValue,
    card.redemption?.accorValue
  ].filter((value): value is number => typeof value === "number" && value > 0);

  if (values.length === 0) return 1;
  return Math.max(...values);
}

function usesAccorRedemptionValue(card: CreditCard) {
  return typeof card.redemption?.accorValue === "number" && card.redemption.accorValue === bestRedemptionValue(card);
}

function accorRedemptionNote(card: CreditCard) {
  return usesAccorRedemptionValue(card) ? "*considering using accor redemption" : "";
}

function rewardRateToPercent(card: CreditCard, rate: number) {
  const rewardType = card.rewardType.toLowerCase();
  const isPointsLike =
    rewardType.includes("point") ||
    rewardType.includes("mile") ||
    rewardType.includes("coin") ||
    rewardType.includes("credit");

  const effectivePercent = isPointsLike ? rate * bestRedemptionValue(card) : rate;
  return Number.isInteger(effectivePercent) ? `${effectivePercent}%` : `${effectivePercent.toFixed(1)}%`;
}

function buildRewardRateSummary(card: CreditCard) {
  const sortedRewards = card.rewards.slice().sort((a, b) => a.rate - b.rate);
  if (sortedRewards.length === 0) return ["-"];

  const baseReward =
    sortedRewards.find((reward) => reward.category === "offline" || reward.displayCategory?.toLowerCase() === "others") ??
    sortedRewards[0];
  const acceleratedReward = [...sortedRewards].reverse().find((reward) => reward.rate > baseReward.rate);

  const baseText = `${rewardRateToPercent(card, baseReward.rate)} - Base reward rate`;
  const acceleratedText = acceleratedReward
    ? `upto ${rewardRateToPercent(card, acceleratedReward.rate)} - accelerated reward rate`
    : "";

  const accorNote = accorRedemptionNote(card);

  return [baseText, acceleratedText, accorNote].filter(Boolean);
}

function decisionCopy(item: { card: CreditCard; reasons: string[] }) {
  const reason = item.reasons.find(
    (entry) => !/^Strong card-name match/i.test(entry) && !/^Matches /i.test(entry)
  );
  return reason ?? getCardUsp(item.card);
}

function isTopCardsQuery(query?: string) {
  if (!query) return false;
  return /\b(top|best|recommend|recommended|suggest)\b/i.test(query) && /\bcards?\b/i.test(query);
}

function topCardsScenarioRows(highlights: string[]) {
  return highlights
    .map((highlight) => {
      const matched = highlight.match(/^By yearly spend on a balanced mix:\s*(.+)\.$/i);
      if (!matched) return null;

      return matched[1]
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const rowMatch = part.match(/^around\s+(.+?),\s+(.+)$/i);
          if (!rowMatch) return null;
          return {
            spendLabel: rowMatch[1],
            cardName: rowMatch[2]
          };
        })
        .filter((row): row is { spendLabel: string; cardName: string } => Boolean(row));
    })
    .flat()
    .filter((row): row is { spendLabel: string; cardName: string } => Boolean(row));
}

export default async function AskPage({ searchParams }: Props) {
  const params = await searchParams;
  const input = parseInput(params);
  const result = input ? await answerQuestion(input) : null;
  const savedFeedback = params.feedbackSaved === "up" || params.feedbackSaved === "down" ? params.feedbackSaved : null;
  const feedbackError = params.feedbackError === "1";
  const topCardsQuery = isTopCardsQuery(input?.query);
  const topCard = result?.cards[0];
  const matchCount = result?.cards.length ?? 0;
  const intent = result?.meta?.intent;
  // An exact-card answer is about a single card — never use the multi-result template for it.
  const exactCardIntent = intent === "specific-card" || intent === "card-detail";
  // Pick the template that fits the result: multiple (ranked + compare) vs a single exact card.
  const showRankedAnswer =
    Boolean(topCard) && !exactCardIntent && (topCardsQuery || result?.displayMode === "ranked-list" || matchCount > 1);
  const rankedResultCards = showRankedAnswer ? result?.cards ?? [] : [];
  const comparisonCards = showRankedAnswer ? rankedResultCards.slice(0, 3) : [];
  const showFeeWaiverRow = comparisonCards.some((item) => hasFeeWaiverSpend(item.card.feeWaiverSpend));
  const mainAnswerCardIds = new Set(
    showRankedAnswer
      ? rankedResultCards.map((item) => item.card.id)
      : topCard
        ? [topCard.card.id]
        : []
  );
  const linkedAlternativeCards = topCard
    ? (topCard.card.alternativeCardIds ?? []).flatMap((cardId) => {
        const card = getCardById(cardId);
        return card && !mainAnswerCardIds.has(card.id) ? [card] : [];
      })
    : [];
  const answerHighlights = (result?.highlights ?? []).filter((highlight) => {
    if (/^Closest alternative/i.test(highlight) || /^Closest alternatives/i.test(highlight)) return false;
    if (showRankedAnswer && /^#\d+:/i.test(highlight)) return false;
    return true;
  });
  const visibleAnswerHighlights = showRankedAnswer
    ? answerHighlights.filter((highlight) => !/^By yearly spend on a balanced mix:/i.test(highlight))
    : answerHighlights;
  const domesticLoungeConditions = topCard ? getLoungeConditions(topCard.card, "domestic") : [];
  const internationalLoungeConditions = topCard ? getLoungeConditions(topCard.card, "international") : [];
  const hasDailyCap = topCard?.card.rewards.some(
    (reward) => typeof reward.capDaily === "number" && reward.capDaily > 0
  ) ?? false;
  const hasMonthlyCap = topCard?.card.rewards.some(
    (reward) => typeof reward.capMonthly === "number" && reward.capMonthly > 0
  ) ?? false;
  const hasStatementQuarterCap = topCard?.card.rewards.some(
    (reward) => typeof reward.capStatementQuarter === "number" && reward.capStatementQuarter > 0
  ) ?? false;
  const returnTo = input
    ? `/ask?query=${encodeURIComponent(input.query ?? "")}${input.maxAnnualFee !== undefined ? `&maxAnnualFee=${input.maxAnnualFee}` : ""}`
    : "/ask";

  // Derived presentation values for the redesigned Ask surface.
  const isRanked = showRankedAnswer && rankedResultCards.length > 0;
  // Display-only fit score out of 100, normalized to the strongest card in this result set.
  // Ranking still uses the raw fitScore (see lib/recommend.ts), so this does not affect ordering.
  // Only shown on the ranked result cards — the single exact-card result has no fit score.
  const topFitRaw = result?.cards[0]?.fitScore ?? 0;
  const toFitPercent = (score: number) =>
    topFitRaw > 0 ? Math.max(1, Math.min(100, Math.round((score / topFitRaw) * 100))) : 100;
  const answerHeadTitle = isRanked
    ? `myCards found ${matchCount} relevant card${matchCount === 1 ? "" : "s"}.`
    : topCard?.card.name ?? "";
  const answerHeadSub = isRanked
    ? "Ranked by how well they match the query, not by commission."
    : topCard?.card.issuer ?? "";
  // The decision grid is a multi-recommendation device — only populate it for the ranked template.
  const decisionCards = (isRanked ? result?.cards ?? [] : []).slice(0, 3).map((item, index) => ({
    id: item.card.id,
    tone: DECISION_TONES[index] ?? "skip",
    label: DECISION_LABELS[index] ?? "Also worth a look",
    name: item.card.name,
    copy: decisionCopy(item)
  }));
  const queryStem = input?.query ? input.query : "best card";

  return (
    <div className="ask-results">
      <section className="ask-hero">
        <div className="container ask-hero-inner">
          <div className="crumb">✦ {input?.query ? "Ask result" : "Ask myCards"}</div>
          <h1>{input?.query ? <>Results for &ldquo;{input.query}&rdquo;.</> : <>Ask anything about Indian credit cards.</>}</h1>
          <p className="ask-hero-copy">
            {input?.query
              ? "Grounded in verified card data — exact cards, ranked matches, comparisons, and an honest no-result when we cannot confirm."
              : "Ask about rewards, lounges, fees, or the best card for your spend. Answers come from verified Indian credit-card data, not generic web results."}
          </p>

          <AskQueryForm
            ariaLabel="Ask another credit card question"
            buttonLabel="Ask again →"
            className="ask-search"
            defaultValue={input?.query ?? ""}
            maxAnnualFee={input?.maxAnnualFee}
            placeholder="e.g. best card for travel and cashback"
          />

          <div className="query-examples">
            {ASK_EXAMPLES.map((example) => (
              <Link key={example} className="query-chip" href={`/ask?query=${encodeURIComponent(example)}`}>
                {example}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ask-content">
        <div className="container content-grid">
          <div className="main-stack">
            {result && input?.query ? (
              <AnalyticsMount
                event={{
                  event_name: "ask_result_rendered",
                  page: "ask",
                  source: "ask",
                  query: input.query,
                  card_ids: result.cards.map((item) => item.card.id),
                  metadata: buildAskResultMetadata(result)
                }}
              />
            ) : null}
            {result && topCard ? (
              <>
                <article className="panel" id="answer">
                  <div className="answer-head">
                    <div>
                      <h2>{answerHeadTitle}</h2>
                      <p>{answerHeadSub}</p>
                      <div className="badge-row">
                        <span className="ask-badge">
                          {isRanked ? "Multiple results" : exactCardIntent ? "Exact card" : "Best fit"}
                        </span>
                        {topCard.card.bestFor[0] ? <span className="ask-badge gold">{topCard.card.bestFor[0]}</span> : null}
                        {isRanked ? (
                          <span className="ask-badge neutral">
                            {matchCount} card{matchCount === 1 ? "" : "s"} reviewed
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {isRanked ? (
                      <div className="fit-score">
                        <div>
                          <b>{matchCount}</b>
                          <span>matches</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="panel-body">
                    <p className="takeaway">
                      <strong>myCards take:</strong> {result.summary}
                    </p>

                    {visibleAnswerHighlights.length > 0 ? (
                      <ul className="detail-list answer-highlights">
                        {visibleAnswerHighlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    ) : null}

                    {linkedAlternativeCards.length > 0 ? (
                      <div className="answer-linked-alternatives">
                        <strong>
                          {linkedAlternativeCards.length === 1 ? "Closest alternative:" : "Closest alternatives:"}
                        </strong>{" "}
                        {linkedAlternativeCards.map((card, index) => (
                          <span key={card.id}>
                            <Link className="answer-inline-link" href={`/cards/${card.id}`}>
                              {card.name}
                            </Link>
                            {index < linkedAlternativeCards.length - 2
                              ? ", "
                              : index === linkedAlternativeCards.length - 2
                                ? " and "
                                : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {decisionCards.length > 1 ? (
                      <div className="decision-grid">
                        {decisionCards.map((decision) => (
                          <TrackedLink
                            key={decision.id}
                            analyticsEvent={{
                              event_name: "details_clicked",
                              page: "ask",
                              source: "ask",
                              query: input?.query,
                              card_id: decision.id
                            }}
                            className={`decision-card ${decision.tone}`}
                            href={`/cards/${decision.id}`}
                          >
                            <small>{decision.label}</small>
                            <h3>{decision.name}</h3>
                            <p>{decision.copy}</p>
                          </TrackedLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>

                {isRanked ? (
                  <>
                    <section className="panel">
                      <div className="panel-body">
                        <h2 className="section-title">Ranked matches</h2>
                        <div className="result-list">
                          {rankedResultCards.map((item, index) => (
                            <article className={`result-card${index === 0 ? " best" : ""}`} key={item.card.id}>
                              <div className="result-main">
                                <div className="rank">{index + 1}</div>
                                <div>
                                  <h3>{item.card.name}</h3>
                                  <p>{getCardUsp(item.card)}</p>
                                  <div className="result-meta">
                                    <span className="mini-tag">Fit {toFitPercent(item.fitScore)}/100</span>
                                    {item.card.bestFor[0] ? <span className="mini-tag">{item.card.bestFor[0]}</span> : null}
                                    <span className="mini-tag">
                                      {item.card.annualFee === 0 ? "Lifetime free" : `${formatCurrency(item.card.annualFee)} fee`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="result-actions">
                                <TrackedLink
                                  analyticsEvent={{
                                    event_name: "details_clicked",
                                    page: "ask",
                                    source: "ask",
                                    query: input?.query,
                                    card_id: item.card.id
                                  }}
                                  className="mini-btn primary"
                                  href={`/cards/${item.card.id}`}
                                >
                                  View details
                                </TrackedLink>
                                <TrackedExternalLink
                                  analyticsEvent={{
                                    event_name: "apply_clicked",
                                    page: "ask",
                                    source: "ask",
                                    query: input?.query,
                                    card_id: item.card.id
                                  }}
                                  className="mini-btn"
                                  href={item.card.applyUrl}
                                  rel="nofollow sponsored"
                                  target="_blank"
                                >
                                  Apply
                                </TrackedExternalLink>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="panel">
                      <div className="panel-body">
                        <h2 className="section-title">Compare the top matches</h2>
                        <div className="table-wrap">
                          <table className="compare-table compare-table--wide">
                            <thead>
                              <tr>
                                <th>Feature</th>
                                {comparisonCards.map((item) => (
                                  <th key={`compare-head-${item.card.id}`}>{item.card.name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Best for</td>
                                {comparisonCards.map((item) => (
                                  <td key={`best-for-${item.card.id}`}>{item.card.bestFor.slice(0, 3).join(", ") || "-"}</td>
                                ))}
                              </tr>
                              <tr>
                                <td>Reward rates</td>
                                {comparisonCards.map((item) => (
                                  <td key={`reward-rates-${item.card.id}`}>
                                    <div className="compare-rate-summary">
                                      {buildRewardRateSummary(item.card).map((line) => (
                                        <div key={`${item.card.id}-${line}`}>{line}</div>
                                      ))}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                <td>Annual fee</td>
                                {comparisonCards.map((item) => (
                                  <td key={`annual-fee-${item.card.id}`}>{formatCurrency(item.card.annualFee)}</td>
                                ))}
                              </tr>
                              {showFeeWaiverRow ? (
                                <tr>
                                  <td>Fee waiver spend</td>
                                  {comparisonCards.map((item) => (
                                    <td key={`fee-waiver-${item.card.id}`}>
                                      {hasFeeWaiverSpend(item.card.feeWaiverSpend)
                                        ? formatFeeWaiverSpend(item.card.feeWaiverSpend)
                                        : "-"}
                                    </td>
                                  ))}
                                </tr>
                              ) : null}
                              <tr>
                                <td>Domestic lounge</td>
                                {comparisonCards.map((item) => (
                                  <td key={`lounge-domestic-${item.card.id}`}>{formatLoungeValue(item.card.loungeDomestic)}</td>
                                ))}
                              </tr>
                              <tr>
                                <td>International lounge</td>
                                {comparisonCards.map((item) => (
                                  <td key={`lounge-international-${item.card.id}`}>
                                    {formatLoungeValue(item.card.loungeInternational)}
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                <td>Forex markup</td>
                                {comparisonCards.map((item) => (
                                  <td key={`forex-${item.card.id}`}>{item.card.forexMarkup}%</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="panel">
                    <div className="panel-body">
                      <h2 className="section-title">Card snapshot</h2>
                      <div className="stats answer-stats">
                        <div className="stat">
                          <strong>Rs {topCard.estimatedAnnualFee.toLocaleString("en-IN")}</strong>
                          <span>Effective annual fee</span>
                        </div>
                        {topCard.card.combinedLoungeAccess !== undefined ? (
                          <div className="stat">
                            <strong>
                              {getTotalLoungeAccess(topCard.card) === "unlimited" ? "Unlimited" : getTotalLoungeAccess(topCard.card)}
                            </strong>
                            <span className="stat-label">
                              {topCard.card.combinedLoungeAccessLabel ?? "Lounge access"}
                              <LoungeInfo
                                items={getLoungeConditions(topCard.card)}
                                label={`${topCard.card.combinedLoungeAccessLabel ?? "Lounge access"} conditions`}
                              />
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="stat">
                              <strong>{topCard.card.loungeDomestic === "unlimited" ? "Unlimited" : topCard.card.loungeDomestic}</strong>
                              <span className="stat-label">
                                Domestic lounge
                                <LoungeInfo items={domesticLoungeConditions} label="Domestic lounge conditions" />
                              </span>
                            </div>
                            <div className="stat">
                              <strong>
                                {topCard.card.loungeInternational === "unlimited" ? "Unlimited" : topCard.card.loungeInternational}
                              </strong>
                              <span className="stat-label">
                                International lounge
                                <LoungeInfo items={internationalLoungeConditions} label="International lounge conditions" />
                              </span>
                            </div>
                          </>
                        )}
                        <div className="stat">
                          <strong>{topCard.card.forexMarkup}%</strong>
                          <span>Forex markup</span>
                        </div>
                      </div>

                      {topCard.card.rewards.length ? (
                        <section className="detail-section">
                          <h2>Rewards</h2>
                          <div className="table-wrap">
                            <table className="compare-table compare-table--wide">
                              <thead>
                                <tr>
                                  <th>Category</th>
                                  <th>Rate</th>
                                  {hasDailyCap && <th className="cap-column">Daily cap</th>}
                                  {hasMonthlyCap && <th className="cap-column">Monthly cap</th>}
                                  {hasStatementQuarterCap && <th className="cap-column">Statement quarter cap</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {topCard.card.rewards.map((reward) => (
                                  <tr key={`${topCard.card.id}-${reward.category}-${reward.displayCategory ?? ""}`}>
                                    <td>{reward.displayCategory ?? reward.category}</td>
                                    <td>{formatRewardRate(reward, topCard.card.rewardType)}</td>
                                    {hasDailyCap && <td className="cap-column">{formatRewardCap(reward.capDaily, topCard.card.rewardType)}</td>}
                                    {hasMonthlyCap && <td className="cap-column">{formatRewardCap(reward.capMonthly, topCard.card.rewardType)}</td>}
                                    {hasStatementQuarterCap && (
                                      <td className="cap-column">{formatStatementQuarterCap(reward.capStatementQuarter)}</td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      ) : null}

                      {topCard.card.milestoneBenefits?.length ? (
                        <section className="detail-section">
                          <h2>Milestone benefits</h2>
                          <ul className="detail-list">
                            {topCard.card.milestoneBenefits.map((benefit) => (
                              <li key={benefit}>{stripScoringAnnotations(benefit)}</li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      <div className="actions answer-actions">
                        <TrackedLink
                          analyticsEvent={{
                            event_name: "details_clicked",
                            page: "ask",
                            source: "ask",
                            query: input?.query,
                            card_id: topCard.card.id
                          }}
                          className="button secondary"
                          href={`/cards/${topCard.card.id}`}
                        >
                          More details
                        </TrackedLink>
                        <TrackedExternalLink
                          analyticsEvent={{
                            event_name: "apply_clicked",
                            page: "ask",
                            source: "ask",
                            query: input?.query,
                            card_id: topCard.card.id
                          }}
                          className="button"
                          href={topCard.card.applyUrl}
                          rel="nofollow sponsored"
                          target="_blank"
                        >
                          Apply
                        </TrackedExternalLink>
                      </div>
                    </div>
                  </section>
                )}

                {isRanked ? (
                <section className="panel">
                  <div className="panel-body">
                    <h2 className="section-title">Need more precision?</h2>
                    <div className="clarify-box">
                      <article className="clarify-card">
                        <h3>What matters more?</h3>
                        <p>Pick one so myCards can rank more accurately.</p>
                        <div className="clarify-options">
                          {MATTER_CHIPS.map((chip) => (
                            <Link
                              key={chip}
                              className="option-chip"
                              href={`/ask?query=${encodeURIComponent(`${queryStem} for ${chip.toLowerCase()}`)}`}
                            >
                              {chip}
                            </Link>
                          ))}
                        </div>
                      </article>

                      <article className="clarify-card">
                        <h3>What is your monthly spend?</h3>
                        <p>Spend level changes whether premium cards are worth the fee.</p>
                        <div className="clarify-options">
                          {SPEND_CHIPS.map((chip) => (
                            <Link key={chip.label} className="option-chip" href={chip.href}>
                              {chip.label}
                            </Link>
                          ))}
                        </div>
                      </article>
                    </div>
                  </div>
                </section>
                ) : null}

                {input?.query ? (
                  <section className="panel">
                    <div className="panel-body">
                      <AskFeedback
                        cardIds={result.cards.map((item) => item.card.id)}
                        input={input}
                        query={input.query}
                        returnAnchor="answer"
                        returnTo={returnTo}
                        savedFeedback={savedFeedback}
                        summary={result.summary}
                      />
                      {feedbackError ? (
                        <p className="notice" style={{ margin: "12px 0 0" }}>
                          Feedback could not be saved on the server.
                        </p>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </>
            ) : result ? (
              <section className="panel">
                <div className="panel-body">
                  <h2 className="section-title">No confident match</h2>
                  <div className="empty-state">
                    <h3>We could not answer this confidently.</h3>
                    <p>
                      {result.summary ||
                        "Try rephrasing — mention a use case like “cashback” or “lounge access” — or browse all cards below."}
                    </p>
                    <Link className="btn btn-primary" href="/finder">
                      Browse all cards →
                    </Link>
                  </div>
                  <div className="grid cards" style={{ marginTop: 20 }}>
                    {scoreCards({ query: "best overall" }).slice(0, 2).map((score) => (
                      <CardTile key={score.card.id} score={score} />
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <section className="panel">
                <div className="panel-body">
                  <div className="empty-state">
                    <h3>Ask your first question.</h3>
                    <p>Type a question above and myCards will return a grounded answer from verified card data.</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="side-stack ask-sticky">
            {result && topCard ? (
              <section className="sidebar-card">
                <h3 className="side-title">Next steps</h3>
                <div className="sidebar-actions">
                  <Link className="mini-btn primary" href="/compare">
                    Compare cards
                  </Link>
                  <Link className="mini-btn" href="/finder">
                    Browse all cards
                  </Link>
                </div>
                <p className="source-note">
                  Grounded in verified card data. Apply links may be affiliate links — we may earn a commission at no extra cost
                  to you.
                </p>
              </section>
            ) : null}

            <section className="sidebar-card ask-again">
              <h3 className="side-title">Ask a follow-up</h3>
              <AskQueryForm
                ariaLabel="Ask a follow-up credit card question"
                buttonLabel="Ask follow-up →"
                multiline
                placeholder="Example: I spend Rs 60k/month and travel twice a year. Which one should I choose?"
              />
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
