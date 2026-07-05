"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreditCard, RecommendationInput } from "@/lib/types";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";
import { getCardShortUsp, getCardUsp } from "@/lib/card-usp";
import { cardRewardTypeIncludesCashback } from "@/lib/reward-type";
import { TrackedExternalLink, TrackedLink } from "../ui/TrackedLink";
import AskFeedback from "../ui/AskFeedback";

export type ScoredCardItem = {
  card: CreditCard;
  fitScore: number;
  reasons: string[];
};

type Props = {
  query: string;
  displayedMatchCount: number;
  cards: ScoredCardItem[];
  summary: string;
  input: RecommendationInput;
  savedFeedback?: "up" | "down" | null | undefined;
  feedbackError?: boolean;
  returnTo: string;
};

const MATTER_CHIPS = ["Travel", "Cashback", "Lounge access", "Low annual fee"];
const SPEND_CHIPS = [
  { label: "Under Rs 25k", href: "/recommend" },
  { label: "Rs 25k-75k", href: "/recommend" },
  { label: "Rs 75k+", href: "/recommend" }
] as const;

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not listed";
  if (value === 0) return "Lifetime free";
  return `Rs ${value.toLocaleString("en-IN")} fee`;
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
  summary,
  input,
  savedFeedback,
  feedbackError,
  returnTo
}: Props) {
  const router = useRouter();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [pulsing, setPulsing] = useState(false);
  const [emailName, setEmailName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const topFitRaw = cards[0]?.fitScore ?? 0;
  const toFitPercent = (score: number) =>
    topFitRaw > 0 ? Math.max(1, Math.min(100, Math.round((score / topFitRaw) * 100))) : 100;

  const topThree = cards.slice(0, 3);
  const topPicksData = [
    {
      heading: "Top pick",
      headingClass: "sc-top-pick",
      tone: "good",
      item: topThree[0]
    },
    {
      heading: "Strong alternative",
      headingClass: "sc-strong-alternative",
      tone: "warn",
      item: topThree[1]
    },
    {
      heading: "Also worth a look",
      headingClass: "sc-also-worth",
      tone: "skip",
      item: topThree[2]
    }
  ].filter((p): p is { heading: string; headingClass: string; tone: string; item: ScoredCardItem } => Boolean(p.item));

  // Split results into Cashback Cards first, Reward Cards second
  const cashbackCards = cards.filter((c) => cardRewardTypeIncludesCashback(c.card));
  const rewardCards = cards.filter((c) => !cardRewardTypeIncludesCashback(c.card));

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
    .map((id) => cards.find((c) => c.card.id === id))
    .filter((c): c is ScoredCardItem => Boolean(c));

  const resultPickClass = (index: number) => {
    if (index === 0) return " sc-result-top-pick best";
    if (index === 1) return " sc-result-strong-alt";
    if (index === 2) return " sc-result-also-look";
    return "";
  };

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
                  const descCopy = getCardShortUsp(card);

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
                    const overallIndex = cards.findIndex((c) => c.card.id === card.id);
                    const rank = overallIndex + 1;
                    const isSelected = selectedCardIds.includes(card.id);
                    const pickLabel =
                      overallIndex === 0
                        ? "Top pick"
                        : overallIndex === 1
                          ? "Strong alternative"
                          : overallIndex === 2
                            ? "Also worth a look"
                            : null;

                    return (
                      <article
                        key={card.id}
                        className={`result-card sc-clickable-result-card${resultPickClass(overallIndex)}`}
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
                            <p>{getCardShortUsp(card)}</p>
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
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(card.id);
                            }}
                          >
                            {isSelected ? "Added to compare" : "Add to compare"}
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
                    const overallIndex = cards.findIndex((c) => c.card.id === card.id);
                    const rank = overallIndex + 1;
                    const isSelected = selectedCardIds.includes(card.id);
                    const pickLabel =
                      overallIndex === 0
                        ? "Top pick"
                        : overallIndex === 1
                          ? "Strong alternative"
                          : overallIndex === 2
                            ? "Also worth a look"
                            : null;

                    return (
                      <article
                        key={card.id}
                        className={`result-card sc-clickable-result-card${resultPickClass(overallIndex)}`}
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
                            <p>{getCardShortUsp(card)}</p>
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
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(card.id);
                            }}
                          >
                            {isSelected ? "Added to compare" : "Add to compare"}
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
                  const rank = cards.findIndex((c) => c.card.id === card.id) + 1;
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
                      <td>Annual fee</td>
                      {selectedCards.map((item) => (
                        <td key={`fee-${item.card.id}`}>{formatCurrency(item.card.annualFee)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Fit score</td>
                      {selectedCards.map((item) => (
                        <td key={`fit-${item.card.id}`}>Fit {toFitPercent(item.fitScore)}/100</td>
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
                          <div className="sc-compare-action-row">
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
                    <Link key={chip.label} className="option-chip" href={chip.href}>
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </article>
            </div>

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
        className={`sc-floating-compare${selectedCards.length > 0 ? " is-visible" : ""}${pulsing ? " sc-compare-limit-pulse" : ""}`}
        id="sc-floating-compare"
        aria-hidden={selectedCards.length === 0 ? "true" : "false"}
      >
        <div className="sc-floating-compare-icon">
          <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
            <rect height="14" rx="2" width="18" x="3" y="5" />
            <line x1="3" x2="21" y1="10" y2="10" />
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
