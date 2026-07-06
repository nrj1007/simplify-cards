"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreditCard, RecommendationInput } from "@/lib/types";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";
import { getCardShortUsp, getCardUsp } from "@/lib/card-usp";
import { cardRewardTypeIncludesCashback } from "@/lib/reward-type";
import { TrackedExternalLink, TrackedLink } from "../ui/TrackedLink";
import AskFeedback from "../ui/AskFeedback";
import { getLoungeConditions } from "@/lib/lounge";
import LoungeInfo from "../ui/LoungeInfo";

export type ScoredCardItem = {
  card: CreditCard;
  fitScore: number;
  reasons: string[];
};

type ScoredCardSection = {
  title: string;
  cards: ScoredCardItem[];
};

type Props = {
  query: string;
  displayedMatchCount: number;
  cards: ScoredCardItem[];
  sections?: ScoredCardSection[] | undefined;
  summary: string;
  input: RecommendationInput;
  savedFeedback?: "up" | "down" | null | undefined;
  feedbackError?: boolean;
  returnTo: string;
};

const MATTER_CHIPS = ["Travel", "Cashback", "Lounge access", "Low annual fee"];
const SPEND_CHIPS = [
  { label: "Under Rs 25k", querySuffix: "under rs 25k" },
  { label: "Rs 25k-75k", querySuffix: "rs 25k-75k" },
  { label: "Rs 75k+", querySuffix: "rs 75k+" }
] as const;

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not listed";
  if (value === 0) return "Lifetime free";
  return `Rs ${value.toLocaleString("en-IN")} fee`;
}

function formatRupees(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not listed";
  if (value === 0) return "Lifetime free";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatRewardCap(value: number | null | undefined, rewardType: string) {
  if (!value) return "-";
  return `${value.toLocaleString("en-IN")} ${rewardType}`;
}

function stripScoringAnnotations(benefit: string): string {
  return benefit.replace(/\s*\((?:vouchers?\s+)?worth Rs[^)]+\)/gi, "").trim();
}

function listPreview(items: string[] | undefined, count = 4) {
  if (!items || items.length === 0) return "Not listed";
  return items.slice(0, count).map(stripScoringAnnotations).join(", ");
}

function milestoneSummary(card: CreditCard) {
  return listPreview(card.milestoneBenefits, 4);
}

function hasFeeWaiverSpend(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
}

function loungeValue(value: CreditCard["loungeDomestic"] | CreditCard["loungeInternational"]) {
  return value === "unlimited" ? "Unlimited" : `${value}`;
}

function rewardRateLabel(card: CreditCard, reward: CreditCard["rewards"][number]) {
  if (reward.displayRate) return reward.displayRate;

  const rewardType = card.rewardType.toLowerCase();
  if (rewardType.includes("point") || rewardType.includes("mile")) {
    return `${reward.rate} ${card.rewardType} / Rs 100`;
  }

  return `${reward.rate}%`;
}

