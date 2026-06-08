import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cards, getCardById } from "@/lib/cards";
import { getCardContent } from "@/lib/card-content";
import { getTotalLoungeAccess } from "@/lib/lounge";
import AskFeedback from "@/app/ui/AskFeedback";
import AskBox from "@/app/ui/AskBox";
import AnalyticsMount from "@/app/ui/AnalyticsMount";
import RewardCalculator from "@/app/ui/RewardCalculator";
import CardImageFallback from "@/app/ui/CardImageFallback";
import { TrackedExternalLink } from "@/app/ui/TrackedLink";
import { buildCardDetailMetadata } from "@/lib/analytics-events";
import { milestoneRulesForCard, scoreCards } from "@/lib/recommend";
import {
  alternativeIntent,
  deriveAvoidIf,
  deriveBestFor,
  deriveLoungeMilestoneRules,
  deriveTake,
  findAlternativeCards,
  formatRupeesCompact
} from "@/lib/card-detail";
import type { CreditCard, Redemption } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    feedbackSaved?: string;
    feedbackError?: string;
    query?: string;
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

function redemptionRows(issuer: string, redemption?: Redemption) {
  if (!redemption) return [];

  let flightHotelLabel = "Flight/hotel booking";
  let catalogueLabel = "Rewards catalogue";
  if (issuer === "HDFC Bank") {
    flightHotelLabel = "SmartBuy flight/hotel";
    catalogueLabel = "SmartBuy rewards catalogue";
  } else if (issuer === "ICICI Bank") {
    flightHotelLabel = "iShop flight/hotel";
    catalogueLabel = "iShop rewards catalogue";
  } else if (issuer === "SBI Card") {
    flightHotelLabel = "Travel portal booking";
    catalogueLabel = "Shop & Smile catalogue";
  }

  const rows: Array<[string | undefined, number | undefined]> = [
    [redemption.ecosystemLabel, redemption.ecosystemValue],
    ["Statement balance", redemption.statementBalanceValue],
    [flightHotelLabel, redemption.smartBuyFlightHotelValue],
    [catalogueLabel, redemption.smartBuyCatalogueValue],
    ["Travel EDGE flight/hotel", redemption.travelEdgeValue],
    ["Air miles", redemption.airMilesValue]
  ];

  if (redemption.voucherRedemptions && redemption.voucherRedemptions.length > 0) {
    const maxVal = Math.max(...redemption.voucherRedemptions.map(v => v.valuePerPoint));
    const hasGoldCollection = redemption.voucherRedemptions.some(v => v.programme.includes("Gold Collection"));
    const hasPlatTravelCollection = redemption.voucherRedemptions.some(v => v.programme.includes("Platinum Travel"));
    const label = hasGoldCollection 
      ? "18K/24K Gold Collection" 
      : hasPlatTravelCollection 
        ? "Platinum Travel Collection" 
        : "Vouchers";
    rows.push([label, maxVal]);
  }

  return rows.filter((row): row is [string, number] => typeof row[0] === "string" && typeof row[1] === "number");
}

function singularRewardUnit(rewardType: string) {
  const trimmed = rewardType.trim();
  if (!trimmed) return "point";
  if (trimmed.endsWith("s")) return trimmed.slice(0, -1);
  return trimmed;
}

