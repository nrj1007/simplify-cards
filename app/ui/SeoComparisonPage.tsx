import type { Route } from "next";
import { notFound } from "next/navigation";
import LoungeInfo from "@/app/ui/LoungeInfo";
import { TrackedExternalLink, TrackedLink } from "@/app/ui/TrackedLink";
import { cards } from "@/lib/cards";
import { stripScoringAnnotations } from "@/lib/card-index";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";
import { getLoungeConditions } from "@/lib/lounge";
import {
  comparisonPageTitle,
  getSeoComparison,
  getSeoComparisonCards
} from "@/lib/seo-comparisons";

type Card = (typeof cards)[number];

type Props = {
  slug: string;
};

function cardHref(cardId: string) {
  return `/cards/${cardId}` as Route;
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not Listed";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function hasFeeWaiverSpend(value: number | null | undefined) {
  return typeof value === "number" && value > 0;
}

function formatRewardCap(value: number | null | undefined, rewardType: string) {
  if (!value) return "-";
  return `${value.toLocaleString("en-IN")} ${rewardType}`;
}

function loungeValue(value: Card["loungeDomestic"] | Card["loungeInternational"]) {
  return value === "unlimited" ? "Unlimited" : `${value}`;
}

function rewardRateLabel(card: Card, reward: Card["rewards"][number]) {
  if (reward.displayRate) return reward.displayRate;

  const rewardType = card.rewardType.toLowerCase();
  if (rewardType.includes("point") || rewardType.includes("mile")) {
    return `${reward.rate} ${card.rewardType} / Rs 100`;
  }

  return `${reward.rate}%`;
}

function rewardSummary(card: Card) {
  return card.rewards
    .filter((reward) => !reward.hidden)
    .slice(0, 3)
    .map((reward) => `${reward.displayCategory ?? reward.category}: ${rewardRateLabel(card, reward)}`)
    .join("; ");
}

function smartbuyCapSummary(card: Card) {
  const smartbuyRewards = card.rewards.filter((reward) => reward.category.includes("smartbuy"));
  if (smartbuyRewards.length === 0) return "Not Listed";

  const caps = smartbuyRewards.map((reward) => {
    const parts = [];
    if (reward.capDaily) parts.push(`daily ${formatRewardCap(reward.capDaily, card.rewardType)}`);
    if (reward.capMonthly) parts.push(`monthly ${formatRewardCap(reward.capMonthly, card.rewardType)}`);
    return `${reward.category}: ${parts.length ? parts.join(", ") : "no cap listed"}`;
  });

  return caps.join("; ");
}

function redemptionSummary(card: Card) {
  if (!card.redemption) return "Not Listed";

  const parts: string[] = [];
  if (typeof card.redemption.smartBuyFlightHotelValue === "number") {
    parts.push(`SmartBuy travel: upto Rs ${card.redemption.smartBuyFlightHotelValue} per point`);
  }
  if (typeof card.redemption.travelEdgeValue === "number") {
    parts.push(`Travel EDGE travel: upto Rs ${card.redemption.travelEdgeValue} per point`);
  }
  if (typeof card.redemption.airMilesValue === "number") {
    parts.push(`Air miles: upto Rs ${card.redemption.airMilesValue} per point`);
  }
  if (typeof card.redemption.statementBalanceValue === "number") {
    parts.push(`Statement credit: upto Rs ${card.redemption.statementBalanceValue} per point`);
  }

  return parts.length ? parts.join("; ") : "Not Listed";
}

function listPreview(items: string[] | undefined, count = 4) {
  if (!items || items.length === 0) return "Not Listed";
  return items.slice(0, count).map(stripScoringAnnotations).join(", ");
}

function milestoneSummary(card: Card) {
  return listPreview(card.milestoneBenefits, 4);
}

function CompareOverviewCard({ card }: { card: Card }) {
  const loungeConditions = getLoungeConditions(card);
  const showFeeWaiver = hasFeeWaiverSpend(card.feeWaiverSpend);

  return (
    <article className="panel card compare-card">
      <div>
        <div className="meta">
          <span>{card.issuer}</span>
        </div>
        <h2>{card.name}</h2>
      </div>

      <div className="meta">
        {card.tags.slice(0, 5).map((tag) => (
          <span className="badge" key={`${card.id}-${tag}`}>
            {tag}
          </span>
        ))}
      </div>

      <div className="stats compare-card-stats">
        <div className="stat">
          <strong>{formatCurrency(card.annualFee)}</strong>
          <span>Annual fee</span>
        </div>
        {showFeeWaiver ? (
          <div className="stat">
            <strong>{formatCurrency(card.feeWaiverSpend)}</strong>
            <span>Fee waiver spend</span>
          </div>
        ) : null}
        <div className="stat">
          <strong>{loungeValue(card.loungeDomestic)}</strong>
          <span className="stat-label">
            Domestic lounge
            <LoungeInfo items={loungeConditions} label="Domestic lounge conditions" />
          </span>
        </div>
        <div className="stat">
          <strong>{card.forexMarkup}%</strong>
          <span>Forex markup</span>
        </div>
      </div>

      <div className="compare-card-section">
        <strong>Best for</strong>
        <p className="muted">{card.bestFor.join(", ")}</p>
      </div>

      <div className="compare-card-section">
        <strong>Top rewards</strong>
        <p className="muted">{rewardSummary(card)}</p>
      </div>

      <div className="actions">
        <TrackedLink
          analyticsEvent={{
            event_name: "details_clicked",
            page: "compare",
            source: "compare",
            card_id: card.id
          }}
          className="button secondary details-link"
          href={cardHref(card.id)}
        >
          Click for more details →
        </TrackedLink>
        <TrackedExternalLink
          analyticsEvent={{
            event_name: "apply_clicked",
            page: "compare",
            source: "compare",
            card_id: card.id
          }}
          className="button apply-now-button"
          href={cardCtaHref(card)}
          rel={cardCtaRel(card)}
          target="_blank"
        >
          {cardCtaLabel(card) === "Apply" ? "Apply now" : cardCtaLabel(card)}
        </TrackedExternalLink>
      </div>
    </article>
  );
}

