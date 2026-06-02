import Link from "next/link";
import AskBox from "../ui/AskBox";
import LoungeInfo from "../ui/LoungeInfo";
import AskFeedback from "../ui/AskFeedback";
import CardTile from "../ui/CardTile";
import { answerQuestion } from "@/lib/ask-ai";
import { getCardById } from "@/lib/cards";
import { getLoungeConditions, getTotalLoungeAccess } from "@/lib/lounge";
import { stripScoringAnnotations } from "@/lib/card-index";
import { scoreCards } from "@/lib/recommend";
import type { CreditCard, RecommendationInput } from "@/lib/types";

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

function getCardUsp(card: CreditCard): string {
  // Curated USPs for popular cards
  const curated: Record<string, string> = {
    "hdfc-infinia-metal": "Super-premium card offering 5X rewards (up to 33.3% value) on SmartBuy flight/hotel bookings, unlimited lounge access, and premium golf privileges.",
    "sbi-cashback": "The industry benchmark for cashback, offering flat 5% cashback on all online spends (capped at Rs 5,000/month) and 1% on offline transactions.",
    "axis-atlas": "A premier travel card earning EDGE Miles that transfer at highly lucrative ratios (up to 1:2) to airline and hotel partners, with tiered milestone benefits.",
    "indusind-tiger": "Lifetime-free travel card featuring a low 1.5% forex markup, complimentary lounge access, and quarterly golf privileges.",
    "indusind-legend": "Lifetime-free premium card with weekday/weekend reward structures, discounted 1.8% forex markup, and complimentary quarterly golf privileges.",
    "amex-platinum-travel": "Highly rewarding milestone card offering up to 40,000 bonus points and a Rs 10,000 Taj stay voucher on reaching Rs 4 Lakhs in annual spends.",
    "hsbc-travelone": "A versatile travel companion featuring a low 1.75% forex markup, complimentary lounge access, and instant points transfers to airline and hotel partners.",
    "yes-bank-marquee": "Super-premium card offering 2.2% reward rate on online spends, unlimited lounge access, low 1.75% forex markup, and a generous welcome bonus.",
    "amazon-pay-icici": "Lifetime-free card offering unlimited 5% cashback on Amazon India for Prime members and 1.5% to 2% on partner spends.",
    "axis-fk": "Co-branded cashback card offering unlimited 4% cashback on Flipkart spends and 1.5% flat cashback on all other eligible spends."
  };

  if (curated[card.id]) {
    return curated[card.id];
  }

  // Dynamic fallback generation
  const isLtf = card.joiningFee === 0 && card.annualFee === 0;
  const ltfText = isLtf ? "Lifetime free card" : "";
  const bestForText = card.bestFor.length > 0 ? `Optimized for ${card.bestFor.slice(0, 2).join(" and ")}` : "";
  
  const features: string[] = [];
  if (card.forexMarkup <= 2) {
    features.push(`low ${card.forexMarkup}% forex markup`);
  }
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") {
    features.push("unlimited airport lounge access");
  } else if (card.loungeDomestic > 0) {
    features.push(`complimentary lounge access`);
  }

  const featuresText = features.length > 0 ? `featuring ${features.join(" and ")}` : "";

  const summary = [ltfText, bestForText, featuresText].filter(Boolean).join(", ").replace(/,\s*,/g, ",").trim();
  return summary ? summary + "." : "High-value rewards credit card.";
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
  const showRankedAnswer = topCardsQuery || result?.displayMode === "ranked-list";
  const topCard = result?.cards[0];
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
  const linkedAlternativeCardIds = new Set(linkedAlternativeCards.map((card) => card.id));
  const alternativeCards = (showRankedAnswer ? result?.cards.slice(3) ?? [] : result?.cards.slice(1) ?? [])
    .filter((item) => !mainAnswerCardIds.has(item.card.id) && !linkedAlternativeCardIds.has(item.card.id))
    .slice(0, 2);
  const answerHighlights = (result?.highlights ?? []).filter((highlight) => {
    if (/^Closest alternative/i.test(highlight) || /^Closest alternatives/i.test(highlight)) return false;
    if (showRankedAnswer && /^#\d+:/i.test(highlight)) return false;
    return true;
  });
  const spendScenarioRows = showRankedAnswer ? topCardsScenarioRows(answerHighlights) : [];
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

  return (
    <section className="section">
      <div className="page-title">
        <h1>Ask Card AI</h1>
        <p>Get answers grounded in verified Indian credit card data.</p>
      </div>

      <div className="detail-layout ask-layout" style={{ marginTop: 18 }}>
        <div className="detail-main">
          {result ? (
            <div className="results" id="answer">
              <div className="panel card answer-card">
                <div className="meta answer-meta">
                  <span>Answer</span>
                  {input?.query ? <span className="badge">Query: {input.query}</span> : null}
                </div>
                <p className="answer-summary">{result.summary}</p>
                {visibleAnswerHighlights.length > 0 ? (
                  <ul className="detail-list answer-highlights">
                    {visibleAnswerHighlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                ) : null}
                {linkedAlternativeCards.length > 0 ? (
                  <div className="answer-linked-alternatives">
                    <strong>{linkedAlternativeCards.length === 1 ? "Closest alternative:" : "Closest alternatives:"}</strong>{" "}
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
                {rankedResultCards.length > 0 ? (
                  <div className="answer-ranked-list" aria-label="Top picks">
                    {rankedResultCards.map((item, index) => (
                      <article className="answer-ranked-item" key={item.card.id}>
                        <div className="answer-ranked-copy">
                          <div className="answer-ranked-meta">
                            <span className="badge">#{index + 1}</span>
                            <span>{item.card.issuer}</span>
                          </div>
                          <h2 className="answer-ranked-title">{item.card.name}</h2>
                          <p className="answer-ranked-usp">{getCardUsp(item.card)}</p>
                        </div>
                        <div className="actions answer-ranked-actions">
                          <Link className="button secondary" href={`/cards/${item.card.id}`}>
                            Details
                          </Link>
                          <a className="button" href={item.card.applyUrl} rel="nofollow sponsored" target="_blank">
                            Apply
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
                {showRankedAnswer && rankedResultCards.length > 0 ? (
                  <section className="detail-section">
                    <h2>Quick comparison</h2>
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
                              <td key={`lounge-international-${item.card.id}`}>{formatLoungeValue(item.card.loungeInternational)}</td>
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
                  </section>
                ) : null}
                {/* Hidden as requested: How This Changes by Spend
                {topCardsQuery && spendScenarioRows.length > 0 ? (
                  <section className="detail-section">
                    <h2>How This Changes by Spend</h2>
                    <div className="table-wrap">
                      <table className="compare-table compare-table--wide">
                        <thead>
                          <tr>
                            <th>Yearly spend</th>
                            <th>Best card on balanced mix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spendScenarioRows.map((row) => (
                            <tr key={`${row.spendLabel}-${row.cardName}`}>
                              <td>{row.spendLabel}</td>
                              <td>{row.cardName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}
                */}
                {!showRankedAnswer && topCard ? (
                  <div className="stats answer-stats">
                    <div className="stat">
                      <strong>Rs {topCard.estimatedAnnualFee.toLocaleString("en-IN")}</strong>
                      <span>Effective annual fee</span>
                    </div>
                    {topCard.card.combinedLoungeAccess !== undefined ? (
                      <div className="stat">
                        <strong>{getTotalLoungeAccess(topCard.card) === "unlimited" ? "Unlimited" : getTotalLoungeAccess(topCard.card)}</strong>
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
                ) : null}
                {!showRankedAnswer && topCard?.card.rewards.length ? (
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
                {!showRankedAnswer && topCard?.card.milestoneBenefits?.length ? (
                  <section className="detail-section">
                    <h2>Milestone benefits</h2>
                    <ul className="detail-list">
                      {topCard.card.milestoneBenefits.map((benefit) => (
                        <li key={benefit}>{stripScoringAnnotations(benefit)}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {!showRankedAnswer && topCard ? (
                  <div className="actions answer-actions">
                    <Link className="button secondary" href={`/cards/${topCard.card.id}`}>
                      More details
                    </Link>
                    <a className="button" href={topCard.card.applyUrl} rel="nofollow sponsored" target="_blank">
                      Apply
                    </a>
                  </div>
                ) : null}
                {input?.query ? (
                  <>
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
                      <p className="notice" style={{ margin: 0 }}>
                        Feedback could not be saved on the server.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>

              {!topCard ? (
                <div className="panel card">
                  <p style={{ margin: "0 0 16px" }}>
                    We couldn&apos;t find a specific card match for this question in our database yet.
                  </p>
                  <p className="muted" style={{ margin: "0 0 20px" }}>
                    Try rephrasing — for example, mention a use case like &ldquo;cashback&rdquo; or &ldquo;lounge access&rdquo; — or browse all cards below.
                  </p>
                  <Link className="button secondary" href="/finder">Browse all cards</Link>
                  <div className="grid cards" style={{ marginTop: 24 }}>
                    {scoreCards({ query: "best overall" }).slice(0, 2).map((score) => (
                      <CardTile key={score.card.id} score={score} />
                    ))}
                  </div>
                </div>
              ) : null}

              {alternativeCards.length ? (
                <section className="result-group">
                  <div className="section-head ask-section-head">
                    <div>
                      <h2>Alternatives</h2>
                      <p>Nearby options worth comparing.</p>
                    </div>
                  </div>

                  <div className="grid cards">
                    {alternativeCards.map((item) => (
                      <article className="panel card result-card result-card-compact" key={item.card.id}>
                        <div>
                          <div className="meta">
                            <span>{item.card.issuer}</span>
                            <span>Fit score {Math.round(item.fitScore).toLocaleString("en-IN")}</span>
                          </div>
                          <h3 style={{ marginTop: 6 }}>{item.card.name}</h3>
                        </div>

                        <div className="meta">
                          <span>
                            Rs {item.estimatedAnnualRewards.toLocaleString("en-IN")} rewards{" "}
                            {accorRedemptionNote(item.card)}
                          </span>
                          <span>Rs {item.estimatedAnnualFee.toLocaleString("en-IN")} fee</span>
                        </div>

                        <ul className="detail-list">
                          {item.reasons.slice(0, 3).map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>

                        <div className="actions">
                          <Link className="button secondary" href={`/cards/${item.card.id}`}>
                            View details
                          </Link>
                          <a className="button" href={item.card.applyUrl} rel="nofollow sponsored" target="_blank">
                            Apply
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="panel card" style={{ marginTop: 18 }}>
              <p className="muted" style={{ margin: 0 }}>
                Ask a question and we will return a grounded answer from our verified card data.
              </p>
            </div>
          )}

        </div>

        <aside className="detail-aside ask-aside">
          <AskBox
            defaultMaxAnnualFee={input?.maxAnnualFee}
            defaultQuery={input?.query ?? params.query ?? ""}
            showHelperText={false}
          />
        </aside>
      </div>
    </section>
  );
}
