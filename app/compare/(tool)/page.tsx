import Link from "next/link";
import type { Metadata } from "next";
import { cards } from "@/lib/cards";
import { logAnalyticsEvent } from "@/lib/analytics-logs";
import { getLoungeConditions } from "@/lib/lounge";
import LoungeInfo from "@/app/ui/LoungeInfo";
import ComparePicker from "@/app/ui/ComparePicker";
import { TrackedExternalLink, TrackedLink } from "@/app/ui/TrackedLink";
import { stripScoringAnnotations } from "@/lib/card-index";
import { buildPageMetadata } from "@/lib/seo";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";

type Card = (typeof cards)[number];

type Props = {
  searchParams: Promise<{
    a?: string;
    b?: string;
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const first = cards.find((card) => card.id === (params.a ?? "sbi-cashback")) ?? cards[0];
  const second = cards.find((card) => card.id === (params.b ?? "hdfc-millennia")) ?? cards[1];

  return buildPageMetadata({
    title: `Compare ${first.name} vs ${second.name}`,
    description: `Compare ${first.name} and ${second.name} across fees, rewards, lounge access, milestone benefits, redemption, and exclusions.`,
    path: "/compare"
  });
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
    return `${reward.rate} ${card.rewardType} / ₹100`;
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
    parts.push(`SmartBuy travel: upto ₹ ${card.redemption.smartBuyFlightHotelValue} per point`);
  }
  if (typeof card.redemption.travelEdgeValue === "number") {
    parts.push(`Travel EDGE travel: upto ₹ ${card.redemption.travelEdgeValue} per point`);
  }
  if (typeof card.redemption.airMilesValue === "number") {
    parts.push(`Air miles: upto ₹ ${card.redemption.airMilesValue} per point`);
  }
  if (typeof card.redemption.statementBalanceValue === "number") {
    parts.push(`Statement credit: upto ₹ ${card.redemption.statementBalanceValue} per point`);
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
          href={`/cards/${card.id}`}
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

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams;
  const first = params.a ? cards.find((card) => card.id === params.a) : undefined;
  const second = params.b ? cards.find((card) => card.id === params.b) : undefined;
  const showComparison = Boolean(first && second);
  const showFeeWaiverRow = Boolean(
    first && second && (hasFeeWaiverSpend(first.feeWaiverSpend) || hasFeeWaiverSpend(second.feeWaiverSpend))
  );
  const pickerCards = cards
    .map(({ id, issuer, name }) => ({ id, issuer, name }))
    .sort((a, b) => a.issuer.localeCompare(b.issuer) || a.name.localeCompare(b.name));

  if (first && second) {
    await logAnalyticsEvent({
      event_name: "compare_viewed",
      page: "compare",
      source: "compare",
      card_ids: [first.id, second.id]
    });
  }

  return (
    <div className={`page-shell compare-reference-page${showComparison ? " has-results" : " is-empty"}`}>
      <section className="compare-reference-hero">
        <div className="container"><h1>Compare</h1></div>
      </section>
      <section className="page-content">
        <div className="container">
          <ComparePicker cards={pickerCards} initialFirst={first?.id} initialSecond={second?.id} />

      {first && second ? (
        <>
      <div className="grid compare-overview">
        <CompareOverviewCard card={first} />
        <CompareOverviewCard card={second} />
      </div>

      <div className="panel compare-table-shell">
        <div className="table-wrap">
          <table className="compare-table compare-table-rich">
            <thead>
              <tr>
                <th>Feature</th>
                <th>{first.name}</th>
                <th>{second.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Issuer</td>
                <td>{first.issuer}</td>
                <td>{second.issuer}</td>
              </tr>
              <tr>
                <td>Network</td>
                <td>{first.network.join(", ")}</td>
                <td>{second.network.join(", ")}</td>
              </tr>
              <tr>
                <td>Joining fee</td>
                <td>{formatCurrency(first.joiningFee)}</td>
                <td>{formatCurrency(second.joiningFee)}</td>
              </tr>
              <tr>
                <td>Annual fee</td>
                <td>{formatCurrency(first.annualFee)}</td>
                <td>{formatCurrency(second.annualFee)}</td>
              </tr>
              {showFeeWaiverRow ? (
                <tr>
                  <td>Fee waiver spend</td>
                  <td>{hasFeeWaiverSpend(first.feeWaiverSpend) ? formatCurrency(first.feeWaiverSpend) : "-"}</td>
                  <td>{hasFeeWaiverSpend(second.feeWaiverSpend) ? formatCurrency(second.feeWaiverSpend) : "-"}</td>
                </tr>
              ) : null}
              <tr>
                <td>Reward type</td>
                <td>{first.rewardType}</td>
                <td>{second.rewardType}</td>
              </tr>
              <tr>
                <td>Best for</td>
                <td>{first.bestFor.join(", ")}</td>
                <td>{second.bestFor.join(", ")}</td>
              </tr>
              <tr>
                <td>Top reward categories</td>
                <td>{rewardSummary(first)}</td>
                <td>{rewardSummary(second)}</td>
              </tr>
              <tr>
                <td>SmartBuy / accelerated caps</td>
                <td>{smartbuyCapSummary(first)}</td>
                <td>{smartbuyCapSummary(second)}</td>
              </tr>
              <tr>
                <td>Domestic lounge</td>
                <td>{loungeValue(first.loungeDomestic)}</td>
                <td>{loungeValue(second.loungeDomestic)}</td>
              </tr>
              <tr>
                <td>International lounge</td>
                <td>{loungeValue(first.loungeInternational)}</td>
                <td>{loungeValue(second.loungeInternational)}</td>
              </tr>
              <tr>
                <td>Forex markup</td>
                <td>{first.forexMarkup}%</td>
                <td>{second.forexMarkup}%</td>
              </tr>
              <tr>
                <td>Milestone benefits</td>
                <td>{milestoneSummary(first)}</td>
                <td>{milestoneSummary(second)}</td>
              </tr>
              <tr>
                <td>Redemption</td>
                <td>{redemptionSummary(first)}</td>
                <td>{redemptionSummary(second)}</td>
              </tr>
              <tr>
                <td>Key exclusions</td>
                <td>{listPreview(first.exclusions, 6)}</td>
                <td>{listPreview(second.exclusions, 6)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : null}
        </div>
      </section>
    </div>
  );
}