export default function SeoComparisonPage({ slug }: Props) {
  const config = getSeoComparison(slug);
  const pair = config ? getSeoComparisonCards(config) : null;
  if (!config || !pair) notFound();

  const { cardA, cardB } = pair;
  const showFeeWaiverRow = hasFeeWaiverSpend(cardA.feeWaiverSpend) || hasFeeWaiverSpend(cardB.feeWaiverSpend);

  return (
    <div className="page-shell compare-reference-page has-results">
      <section className="compare-reference-hero">
        <div className="container">
          <h1>{comparisonPageTitle(config)}</h1>
        </div>
      </section>
      <section className="page-content">
        <div className="container">
          <div className="grid compare-overview">
            <CompareOverviewCard card={cardA} />
            <CompareOverviewCard card={cardB} />
          </div>

          <div className="panel compare-table-shell">
            <div className="table-wrap">
              <table className="compare-table compare-table-rich">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>{cardA.name}</th>
                    <th>{cardB.name}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Issuer</td>
                    <td>{cardA.issuer}</td>
                    <td>{cardB.issuer}</td>
                  </tr>
                  <tr>
                    <td>Network</td>
                    <td>{cardA.network.join(", ")}</td>
                    <td>{cardB.network.join(", ")}</td>
                  </tr>
                  <tr>
                    <td>Joining fee</td>
                    <td>{formatCurrency(cardA.joiningFee)}</td>
                    <td>{formatCurrency(cardB.joiningFee)}</td>
                  </tr>
                  <tr>
                    <td>Annual fee</td>
                    <td>{formatCurrency(cardA.annualFee)}</td>
                    <td>{formatCurrency(cardB.annualFee)}</td>
                  </tr>
                  {showFeeWaiverRow ? (
                    <tr>
                      <td>Fee waiver spend</td>
                      <td>{hasFeeWaiverSpend(cardA.feeWaiverSpend) ? formatCurrency(cardA.feeWaiverSpend) : "-"}</td>
                      <td>{hasFeeWaiverSpend(cardB.feeWaiverSpend) ? formatCurrency(cardB.feeWaiverSpend) : "-"}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td>Reward type</td>
                    <td>{cardA.rewardType}</td>
                    <td>{cardB.rewardType}</td>
                  </tr>
                  <tr>
                    <td>Best for</td>
                    <td>{cardA.bestFor.join(", ")}</td>
                    <td>{cardB.bestFor.join(", ")}</td>
                  </tr>
                  <tr>
                    <td>Top reward categories</td>
                    <td>{rewardSummary(cardA)}</td>
                    <td>{rewardSummary(cardB)}</td>
                  </tr>
                  <tr>
                    <td>SmartBuy / accelerated caps</td>
                    <td>{smartbuyCapSummary(cardA)}</td>
                    <td>{smartbuyCapSummary(cardB)}</td>
                  </tr>
                  <tr>
                    <td>Domestic lounge</td>
                    <td>{loungeValue(cardA.loungeDomestic)}</td>
                    <td>{loungeValue(cardB.loungeDomestic)}</td>
                  </tr>
                  <tr>
                    <td>International lounge</td>
                    <td>{loungeValue(cardA.loungeInternational)}</td>
                    <td>{loungeValue(cardB.loungeInternational)}</td>
                  </tr>
                  <tr>
                    <td>Forex markup</td>
                    <td>{cardA.forexMarkup}%</td>
                    <td>{cardB.forexMarkup}%</td>
                  </tr>
                  <tr>
                    <td>Milestone benefits</td>
                    <td>{milestoneSummary(cardA)}</td>
                    <td>{milestoneSummary(cardB)}</td>
                  </tr>
                  <tr>
                    <td>Redemption</td>
                    <td>{redemptionSummary(cardA)}</td>
                    <td>{redemptionSummary(cardB)}</td>
                  </tr>
                  <tr>
                    <td>Key exclusions</td>
                    <td>{listPreview(cardA.exclusions, 6)}</td>
                    <td>{listPreview(cardB.exclusions, 6)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