function valueLabel(label: string, value: number, rewardType: string) {
  if (label === "Air miles") {
    return `upto ${value} airmile per point`;
  }
  if (
    label === "Statement balance" ||
    label.endsWith("flight/hotel") ||
    label.endsWith("rewards catalogue") ||
    label === "Travel portal booking" ||
    label === "Shop & Smile catalogue" ||
    label === "18K/24K Gold Collection" ||
    label === "Platinum Travel Collection" ||
    label === "Vouchers"
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

function titleCaseWord(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

// Compact lounge label like "12 + 6" / "Unlimited" / null when the card has no lounge access.
function loungeShortValue(card: CreditCard): string | null {
  if (card.combinedLoungeAccess !== undefined) {
    return card.combinedLoungeAccess === "unlimited" ? "Unlimited" : `${card.combinedLoungeAccess}`;
  }
  const hasDomestic = card.loungeDomestic === "unlimited" || card.loungeDomestic > 0;
  const hasInternational = card.loungeInternational === "unlimited" || card.loungeInternational > 0;
  if (!hasDomestic && !hasInternational) return null;
  const domestic = card.loungeDomestic === "unlimited" ? "∞" : card.loungeDomestic;
  const international = card.loungeInternational === "unlimited" ? "∞" : card.loungeInternational;
  return `${domestic} + ${international}`;
}

export default async function CardPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const card = getCardById(id);
  if (!card) notFound();

  const savedFeedback = query.feedbackSaved === "up" || query.feedbackSaved === "down" ? query.feedbackSaved : null;
  const feedbackError = query.feedbackError === "1";
  const cardContent = getCardContent(card.id);
  const latestUpdate = cardContent?.updates[0];

  // Redemption / rewards table data (issuer-aware labels + voucher rows).
  const redemptions = redemptionRows(card.issuer, card.redemption);
  const airlinePartners = card.redemption?.airlinePartners ?? [];
  const hotelPartners = card.redemption?.hotelPartners ?? [];
  const voucherPartners = (card.redemption?.voucherRedemptions ?? []).map((v) => ({
    type: "Voucher",
    name: v.partner,
    programme: v.programme,
    ratio: v.ratio,
    tatDays: v.tatDays
  }));
  const hasRedemptionSection = Boolean(
    redemptions.length || airlinePartners.length || hotelPartners.length || voucherPartners.length
  );
  const showAirlineTat = airlinePartners.some((partner) => typeof partner.tatDays === "number");
  const showHotelTat = hotelPartners.some((partner) => typeof partner.tatDays === "number");
  const showAirlineGroup = airlinePartners.some((partner) => typeof partner.group === "string");
  const showHotelGroup = hotelPartners.some((partner) => typeof partner.group === "string");
  const showVoucherTat = voucherPartners.some((partner) => typeof partner.tatDays === "number");
  const hasDailyCap = card.rewards.some((reward) => typeof reward.capDaily === "number" && reward.capDaily > 0);
  const hasMonthlyCap = card.rewards.some((reward) => typeof reward.capMonthly === "number" && reward.capMonthly > 0);
  const hasStatementQuarterCap = card.rewards.some(
    (reward) => typeof reward.capStatementQuarter === "number" && reward.capStatementQuarter > 0
  );

  // Prefer the structured valued labels when present, else the free-text string arrays.
  const joiningBenefitLines = card.joiningBenefitsValued?.length
    ? card.joiningBenefitsValued.map((benefit) => benefit.label)
    : card.joiningBenefits;
  const renewalBenefitLines = card.renewalBenefitsValued?.length
    ? card.renewalBenefitsValued.map((benefit) => benefit.label)
    : card.renewalBenefits;
  const hasJoiningBenefits = Boolean(joiningBenefitLines?.length);
  const hasRenewalBenefits = Boolean(renewalBenefitLines?.length);
  const hasAdditionalBenefits = Boolean(card.additionalBenefits?.length);
  const hasAdditionalDetails = Boolean(card.additionalDetails?.length);
  const hasFinePrint = hasJoiningBenefits || hasRenewalBenefits || hasAdditionalBenefits || hasAdditionalDetails;
  const hasEligibility = Boolean(card.eligibility?.salaried?.length || card.eligibility?.selfEmployed?.length);

  // Derived, schema-safe sections (each empty/null result is hidden).
  const take = deriveTake(card);
  const bestFor = deriveBestFor(card);
  const avoidIf = deriveAvoidIf(card);
  const loungeMilestoneRules = deriveLoungeMilestoneRules(card);
  const alternatives = findAlternativeCards(card);
  const firstAlternative = alternatives[0];

  // Optional, clearly-labelled query-context fit — only when a query is passed in. Never a
  // standalone/generic fit score.
  const queryText = query.query?.trim();
  let queryFit: number | null = null;
  if (queryText) {
    const scored = scoreCards({ query: queryText });
    const topScore = scored[0]?.fitScore ?? 0;
    const mine = scored.find((entry) => entry.card.id === card.id);
    if (mine && topScore > 0) {
      queryFit = Math.max(1, Math.min(100, Math.round((mine.fitScore / topScore) * 100)));
    }
  }

  const loungeValue = loungeShortValue(card);
  const compareHref = (
    firstAlternative ? `/compare?a=${card.id}&b=${firstAlternative.id}` : `/compare?a=${card.id}`
  ) as Route;
  const fitQueryHref = `/ask?query=${encodeURIComponent(`Is the ${card.name} a good fit for me?`)}` as Route;

  const heroMetrics: Array<{ value: string; label: string }> = [
    { value: card.annualFee === 0 ? "Lifetime free" : formatCurrency(card.annualFee), label: "Annual fee" },
    hasFeeWaiverSpend(card.feeWaiverSpend)
      ? { value: formatRupeesCompact(card.feeWaiverSpend as number), label: "Fee waiver spend" }
      : { value: formatCurrency(card.joiningFee), label: "Joining fee" },
    loungeValue ? { value: loungeValue, label: "Lounge visits" } : { value: card.network.join(" / "), label: "Network" },
    { value: `${card.forexMarkup}%`, label: "Forex markup" }
  ];

  const quickFacts: Array<{ value: string; label: string }> = [
    {
      value: card.annualFee === 0 && card.joiningFee === 0 ? "Lifetime free" : formatCurrency(card.annualFee),
      label: card.joiningFee === card.annualFee && card.annualFee !== 0 ? "Joining + annual fee" : "Annual fee"
    }
  ];
  quickFacts.push(
    hasFeeWaiverSpend(card.feeWaiverSpend)
      ? { value: formatRupeesCompact(card.feeWaiverSpend as number), label: "Annual fee waiver spend" }
      : { value: card.network.join(" / "), label: "Network" }
  );
  if (card.combinedLoungeAccess !== undefined) {
    quickFacts.push({
      value: card.combinedLoungeAccess === "unlimited" ? "Unlimited" : `${card.combinedLoungeAccess}`,
      label: card.combinedLoungeAccessLabel ?? "Lounge / year"
    });
    quickFacts.push({ value: `${card.forexMarkup}%`, label: "Forex markup" });
  } else if (loungeValue) {
    quickFacts.push({
      value: card.loungeDomestic === "unlimited" ? "Unlimited" : `${card.loungeDomestic}`,
      label: "Domestic lounge / yr"
    });
    quickFacts.push({
      value: card.loungeInternational === "unlimited" ? "Unlimited" : `${card.loungeInternational}`,
      label: "International lounge / yr"
    });
  } else {
    quickFacts.push({ value: `${card.forexMarkup}%`, label: "Forex markup" });
    quickFacts.push({ value: formatCurrency(card.joiningFee), label: "Joining fee" });
  }

  const cardImageStyle = card.id === "hdfc-regalia-gold" ? { objectPosition: "center 25%" as const } : undefined;

  return (
    <div className="page-shell card-detail-page">
      <AnalyticsMount
        event={{
          event_name: "card_detail_viewed",
          page: "cards/[id]",
          source: "details",
          card_id: card.id,
          metadata: buildCardDetailMetadata(card)
        }}
      />
      <section className="page-hero">
        <div className="container page-hero-inner card-hero-grid">
          <div className="card-hero-copy">
            <div className="page-eyebrow">✦ Card detail</div>
            <h1>{card.name}</h1>
            <p className="page-hero-lead">
              A {card.rewardType} card{card.bestFor.length ? ` for ${card.bestFor.slice(0, 3).join(", ")}` : ""}.
            </p>
            <div className="card-hero-tags">
              {card.bestFor[0] ? <span className="tag primary">{titleCaseWord(card.bestFor[0])}</span> : null}
              {queryFit !== null ? <span className="tag primary">Fit for your query: {queryFit}/100</span> : null}
              {card.tags
                .filter((tag) => tag.toLowerCase() !== (card.bestFor[0] ?? "").toLowerCase())
                .map((tag) => (
                  <span className="tag" key={tag}>
                    {titleCaseWord(tag)}
                  </span>
                ))}
              {loungeValue ? <span className="tag">{loungeValue} lounge visits</span> : null}
              <span className="tag">{card.forexMarkup}% forex</span>
              <span className="tag">Last verified: {card.lastVerified}</span>
            </div>
          </div>

          <aside className="card-hero-card">
            <div className="card-hero-image">
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={`${card.name} credit card`} style={cardImageStyle} />
              ) : (
                <CardImageFallback issuer={card.issuer} name={card.name} />
              )}
            </div>
            <div className="card-hero-top">
              <div>
                <div className="issuer">{card.issuer}</div>
                <h2>{card.name}</h2>
              </div>
            </div>
            <div className="card-hero-metrics">
              {heroMetrics.map((metric) => (
                <div className="card-hero-metric" key={metric.label}>
                  <b>{metric.value}</b>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
            <div className="card-hero-actions">
              <a className="btn btn-primary" href="#calculator">
                Calculate rewards →
              </a>
              <Link className="btn btn-ghost" href={compareHref}>
                Compare before applying
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="page-content">
        <div className="container content-grid">
          <div className="main-stack">
            {take ? (
              <section className="panel" id="take">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">myCards take</h2>
                      <p className="section-sub">A quick decision view before the full facts.</p>
                    </div>
                  </div>
                  <p className="take-lead">
                    <strong>Good fit if:</strong> {take.goodFitIf}.
                  </p>
                  {take.whyItWorks || take.whereValueDrops ? (
                    <div className="take-grid">
                      {take.whyItWorks ? (
                        <article className="take good">
                          <h3>Why it can work</h3>
                          <p>{take.whyItWorks}</p>
                        </article>
                      ) : null}
                      {take.whereValueDrops ? (
                        <article className="take warn">
                          <h3>Where value may drop</h3>
                          <p>{take.whereValueDrops}</p>
                        </article>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel-body">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">Quick facts</h2>
                    <p className="section-sub">The key fields before the full details.</p>
                  </div>
                </div>
                <div className="score-grid">
                  {quickFacts.slice(0, 4).map((fact) => (
                    <div className="score" key={fact.label}>
                      <b>{fact.value}</b>
                      <span>{fact.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel" id="calculator">
              <div className="panel-body">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">Reward calculator</h2>
                    <p className="section-sub">
                      Enter your monthly spend to estimate how many {card.rewardType} you earn and what they are worth.
                    </p>
                  </div>
                </div>
                <RewardCalculator card={card} milestones={milestoneRulesForCard(card)} />
              </div>
            </section>

            {bestFor.length > 0 || avoidIf.length > 0 ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Best for / avoid if</h2>
                      <p className="section-sub">Who this card suits — and who should skip it.</p>
                    </div>
                  </div>
                  {bestFor.length ? (
                    <div className="benefit-grid">
                      {bestFor.map((item) => (
                        <article className="benefit" key={item.title}>
                          <div className="benefit-icon">{item.icon}</div>
                          <div>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {avoidIf.length ? (
                    <div className="benefit-grid" style={{ marginTop: bestFor.length ? 14 : 0 }}>
                      {avoidIf.map((item) => (
                        <article className="benefit warn" key={item.title}>
                          <div className="benefit-icon">{item.icon}</div>
                          <div>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel-body">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">Rewards and redemption</h2>
                    <p className="section-sub">Earn rates, caps, and how points convert to value.</p>
                  </div>
                </div>
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

                {hasRedemptionSection ? (
                  <div className="detail-section">
                    <h3>Redemption</h3>
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

                    {voucherPartners.length ? (
                      <div className="table-wrap">
                        <table className="compare-table compare-table-compact">
                          <thead>
                            <tr>
                              <th>Voucher partner</th>
                              <th>Programme / collection</th>
                              <th>Ratio</th>
                              {showVoucherTat && <th>TAT</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {voucherPartners.map((partner, index) => (
                              <tr key={`${partner.name}-${partner.programme}-${index}`}>
                                <td>{partner.name}</td>
                                <td>{partner.programme}</td>
                                <td>{partner.ratio}</td>
                                {showVoucherTat && <td>{formatTatDays(partner.tatDays)}</td>}
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
                  </div>
                ) : null}
              </div>
            </section>

            {loungeMilestoneRules.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Lounge and milestone rules</h2>
                      <p className="section-sub">The spend conditions worth knowing before you rely on a benefit.</p>
                    </div>
                  </div>
                  <div className="rules">
                    {loungeMilestoneRules.map((rule, index) => (
                      <div className="rule" key={`${rule.label}-${index}`}>
                        <div className="rule-num">{index + 1}</div>
                        <div>
                          <b>{rule.label}</b>
                          <span>{rule.text}</span>
                          {rule.conditions && rule.conditions.length ? (
                            <ul className="rule-conditions">
                              {rule.conditions.map((condition) => (
                                <li key={condition}>{condition}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {card.exclusions.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Exclusions</h2>
                      <p className="section-sub">Categories that earn no rewards on this card.</p>
                    </div>
                  </div>
                  <DetailList className="detail-list-columns" items={card.exclusions} />
                </div>
              </section>
            ) : null}

            {hasFinePrint ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Benefits and fine print</h2>
                      <p className="section-sub">Welcome, renewal, and other listed benefits.</p>
                    </div>
                  </div>
                  {hasJoiningBenefits ? (
                    <div className="detail-section">
                      <h3>Joining benefits</h3>
                      <DetailList items={joiningBenefitLines} />
                    </div>
                  ) : null}
                  {hasRenewalBenefits ? (
                    <div className="detail-section">
                      <h3>Renewal benefits</h3>
                      <DetailList items={renewalBenefitLines} />
                    </div>
                  ) : null}
                  {hasAdditionalBenefits ? (
                    <div className="detail-section">
                      <h3>Additional benefits</h3>
                      <DetailList items={card.additionalBenefits} />
                    </div>
                  ) : null}
                  {hasAdditionalDetails ? (
                    <div className="detail-section">
                      <h3>Additional details</h3>
                      <DetailList items={card.additionalDetails} />
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {hasEligibility ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Eligibility</h2>
                      <p className="section-sub">Check this before you apply.</p>
                    </div>
                  </div>
                  <div className="benefit-grid">
                    {card.eligibility?.salaried?.length ? (
                      <article className="benefit">
                        <div className="benefit-icon">S</div>
                        <div>
                          <h3>Salaried</h3>
                          <DetailList items={card.eligibility.salaried} />
                        </div>
                      </article>
                    ) : null}
                    {card.eligibility?.selfEmployed?.length ? (
                      <article className="benefit">
                        <div className="benefit-icon">B</div>
                        <div>
                          <h3>Self-employed</h3>
                          <DetailList items={card.eligibility.selfEmployed} />
                        </div>
                      </article>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {alternatives.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Compare before you decide</h2>
                      <p className="section-sub">Alternatives based on what you might want instead.</p>
                    </div>
                  </div>
                  <div className="alt-grid">
                    {alternatives.map((alt) => (
                      <article className="alt-card" key={alt.id}>
                        <small>{alternativeIntent(alt)}</small>
                        <h3>{alt.name}</h3>
                        <p>
                          {alt.bestFor.length ? `Best for ${alt.bestFor.slice(0, 3).join(", ")}.` : `${alt.rewardType} card.`}
                        </p>
                        <div className="alt-actions">
                          <Link className="alt-btn primary" href={`/compare?a=${card.id}&b=${alt.id}`}>
                            Compare
                          </Link>
                          <Link className="alt-btn" href={`/cards/${alt.id}`}>
                            Details
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {cardContent?.tips.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Tips</h2>
                      <p className="section-sub">Practical notes from verified sources.</p>
                    </div>
                  </div>
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
                </div>
              </section>
            ) : null}

            {cardContent?.updates.length ? (
              <section className="panel">
                <div className="panel-body">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Latest updates</h2>
                      <p className="section-sub">Recent changes to this card.</p>
                    </div>
                  </div>
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
                </div>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel-body">
                <div className="actions">
                  <TrackedExternalLink
                    analyticsEvent={{
                      event_name: "apply_clicked",
                      page: "cards/[id]",
                      source: "details",
                      card_id: card.id
                    }}
                    className="button"
                    href={card.applyUrl}
                    rel="nofollow sponsored"
                    target="_blank"
                  >
                    Apply <ExternalLink size={15} />
                  </TrackedExternalLink>
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
              </div>
            </section>
          </div>

          <aside className="side-stack card-side">
            <section className="side">
              <h3 className="side-title">Card summary</h3>
              <div className="summary">
                <div className="summary-row">
                  <span>Issuer</span>
                  <b>{card.issuer}</b>
                </div>
                <div className="summary-row">
                  <span>Joining fee</span>
                  <b>{formatCurrency(card.joiningFee)}</b>
                </div>
                <div className="summary-row">
                  <span>Annual fee</span>
                  <b>{formatCurrency(card.annualFee)}</b>
                </div>
                {hasFeeWaiverSpend(card.feeWaiverSpend) ? (
                  <div className="summary-row">
                    <span>Waiver spend</span>
                    <b>{formatRupeesCompact(card.feeWaiverSpend as number)}</b>
                  </div>
                ) : null}
                <div className="summary-row">
                  <span>Reward type</span>
                  <b>{card.rewardType}</b>
                </div>
                <div className="summary-row">
                  <span>Forex markup</span>
                  <b>{card.forexMarkup}%</b>
                </div>
                <div className="summary-row">
                  <span>Network</span>
                  <b>{card.network.join(" / ")}</b>
                </div>
              </div>
              <div className="side-actions">
                <Link className="side-action primary" href={fitQueryHref}>
                  Check if it fits me
                </Link>
                <Link className="side-action" href={compareHref}>
                  Compare cards
                </Link>
                <TrackedExternalLink
                  analyticsEvent={{
                    event_name: "apply_clicked",
                    page: "cards/[id]",
                    source: "details",
                    card_id: card.id
                  }}
                  className="side-action"
                  href={card.applyUrl}
                  rel="sponsored nofollow"
                  target="_blank"
                >
                  Apply ↗
                </TrackedExternalLink>
              </div>
              <p className="side-note">
                Some apply links may be affiliate links. Always verify final fees, eligibility, and benefits with the issuer
                before applying.
              </p>
            </section>

            <section className="side">
              <h3 className="side-title">Ask about this card</h3>
              <AskBox defaultQuery="" showHelperText={false} />
            </section>

            <section className="side">
              <h3 className="side-title">Data freshness</h3>
              <div className="summary">
                <div className="summary-row">
                  <span>Last verified</span>
                  <b>{card.lastVerified}</b>
                </div>
                {latestUpdate ? (
                  <div className="summary-row">
                    <span>Latest update</span>
                    <b>{formatUpdateDate(latestUpdate.publishedAt)}</b>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