function rewardSummary(card: CreditCard) {
  const items = card.rewards
    .filter((reward) => !reward.hidden)
    .slice(0, 3)
    .map((reward) => `${reward.displayCategory ?? reward.category}: ${rewardRateLabel(card, reward)}`);

  if (items.length === 0) return "Not listed";

  return (
    <>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {item}
          {idx < items.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

function smartbuyCapSummary(card: CreditCard) {
  const smartbuyRewards = card.rewards.filter((reward) => reward.category.includes("smartbuy"));
  if (smartbuyRewards.length === 0) return "Not listed";

  const caps = smartbuyRewards.map((reward) => {
    const parts = [];
    if (reward.capDaily) parts.push(`daily ${formatRewardCap(reward.capDaily, card.rewardType)}`);
    if (reward.capMonthly) parts.push(`monthly ${formatRewardCap(reward.capMonthly, card.rewardType)}`);
    return `${reward.category}: ${parts.length ? parts.join(", ") : "no cap listed"}`;
  });

  return caps.join("; ");
}

function redemptionSummary(card: CreditCard) {
  if (!card.redemption) return "Not listed";

  const parts: string[] = [];
  if (typeof card.redemption.smartBuyFlightHotelValue === "number") {
    parts.push(`SmartBuy travel: upto Rs ${card.redemption.smartBuyFlightHotelValue} per point`);
  }
  if (typeof card.redemption.travelEdgeValue === "number") {
    parts.push(`Travel EDGE travel: upto Rs ${card.redemption.travelEdgeValue} per point`);
  }
  if (typeof card.redemption.travelPortalValue === "number") {
    parts.push(`Travel portal: upto Rs ${card.redemption.travelPortalValue} per point`);
  }
  if (typeof card.redemption.airMilesValue === "number") {
    parts.push(`Air miles: upto Rs ${card.redemption.airMilesValue} per point`);
  }
  if (typeof card.redemption.statementBalanceValue === "number") {
    parts.push(`Statement credit: upto Rs ${card.redemption.statementBalanceValue} per point`);
  }

  return parts.length ? parts.join("; ") : "Not listed";
}

function getCardVisualClass(card: CreditCard, index: number) {
  const id = card.id.toLowerCase();
  if (id.includes("premier")) return "sc-card-visual-premier";
  if (id.includes("magnus")) return "sc-card-visual-magnus";
  if (id.includes("marquee") || id.includes("white")) return "sc-card-visual-marquee";
  if (index === 0) return "sc-card-visual-premier";
  if (index === 1) return "sc-card-visual-magnus";
  return "sc-card-visual-marquee";
}

function getTopCardBenefit(card: CreditCard): string {
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") {
    return "Unlimited lounge";
  }
  if (card.feeWaiverSpend && card.feeWaiverSpend > 0) {
    const lakhs = card.feeWaiverSpend / 100000;
    const formatted = Number.isInteger(lakhs) ? `${lakhs}` : lakhs.toFixed(1);
    return `Rs ${formatted}L waiver`;
  }
  if (card.bestFor && card.bestFor[0]) {
    return card.bestFor[0];
  }
  return "Premium rewards";
}

export default function AskResultsClient({
  query,
  displayedMatchCount,
  cards,
  sections = [],
  summary,
  input,
  savedFeedback,
  feedbackError,
  returnTo
}: Props) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [pulsing, setPulsing] = useState(false);
  const [emailName, setEmailName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isCompareSectionVisible, setIsCompareSectionVisible] = useState(false);

  const topFitRaw = cards[0]?.fitScore ?? 0;
  const toFitPercent = (score: number) =>
    topFitRaw > 0 ? Math.max(1, Math.min(100, Math.round((score / topFitRaw) * 100))) : 100;

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => setIsHydrated(true), 0);

    const compareSection = document.getElementById("compare-section");
    if (!compareSection) return () => window.clearTimeout(hydrationTimer);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCompareSectionVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(compareSection);

    return () => {
      window.clearTimeout(hydrationTimer);
      observer.disconnect();
    };
  }, []);

  const cashbackSection = sections.find((section) => /cashback/i.test(section.title));
  const rewardSection = sections.find((section) => /reward/i.test(section.title));

  // Prefer the server's split/blend sections. Falling back keeps non-split answers working.
  const cashbackCards = cashbackSection?.cards ?? cards.filter((c) => cardRewardTypeIncludesCashback(c.card));
  const rewardCards = rewardSection?.cards ?? cards.filter((c) => !cardRewardTypeIncludesCashback(c.card));

  let topPickItem: ScoredCardItem | undefined = undefined;
  let strongAlternativeItem: ScoredCardItem | undefined = undefined;
  let alsoWorthALookItem: ScoredCardItem | undefined = undefined;

  if (cashbackCards.length > 0 && rewardCards.length === 0) {
    topPickItem = cashbackCards[0];
    strongAlternativeItem = cashbackCards[1];
    alsoWorthALookItem = cashbackCards[2];
  } else if (rewardCards.length > 0 && cashbackCards.length === 0) {
    topPickItem = rewardCards[0];
    strongAlternativeItem = rewardCards[1];
    alsoWorthALookItem = rewardCards[2];
  } else if (cashbackCards.length >= 1) {
    topPickItem = cashbackCards[0];
    strongAlternativeItem = rewardCards[0];
    if (cashbackCards.length >= 2) {
      alsoWorthALookItem = cashbackCards[1];
    } else {
      alsoWorthALookItem = rewardCards[1];
    }
  } else {
    topPickItem = rewardCards[0];
    strongAlternativeItem = rewardCards[1];
    alsoWorthALookItem = rewardCards[2];
  }

  const topPicksData = [
    {
      heading: "Top pick",
      headingClass: "sc-top-pick",
      tone: "good",
      item: topPickItem
    },
    {
      heading: "Strong alternative",
      headingClass: "sc-strong-alternative",
      tone: "warn",
      item: strongAlternativeItem
    },
    {
      heading: "Also worth a look",
      headingClass: "sc-also-worth",
      tone: "skip",
      item: alsoWorthALookItem
    }
  ].filter((p): p is { heading: string; headingClass: string; tone: string; item: ScoredCardItem } => Boolean(p.item));

  const rankedResultCards = [...cashbackCards, ...rewardCards].filter(
    (item, index, list) => list.findIndex((candidate) => candidate.card.id === item.card.id) === index
  );
  const allResultCards = [...cards, ...rankedResultCards].filter(
    (item, index, list) => list.findIndex((candidate) => candidate.card.id === item.card.id) === index
  );

  const getFlatIndex = (cardId: string) => cards.findIndex((c) => c.card.id === cardId);
  const getDisplayRank = (cardId: string) => {
    const cashbackIndex = cashbackCards.findIndex((c) => c.card.id === cardId);
    if (cashbackIndex >= 0) return cashbackIndex + 1;
    const rewardIndex = rewardCards.findIndex((c) => c.card.id === cardId);
    if (rewardIndex >= 0) return rewardIndex + 1;
    const flatIndex = getFlatIndex(cardId);
    return flatIndex >= 0 ? flatIndex + 1 : 0;
  };

  const getPickLabel = (cardId: string) => {
    const pick = topPicksData.find((p) => p.item.card.id === cardId);
    return pick ? pick.heading : null;
  };

  const getResultPickClass = (cardId: string) => {
    const pick = topPicksData.find((p) => p.item.card.id === cardId);
    if (!pick) return "";
    if (pick.heading === "Top pick") return " sc-result-top-pick best";
    if (pick.heading === "Strong alternative") return " sc-result-strong-alt";
    if (pick.heading === "Also worth a look") return " sc-result-also-look";
    return "";
  };

  const toggleCompare = (cardId: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= 3) {
        setPulsing(true);
        setTimeout(() => setPulsing(false), 800);
        return prev;
      }
      return [...prev, cardId];
    });
  };

  const selectedCards = selectedCardIds
    .map((id) => allResultCards.find((c) => c.card.id === id))
    .filter((c): c is ScoredCardItem => Boolean(c));

  const showFeeWaiverRow = selectedCards.some((item) => hasFeeWaiverSpend(item.card.feeWaiverSpend));

  const isSpendEnvelopeReason = (entry: string) => /^Best at /i.test(entry) || /^Needs high spend\b/i.test(entry);

  const handleCardClick = (cardId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking interactive elements inside card
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    router.push(`/cards/${cardId}`);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailId) return;
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
  };

  return (
    <>
      <div className="main-stack">
        {/* Top Answer Box */}
        <article className="panel" id="answer">
          <div className="answer-head">
            <div>
              <h2>
                <span className="sc-inline-brand">
                  <b>Simplify</b>Cards
                </span>{" "}
                <span className="sc-answer-heading-copy">found </span>
                <span className="sc-purple-number">{displayedMatchCount}</span>
                <span className="sc-answer-heading-copy"> relevant cards</span>
              </h2>
              <p>Ranked by what matters to you, not to us</p>
            </div>
          </div>

          <div className="panel-body">
            {topPicksData.length > 0 && (
              <div className="decision-grid sc-landing-picks">
                {topPicksData.map(({ heading, headingClass, tone, item }, idx) => {
                  const card = item.card;
                  const cardTypeLabel = cardRewardTypeIncludesCashback(card) ? "Cashback Card" : "Reward Card";
                  const feeDisplay = card.annualFee === 0 ? "Rs 0 fee" : `Rs ${card.annualFee.toLocaleString("en-IN")} fee`;
                  const benefitDisplay = getTopCardBenefit(card);
                  const reason = item.reasons.find(
                    (entry) => !/^Strong card-name match/i.test(entry) && !/^Matches /i.test(entry) && !isSpendEnvelopeReason(entry)
                  );
                  const hasSpendEnvelopeReason = item.reasons.some(isSpendEnvelopeReason);
                  const descCopy = reason ?? (hasSpendEnvelopeReason ? getCardShortUsp(card) : getCardUsp(card));

                  return (
                    <article
                      key={card.id}
                      className={`decision-card sc-landing-pick-card ${tone}`}
                      data-details-url={`/cards/${card.id}`}
                      onClick={(e) => handleCardClick(card.id, e)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/cards/${card.id}`);
                        }
                      }}
                    >
                      <div className={`sc-main-pick-heading ${headingClass}`}>{heading}</div>
                      <div className={`sc-card-visual ${getCardVisualClass(card, idx)}`}>
                        <span className="sc-card-type-inline sc-top-card-type sc-card-type-corner">
                          {cardTypeLabel}
                        </span>
                        <span className="sc-card-issuer">{card.issuer.toUpperCase()}</span>
                        <h3>
                          <span className="sc-top-card-name">{card.name}</span>
                        </h3>
                      </div>
                      <div className="sc-pick-body">
                        <p>{descCopy}</p>
                        <div className="sc-pick-tags">
                          <span>{feeDisplay}</span>
                          <span>{benefitDisplay}</span>
                        </div>
                        <Link
                          className="sc-top-more-details"
                          href={`/cards/${card.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Click for more details →
                        </Link>
                        <TrackedExternalLink
                          analyticsEvent={{
                            event_name: "apply_clicked",
                            page: "ask",
                            source: "ask",
                            query,
                            card_id: card.id
                          }}
                          className="sc-official-btn"
                          href={cardCtaHref(card)}
                          rel={cardCtaRel(card)}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cardCtaLabel(card)}
                        </TrackedExternalLink>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </article>

        {/* Results Section */}
        <section className="panel sc-results-panel">
          <div className="panel-body">
            <div aria-label="Result view options" className="sc-result-view-toggle">
              <div className="sc-result-heading-left">
                <h3>
                  All <span className="sc-purple-number">{displayedMatchCount}</span> matching cards
                </h3>
              </div>
            </div>

            <div className="sc-results-combined-view">
              {/* Cashback Cards Category */}
              {cashbackCards.length > 0 && (
                <section className="sc-results-category sc-results-category-cashback">
                  <div className="sc-results-category-head">
                    <h3>Cashback Cards</h3>
                    <span className="sc-results-category-count">
                      {cashbackCards.length} card{cashbackCards.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="result-list">
                    {cashbackCards.map((item) => {
                      const card = item.card;
                      const rank = getDisplayRank(card.id);
                      const isSelected = selectedCardIds.includes(card.id);
                      const pickLabel = getPickLabel(card.id);
                      const pickClass = getResultPickClass(card.id);

                      return (
                        <article
                          key={card.id}
                          className={`result-card sc-clickable-result-card${pickClass}`}
                          data-details-url={`/cards/${card.id}`}
                          onClick={(e) => handleCardClick(card.id, e)}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(`/cards/${card.id}`);
                            }
                          }}
                        >
                          <div className="result-main">
                            <div>
                              <div className="sc-result-kicker">
                                <div className="rank">{rank}</div>
                                <span className="sc-result-bank">{card.issuer}</span>
                              </div>
                              <h3 className="sc-result-title-row">
                                <span className="sc-result-card-name">{card.name}</span>
                                {pickLabel && (
                                  <span className="sc-result-pick-label sc-result-pick-inline">
                                    {pickLabel}
                                  </span>
                                )}
                              </h3>
                              <p>{getCardUsp(card)}</p>
                              <div className="result-meta">
                                <span className="mini-tag">Fit {toFitPercent(item.fitScore)}/100</span>
                                {card.bestFor[0] ? <span className="mini-tag">{card.bestFor[0]}</span> : null}
                                <span className="mini-tag">
                                  {card.annualFee === 0 ? "Lifetime free" : `Rs ${card.annualFee.toLocaleString("en-IN")} fee`}
                                </span>
                              </div>
                              <Link
                                className="sc-more-details"
                                href={`/cards/${card.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Click for more details →
                              </Link>
                            </div>
                          </div>
                          <div className="result-actions">
                            <button
                              className={`mini-btn sc-compare-btn${isSelected ? " is-selected" : ""}${!isSelected && selectedCardIds.length >= 3 ? " is-maxed" : ""}`}
                              disabled={!isHydrated}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isHydrated) return;
                                toggleCompare(card.id);
                              }}
                            >
                              {!isHydrated ? "Loading compare" : isSelected ? "Added to compare" : "Add to compare"}
                            </button>
                            <TrackedExternalLink
                              analyticsEvent={{
                                event_name: "apply_clicked",
                                page: "ask",
                                source: "ask",
                                query,
                                card_id: card.id
                              }}
                              className="mini-btn primary sc-apply-btn"
                              href={cardCtaHref(card)}
                              rel={cardCtaRel(card)}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {cardCtaLabel(card)}
                            </TrackedExternalLink>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Reward Cards Category */}
              {rewardCards.length > 0 && (
                <section className="sc-results-category sc-results-category-reward">
                  <div className="sc-results-category-head">
                    <h3>Reward Cards</h3>
                    <span className="sc-results-category-count">
                      {rewardCards.length} card{rewardCards.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="result-list">
                    {rewardCards.map((item) => {
                      const card = item.card;
                      const rank = getDisplayRank(card.id);
                      const isSelected = selectedCardIds.includes(card.id);
                      const pickLabel = getPickLabel(card.id);
                      const pickClass = getResultPickClass(card.id);

                      return (
                        <article
                          key={card.id}
                          className={`result-card sc-clickable-result-card${pickClass}`}
                          data-details-url={`/cards/${card.id}`}
                          onClick={(e) => handleCardClick(card.id, e)}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(`/cards/${card.id}`);
                            }
                          }}
                        >
                          <div className="result-main">
                            <div>
                              <div className="sc-result-kicker">
                                <div className="rank">{rank}</div>
                                <span className="sc-result-bank">{card.issuer}</span>
                              </div>
                              <h3 className="sc-result-title-row">
                                <span className="sc-result-card-name">{card.name}</span>
                                {pickLabel && (
                                  <span className="sc-result-pick-label sc-result-pick-inline">
                                    {pickLabel}
                                  </span>
                                )}
                              </h3>
                              <p>{getCardUsp(card)}</p>
                              <div className="result-meta">
                                <span className="mini-tag">Fit {toFitPercent(item.fitScore)}/100</span>
                                {card.bestFor[0] ? <span className="mini-tag">{card.bestFor[0]}</span> : null}
                                <span className="mini-tag">
                                  {card.annualFee === 0 ? "Lifetime free" : `Rs ${card.annualFee.toLocaleString("en-IN")} fee`}
                                </span>
                              </div>
                              <Link
                                className="sc-more-details"
                                href={`/cards/${card.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Click for more details →
                              </Link>
                            </div>
                          </div>
                          <div className="result-actions">
                            <button
                              className={`mini-btn sc-compare-btn${isSelected ? " is-selected" : ""}${!isSelected && selectedCardIds.length >= 3 ? " is-maxed" : ""}`}
                              disabled={!isHydrated}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isHydrated) return;
                                toggleCompare(card.id);
                              }}
                            >
                              {!isHydrated ? "Loading compare" : isSelected ? "Added to compare" : "Add to compare"}
                            </button>
                            <TrackedExternalLink
                              analyticsEvent={{
                                event_name: "apply_clicked",
                                page: "ask",
                                source: "ask",
                                query,
                                card_id: card.id
                              }}
                              className="mini-btn primary sc-apply-btn"
                              href={cardCtaHref(card)}
                              rel={cardCtaRel(card)}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {cardCtaLabel(card)}
                            </TrackedExternalLink>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>

        {/* Bottom Compare Section */}
        <section className="panel sc-compare-section" id="compare-section">
          <div className="panel-body">
            <div className="sc-compare-modern-head sc-compare-polished-head">
              <div>
                <h2 className="section-title">Compare selected cards</h2>
              </div>
              <span className="sc-compare-limit-chip">
                <span id="sc-compare-section-count">{selectedCards.length}</span>/3 selected
              </span>
            </div>

            <div aria-live="polite" className="sc-compare-selected-strip" id="sc-compare-selected-strip">
              {[0, 1, 2].map((slotIndex) => {
                const item = selectedCards[slotIndex];
                if (item) {
                  const card = item.card;
                  const rank = getDisplayRank(card.id);
                  return (
                    <article key={card.id} className="sc-compare-selected-card is-filled">
                      <button
                        className="sc-compare-remove"
                        type="button"
                        onClick={() => toggleCompare(card.id)}
                        aria-label={`Remove ${card.name}`}
                      >
                        ×
                      </button>
                      <span className="sc-compare-selected-rank">#{rank}</span>
                      <div className="sc-compare-selected-copy">
                        <small>{card.issuer}</small>
                        <strong>{card.name}</strong>
                        <em>
                          Fit {toFitPercent(item.fitScore)}/100 · {card.annualFee === 0 ? "Lifetime free" : `Rs ${card.annualFee.toLocaleString("en-IN")}`}
                        </em>
                      </div>
                    </article>
                  );
                }

                const slotLabels = [
                  { num: "1", text: "Add first card" },
                  { num: "2", text: "Add second card" },
                  { num: "3", text: "Add third card" }
                ];
                const slot = slotLabels[slotIndex];

                return (
                  <article key={`empty-${slotIndex}`} className="sc-compare-selected-card sc-compare-selected-card-empty">
                    <span className="sc-slot-number">{slot.num}</span>
                    <div>
                      <strong>{slot.text}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div
              className={`table-wrap sc-selected-compare-table-wrap${selectedCards.length === 0 ? " is-empty" : ""}`}
              id="sc-selected-compare-table-wrap"
            >
              {selectedCards.length > 0 && (
                <table className="compare-table compare-table--wide sc-selected-compare-table" id="sc-selected-compare-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      {selectedCards.map((item) => (
                        <th key={item.card.id}>
                          <span>{item.card.name}</span>
                          <small>{item.card.issuer}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Card type</td>
                      {selectedCards.map((item) => (
                        <td key={`type-${item.card.id}`}>
                          {cardRewardTypeIncludesCashback(item.card) ? "Cashback Card" : "Reward Card"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Best for</td>
                      {selectedCards.map((item) => (
                        <td key={`best-${item.card.id}`}>{item.card.bestFor.slice(0, 3).join(", ") || "-"}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Joining fee</td>
                      {selectedCards.map((item) => (
                        <td key={`joining-${item.card.id}`}>{formatCurrency(item.card.joiningFee)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Annual fee</td>
                      {selectedCards.map((item) => (
                        <td key={`fee-${item.card.id}`}>{formatCurrency(item.card.annualFee)}</td>
                      ))}
                    </tr>
                    {showFeeWaiverRow && (
                      <tr>
                        <td>Fee waiver spend</td>
                        {selectedCards.map((item) => (
                          <td key={`waiver-${item.card.id}`}>
                            {hasFeeWaiverSpend(item.card.feeWaiverSpend)
                              ? formatRupees(item.card.feeWaiverSpend)
                              : "-"}
                          </td>
                        ))}
                      </tr>
                    )}

                    <tr>
                      <td>Top reward categories</td>
                      {selectedCards.map((item) => (
                        <td key={`rewards-${item.card.id}`}>{rewardSummary(item.card)}</td>
                      ))}
                    </tr>

                    <tr>
                      <td>Domestic lounge</td>
                      {selectedCards.map((item) => {
                        const loungeConditions = getLoungeConditions(item.card, "domestic");
                        return (
                          <td key={`dom-lounge-${item.card.id}`}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <span>{loungeValue(item.card.loungeDomestic)}</span>
                              {loungeConditions.length > 0 && (
                                <LoungeInfo items={loungeConditions} label="Domestic lounge conditions" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td>International lounge</td>
                      {selectedCards.map((item) => {
                        const loungeConditions = getLoungeConditions(item.card, "international");
                        return (
                          <td key={`intl-lounge-${item.card.id}`}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <span>{loungeValue(item.card.loungeInternational)}</span>
                              {loungeConditions.length > 0 && (
                                <LoungeInfo items={loungeConditions} label="International lounge conditions" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td>Forex markup</td>
                      {selectedCards.map((item) => (
                        <td key={`forex-${item.card.id}`}>{item.card.forexMarkup}%</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Milestone benefits</td>
                      {selectedCards.map((item) => (
                        <td key={`milestones-${item.card.id}`}>{milestoneSummary(item.card)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Redemption</td>
                      {selectedCards.map((item) => (
                        <td key={`redemption-${item.card.id}`}>{redemptionSummary(item.card)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Key exclusions</td>
                      {selectedCards.map((item) => (
                        <td key={`exclusions-${item.card.id}`}>{listPreview(item.card.exclusions, 6)}</td>
                      ))}
                    </tr>

                    <tr>
                      <td>Why it matched</td>
                      {selectedCards.map((item) => (
                        <td key={`match-${item.card.id}`}>{getCardUsp(item.card)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Action</td>
                      {selectedCards.map((item) => (
                        <td key={`action-${item.card.id}`}>
                          <div className="sc-compare-action-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
                            <Link href={`/cards/${item.card.id}`}>Details</Link>
                            <TrackedExternalLink
                              analyticsEvent={{
                                event_name: "apply_clicked",
                                page: "ask",
                                source: "ask",
                                query,
                                card_id: item.card.id
                              }}
                              href={cardCtaHref(item.card)}
                              rel={cardCtaRel(item.card)}
                              target="_blank"
                            >
                              {cardCtaLabel(item.card)}
                            </TrackedExternalLink>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Right Sidebar Stack */}
      <aside className="side-stack ask-sticky">
        <section className="sidebar-card sc-precision-sidebar sc-recommend-right">
          <div className="panel-body">
            <h2 className="side-title sc-precision-title">Need sharper picks?</h2>
            <div className="clarify-box">
              <article className="clarify-card">
                <h3>What matters most?</h3>
                <p>Pick a priority and we’ll tune the ranking</p>
                <div className="clarify-options">
                  {MATTER_CHIPS.map((chip) => (
                    <Link
                      key={chip}
                      className="option-chip"
                      href={`/ask?query=${encodeURIComponent(`${query ? query : "best card"} for ${chip.toLowerCase()}`)}`}
                    >
                      {chip}
                    </Link>
                  ))}
                </div>
              </article>

              <article className="clarify-card">
                <h3>Monthly spend?</h3>
                <p>Tell us the range so premium fees make sense</p>
                <div className="clarify-options">
                  {SPEND_CHIPS.map((chip) => (
                    <Link
                      key={chip.label}
                      className="option-chip"
                      href={`/ask?query=${encodeURIComponent(`${query ? query : "best card"} with spend ${chip.querySuffix}`)}`}
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </article>
            </div>

            {/* TODO: Implement this later
            <div className="sc-email-reco-box">
              <h3>Still deciding?</h3>
              <p>Email yourself this shortlist and come back later</p>
              <form className="sc-email-reco-form" onSubmit={handleEmailSubmit}>
                <input
                  aria-label="Name for recommendations"
                  placeholder="Name"
                  type="text"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                />
                <input
                  aria-label="Email ID for recommendations"
                  placeholder="Email ID"
                  type="email"
                  required
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                />
                <button type="submit">
                  {emailSent ? "Shortlist sent!" : "Email my shortlist"}
                </button>
              </form>
            </div>
            */}
          </div>
        </section>

        <section className="sidebar-card sc-feedback-sidebar">
          <div className="panel-body">
            <AskFeedback
              cardIds={cards.map((item) => item.card.id)}
              input={input}
              query={query}
              returnAnchor="answer"
              returnTo={returnTo}
              savedFeedback={savedFeedback}
              summary={summary}
            />
            {feedbackError && (
              <p className="notice" style={{ margin: "12px 0 0" }}>
                Feedback could not be saved on the server.
              </p>
            )}
          </div>
        </section>
      </aside>

      {/* Floating Compare Tray */}
      <div
        className={`sc-floating-compare${selectedCards.length > 0 && !isCompareSectionVisible ? " is-visible" : ""}${pulsing ? " sc-compare-limit-pulse" : ""}`}
        id="sc-floating-compare"
        aria-hidden={selectedCards.length === 0 || isCompareSectionVisible ? "true" : "false"}
      >
        <div className="sc-floating-compare-icon">
          <svg viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="scCompareCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e112c" />
                <stop offset="60%" stopColor="#581c87" />
                <stop offset="100%" stopColor="#b8975a" />
              </linearGradient>
              <linearGradient id="scCompareCheckGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e112c" />
                <stop offset="50%" stopColor="#b8975a" />
                <stop offset="100%" stopColor="#f3e8ff" />
              </linearGradient>
              <linearGradient id="scCompareTopSliceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fdfbf7" />
                <stop offset="100%" stopColor="#b8975a" />
              </linearGradient>
            </defs>
            <path d="M40 15 C 54 11, 80 13, 92 16 C 94 17, 95 19, 94 21 C 92 24, 70 24, 44 21 C 41 21, 40 18, 40 15 Z" fill="url(#scCompareTopSliceGrad)" />
            <path d="M16 20 C 16 16, 20 15, 25 16 L88 28 C 92 28, 94 31, 94 35 L88 65 C 88 68, 85 70, 81 70 L22 79 C 18 79, 16 76, 16 71 Z" fill="url(#scCompareCardGrad)" />
            <rect x="22" y="28" width="16" height="12" rx="3.5" fill="#f3edf5" opacity="0.95" />
            <path d="M20 56 L48 66 L105 18 L44 84 Z" stroke="#fdfbf7" strokeWidth="6" strokeLinejoin="miter" fill="none" />
            <path d="M20 56 L48 66 L105 18 L44 84 Z" fill="url(#scCompareCheckGrad)" />
          </svg>
          <span className="sc-floating-compare-count" id="sc-floating-compare-count">
            {selectedCards.length}
          </span>
        </div>
        <div className="sc-floating-compare-copy">
          <strong className="sc-floating-compare-title" id="sc-floating-compare-title">
            {selectedCards.length === 1 ? "1 card in compare" : `${selectedCards.length} cards in compare`}
          </strong>
          <small className="sc-floating-compare-subtitle" id="sc-floating-compare-subtitle">
            {selectedCards.length} of 3 added
          </small>
        </div>
        <a
          className="sc-floating-compare-link"
          href="#compare-section"
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById("compare-section");
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
        >
          View comparison
        </a>
      </div>
    </>
  );
}
