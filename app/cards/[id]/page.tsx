import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cards, getCardById } from "@/lib/cards";
import { getCardContent } from "@/lib/card-content";
import { getLoungeConditions, getMeaningfulLoungeConditions, getTotalLoungeAccess } from "@/lib/lounge";
import LoungeInfo from "@/app/ui/LoungeInfo";
import AskFeedback from "@/app/ui/AskFeedback";
import AskBox from "@/app/ui/AskBox";
import RewardCalculator from "@/app/ui/RewardCalculator";
import { milestoneRulesForCard } from "@/lib/recommend";
import type { CreditCard, Redemption } from "@/lib/types";

import { stripScoringAnnotations } from "@/lib/card-index";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    feedbackSaved?: string;
    feedbackError?: string;
  }>;
};

export function generateStaticParams() {
  return cards.map((card) => ({ id: card.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const card = getCardById(id);
  if (!card) return { title: "Card Review | Card AI India" };

  const fee = card.annualFee === 0 ? "lifetime free" : `Rs ${card.annualFee.toLocaleString("en-IN")} annual fee`;
  const totalLoungeAccess = getTotalLoungeAccess(card);
  const lounge = totalLoungeAccess === "unlimited"
    ? "unlimited lounge access"
    : totalLoungeAccess > 0
      ? `${totalLoungeAccess} lounge visits`
      : null;
  const descParts = [card.issuer, fee, lounge].filter(Boolean).join(" · ");
  const description = `${card.name} — ${descParts}. Verified rewards, fees, and benefits.`;

  return {
    title: `${card.name} Review | Card AI India`,
    description,
    openGraph: {
      title: `${card.name} | Card AI India`,
      description,
      type: "article"
    }
  };
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not listed";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function hasFeeWaiverSpend(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
}

function formatRewardCap(value: number | null | undefined, rewardType: string) {
  if (!value) return "-";
  return `${value.toLocaleString("en-IN")} ${rewardType}`;
}

function formatStatementQuarterCap(value: number | null | undefined) {
  if (!value) return "-";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function formatRewardRate(card: CreditCard, reward: CreditCard["rewards"][number]) {
  if (reward.displayRate) return reward.displayRate;

  const rewardTypeLower = card.rewardType.toLowerCase();

  if (rewardTypeLower.includes("mile") || rewardTypeLower.includes("point")) {
    return `${reward.rate} ${card.rewardType} / Rs 100`;
  }

  return `${reward.rate}%`;
}

function redemptionRows(redemption?: Redemption) {
  if (!redemption) return [];

  return [
    [redemption.ecosystemLabel, redemption.ecosystemValue],
    ["Statement balance", redemption.statementBalanceValue],
    ["SmartBuy flight/hotel", redemption.smartBuyFlightHotelValue],
    ["SmartBuy rewards catalogue", redemption.smartBuyCatalogueValue],
    ["Travel EDGE flight/hotel", redemption.travelEdgeValue],
    ["Air miles", redemption.airMilesValue],
    ["Accor", redemption.accorValue]
  ].filter((row): row is [string, number] => typeof row[0] === "string" && typeof row[1] === "number");
}

function singularRewardUnit(rewardType: string) {
  const trimmed = rewardType.trim();
  if (!trimmed) return "point";
  if (trimmed.endsWith("s")) return trimmed.slice(0, -1);
  return trimmed;
}

function valueLabel(label: string, value: number, rewardType: string) {
  if (label === "Accor") return `upto Rs ${value} per point *considering using accor redemption`;
  if (label === "Air miles") {
    return `upto ${value} airmile per point`;
  }
  if (
    label === "Statement balance" ||
    label === "SmartBuy flight/hotel" ||
    label === "SmartBuy rewards catalogue" ||
    label === "Travel EDGE flight/hotel"
  ) {
    return `upto Rs ${value} per point`;
  }
  return `upto Rs ${value} per ${singularRewardUnit(rewardType)}`;
}

function formatTatDays(value: number | undefined) {
  if (typeof value !== "number") return "-";
  return `${value} day${value === 1 ? "" : "s"}`;
}

function formatAnnualCap(group: string | undefined, annualCap: number | undefined, rewardType: string) {
  if (typeof annualCap === "number") return formatRewardCap(annualCap, rewardType);
  if (group === "Group A") return "30,000 EDGE Miles";
  if (group === "Group B") return "120,000 EDGE Miles";
  return "-";
}

function DetailList({ items, className }: { items?: string[]; className?: string }) {
  if (!items || items.length === 0) return <p className="muted">Not listed.</p>;

  return (
    <ul className={className ? `detail-list ${className}` : "detail-list"}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function formatUpdateDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function updateSummaryPoints(summary: string) {
  return summary
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function CardPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const card = getCardById(id);
  if (!card) notFound();
  const savedFeedback = query.feedbackSaved === "up" || query.feedbackSaved === "down" ? query.feedbackSaved : null;
  const feedbackError = query.feedbackError === "1";
  const cardContent = getCardContent(card.id);
  const totalLoungeAccess = getTotalLoungeAccess(card);
  const combinedLoungeConditions = getLoungeConditions(card);
  const domesticLoungeConditions = getMeaningfulLoungeConditions(card, "domestic");
  const internationalLoungeConditions = getMeaningfulLoungeConditions(card, "international");
  const redemptions = redemptionRows(card.redemption);
  const hasRedemptionSection = Boolean(
    redemptions.length || card.redemption?.airlinePartners?.length || card.redemption?.hotelPartners?.length
  );
  const showAirlineTat = card.redemption?.airlinePartners?.some(
    (partner) => typeof partner.tatDays === "number"
  ) ?? false;
  const showHotelTat = card.redemption?.hotelPartners?.some(
    (partner) => typeof partner.tatDays === "number"
  ) ?? false;
  const showAirlineGroup = card.redemption?.airlinePartners?.some(
    (partner) => typeof partner.group === "string"
  ) ?? false;
  const showHotelGroup = card.redemption?.hotelPartners?.some(
    (partner) => typeof partner.group === "string"
  ) ?? false;
  const hasDailyCap = card.rewards.some(
    (reward) => typeof reward.capDaily === "number" && reward.capDaily > 0
  );
  const hasMonthlyCap = card.rewards.some(
    (reward) => typeof reward.capMonthly === "number" && reward.capMonthly > 0
  );
  const hasStatementQuarterCap = card.rewards.some(
    (reward) => typeof reward.capStatementQuarter === "number" && reward.capStatementQuarter > 0
  );
  const hasMilestoneBenefits = Boolean(card.milestoneBenefits?.length);
  const hasJoiningBenefits = Boolean(card.joiningBenefits?.length);
  const hasRenewalBenefits = Boolean(card.renewalBenefits?.length);
  const hasAdditionalBenefits = Boolean(card.additionalBenefits?.length);
  const hasExclusions = Boolean(card.exclusions?.length);
  const hasEligibility = Boolean(card.eligibility?.salaried?.length || card.eligibility?.selfEmployed?.length);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="container page-hero-inner">
          <div className="page-header-wrap" style={{ marginBottom: 0 }}>
            <div className="page-title">
              <p>{card.issuer}</p>
              <h1>{card.name}</h1>
              <div className="page-title-meta">
                <span>Last verified: {card.lastVerified}</span>
              </div>
            </div>
            {card.imageUrl ? (
              <div className="page-card-image">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  style={card.id === "hdfc-regalia-gold" ? { objectPosition: "center 25%" } : undefined}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="page-content">
        <div className="container">
          <div className="detail-layout">
        <article className="panel card detail-main">
          <div className="stats">
            <div className="stat">
              <strong>{formatCurrency(card.joiningFee)}</strong>
              <span>Joining fee</span>
            </div>
            <div className="stat">
              <strong>{formatCurrency(card.annualFee)}</strong>
              <span>Annual fee</span>
            </div>
            {card.combinedLoungeAccess !== undefined ? (
              <div className="stat">
                <strong>{totalLoungeAccess === "unlimited" ? "Unlimited" : totalLoungeAccess}</strong>
                <span className="stat-label">
                  {card.combinedLoungeAccessLabel ?? "Lounge access"}
                  <LoungeInfo
                    items={combinedLoungeConditions}
                    label={`${card.combinedLoungeAccessLabel ?? "Lounge access"} conditions`}
                  />
                </span>
              </div>
            ) : (
              <>
                <div className="stat">
                  <strong>{card.loungeDomestic === "unlimited" ? "Unlimited" : card.loungeDomestic}</strong>
                  <span className="stat-label">
                    Domestic lounge
                    {domesticLoungeConditions.length > 0 ? (
                      <LoungeInfo items={domesticLoungeConditions} label="Domestic lounge conditions" />
                    ) : null}
                  </span>
                </div>
                <div className="stat">
                  <strong>{card.loungeInternational === "unlimited" ? "Unlimited" : card.loungeInternational}</strong>
                  <span className="stat-label">
                    International lounge
                    {internationalLoungeConditions.length > 0 ? (
                      <LoungeInfo items={internationalLoungeConditions} label="International lounge conditions" />
                    ) : null}
                  </span>
                </div>
              </>
            )}
            <div className="stat">
              <strong>{card.forexMarkup}%</strong>
              <span>Forex markup</span>
            </div>
            {hasFeeWaiverSpend(card.feeWaiverSpend) ? (
              <div className="stat">
                <strong>{formatCurrency(card.feeWaiverSpend)}</strong>
                <span>Fee waiver spend</span>
              </div>
            ) : null}
            <div className="stat">
              <strong>{card.network.join(", ")}</strong>
              <span>Network</span>
            </div>
          </div>
          <div className="meta">
            {card.tags.map((tag) => (
              <span className="badge" key={tag}>
                {tag}
              </span>
            ))}
          </div>

          <section className="detail-section">
            <h2>Rewards</h2>
            <div className="table-wrap">
              <table className="compare-table">
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
                  {card.rewards.map((reward) => (
                    <tr key={`${reward.category}-${reward.displayCategory ?? ""}`}>
                      <td>{reward.displayCategory ?? reward.category}</td>
                      <td>{formatRewardRate(card, reward)}</td>
                      {hasDailyCap && <td className="cap-column">{formatRewardCap(reward.capDaily, card.rewardType)}</td>}
                      {hasMonthlyCap && <td className="cap-column">{formatRewardCap(reward.capMonthly, card.rewardType)}</td>}
                      {hasStatementQuarterCap && (
                        <td className="cap-column">{formatStatementQuarterCap(reward.capStatementQuarter)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {hasRedemptionSection ? (
            <section className="detail-section">
              <h2>Redemption</h2>
              {redemptions.length > 0 ? (
                <div className="info-grid">
                  {redemptions.map(([label, value]) => (
                    <div className="info-row" key={label}>
                      <span>{label}</span>
                      <strong>{valueLabel(label, value, card.rewardType)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              {card.redemption?.airlinePartners?.length ? (
                <div className="table-wrap">
                  <table className="compare-table compare-table-compact">
                    <thead>
                      <tr>
                        <th>Airline</th>
                        <th>Programme</th>
                        <th>Ratio</th>
                        {showAirlineGroup && <th>Group</th>}
                        {showAirlineGroup && <th>Annual cap</th>}
                        {showAirlineTat && <th>TAT</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {card.redemption.airlinePartners.map((partner) => (
                        <tr key={`${partner.airline}-${partner.programme}`}>
                          <td>{partner.airline}</td>
                          <td>{partner.programme}</td>
                          <td>{partner.ratio}</td>
                          {showAirlineGroup && <td>{partner.group || "-"}</td>}
                          {showAirlineGroup && <td>{formatAnnualCap(partner.group, partner.annualCap, card.rewardType)}</td>}
                          {showAirlineTat && <td>{formatTatDays(partner.tatDays)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {card.redemption?.hotelPartners?.length ? (
                <div className="table-wrap">
                  <table className="compare-table compare-table-compact">
                    <thead>
                      <tr>
                        <th>Hotel group</th>
                        <th>Programme</th>
                        <th>Ratio</th>
                        {showHotelGroup && <th>Group</th>}
                        {showHotelGroup && <th>Annual cap</th>}
                        {showHotelTat && <th>TAT</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {card.redemption.hotelPartners.map((partner) => (
                        <tr key={`${partner.hotelGroup}-${partner.programme}`}>
                          <td>{partner.hotelGroup}</td>
                          <td>{partner.programme}</td>
                          <td>{partner.ratio}</td>
                          {showHotelGroup && <td>{partner.group || "-"}</td>}
                          {showHotelGroup && <td>{formatAnnualCap(partner.group, partner.annualCap, card.rewardType)}</td>}
                          {showHotelTat && <td>{formatTatDays(partner.tatDays)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {card.id === "axis-atlas" && (
                <p className="muted calc-note" style={{ marginTop: 12 }}>
                  Annual caps of 30,000 EDGE Miles for Group A and 120,000 EDGE Miles for Group B apply.
                </p>
              )}
            </section>
          ) : null}

          {hasJoiningBenefits ? (
            <section className="detail-section">
              <h2>Joining Benefits</h2>
              <DetailList items={card.joiningBenefits} />
            </section>
          ) : null}

          {hasRenewalBenefits ? (
            <section className="detail-section">
              <h2>Renewal Benefits</h2>
              <DetailList items={card.renewalBenefits} />
            </section>
          ) : null}

          {hasMilestoneBenefits ? (
            <section className="detail-section">
              <h2>Milestone Benefits</h2>
              <DetailList items={card.milestoneBenefits} />
            </section>
          ) : null}

          {hasAdditionalBenefits ? (
            <section className="detail-section">
              <h2>Additional Benefits</h2>
              <DetailList items={card.additionalBenefits} />
            </section>
          ) : null}

          {card.additionalDetails?.length ? (
            <section className="detail-section">
              <h2>Additional Details</h2>
              <DetailList items={card.additionalDetails} />
            </section>
          ) : null}

          {hasExclusions ? (
            <section className="detail-section">
              <h2>Exclusions</h2>
              <DetailList className="detail-list-columns" items={card.exclusions} />
            </section>
          ) : null}

          {cardContent?.tips.length ? (
            <section className="detail-section">
              <h2>Tips</h2>
              <div className="content-list">
                {cardContent.tips.map((tip, index) => (
                  <article className="content-item" key={`${tip.sourceLabel}-${index}`}>
                    <p className="muted">{tip.text}</p>
                    {tip.sourceUrl ? (
                      <a className="button secondary" href={tip.sourceUrl} rel="nofollow" target="_blank">
                        Open source <ExternalLink size={15} />
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {cardContent?.updates.length ? (
            <section className="detail-section">
              <h2>Latest Updates</h2>
              <div className="content-list content-list-updates">
                {cardContent.updates.map((update) => (
                  <article className="content-item content-item-update" key={`${update.publishedAt}-${update.title}`}>
                    <div className="content-update-bullet" aria-hidden="true" />
                    <div className="content-update-body">
                      <div className="content-item-head">
                        <strong>{update.title}</strong>
                        <span className="badge">{formatUpdateDate(update.publishedAt)}</span>
                      </div>
                      <ul className="detail-list content-update-points">
                        {updateSummaryPoints(update.summary).map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                    {update.sourceUrl ? (
                      <a className="button secondary" href={update.sourceUrl} rel="nofollow" target="_blank">
                        Open update <ExternalLink size={15} />
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="detail-section">
            <h2>Reward calculator</h2>
            <p className="muted calc-intro">
              Enter your monthly spend to estimate how many {card.rewardType} you earn and what they are worth
              across each redemption option.
            </p>
            <RewardCalculator card={card} milestones={milestoneRulesForCard(card)} />
          </section>

          {hasEligibility ? (
            <section className="detail-section">
              <h2>Eligibility</h2>
              <div className="split-grid">
                {card.eligibility?.salaried?.length ? (
                  <div>
                    <h3>Salaried</h3>
                    <DetailList items={card.eligibility?.salaried} />
                  </div>
                ) : null}
                {card.eligibility?.selfEmployed?.length ? (
                  <div>
                    <h3>Self-employed</h3>
                    <DetailList items={card.eligibility?.selfEmployed} />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <div className="actions">
            <a className="button" href={card.applyUrl} rel="nofollow sponsored" target="_blank">
              Apply <ExternalLink size={15} />
            </a>
          </div>
          <div id="page-feedback">
            <AskFeedback
              cardIds={[card.id]}
              input={{ query: card.name }}
              label="Was this page helpful?"
              query={card.name}
              returnAnchor="page-feedback"
              returnTo={`/cards/${card.id}`}
              savedFeedback={savedFeedback}
              source="details"
              summary={`Card details page for ${card.name}`}
            />
            {feedbackError ? (
              <p className="ask-feedback-message ask-feedback-error">Feedback could not be saved on the server.</p>
            ) : null}
          </div>
        </article>

        <aside className="detail-aside">
          {/* ad slot: card detail sidebar — restore when ads integrated */}
<AskBox defaultQuery="" showHelperText={false} />
          <div className="panel card">
            <h2>Card facts</h2>
            <div className="info-grid">
              <div className="info-row">
                <span>Issuer</span>
                <strong>{card.issuer}</strong>
              </div>
              <div className="info-row">
                <span>Reward type</span>
                <strong>{card.rewardType}</strong>
              </div>
              <div className="info-row">
                <span>Last verified</span>
                <strong>{card.lastVerified}</strong>
              </div>
            </div>
            <a className="button aside-apply" href={card.applyUrl} rel="nofollow sponsored" target="_blank">
              Apply <ExternalLink size={15} />
            </a>
          </div>
        </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
