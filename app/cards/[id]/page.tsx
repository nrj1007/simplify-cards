import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cards, getCardById } from "@/lib/cards";
import type { CreditCard, Redemption } from "@/lib/types";
import VerificationBadge, { getVerificationMeta } from "@/app/ui/VerificationBadge";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return cards.map((card) => ({ id: card.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const card = getCardById(id);
  return {
    title: card ? `${card.name} Review | Card AI India` : "Card Review"
  };
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not listed";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function loungeText(card: CreditCard) {
  if (card.loungeDomestic === "unlimited" || card.loungeInternational === "unlimited") return "Unlimited";
  return `${card.loungeDomestic + card.loungeInternational}`;
}

function redemptionRows(redemption?: Redemption) {
  if (!redemption) return [];

  return [
    ["Statement balance", redemption.statementBalanceValue],
    ["SmartBuy flight/hotel", redemption.smartBuyFlightHotelValue],
    ["Air miles", redemption.airMilesValue],
    ["Minimum points for statement credit", redemption.minimumPointsForStatementCredit],
    ["Monthly redemption cap", redemption.cashbackRedemptionCapMonthly],
    ["Points validity", redemption.pointsExpiryYears],
    ["Redemption fee", redemption.redemptionFee]
  ].filter((row): row is [string, number] => typeof row[1] === "number");
}

function valueLabel(label: string, value: number) {
  if (label === "Points validity") return `${value} year${value === 1 ? "" : "s"}`;
  if (label === "Redemption fee") return formatCurrency(value);
  if (label.includes("Minimum") || label.includes("cap")) return value.toLocaleString("en-IN");
  return `Rs ${value}`;
}

function DetailList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <p className="muted">Not listed.</p>;

  return (
    <ul className="detail-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function CardPage({ params }: Props) {
  const { id } = await params;
  const card = getCardById(id);
  if (!card) notFound();
  const redemptions = redemptionRows(card.redemption);
  const verification = getVerificationMeta(card.verificationStatus);

  return (
    <section className="section">
      <div className="page-title">
        <p>{card.issuer}</p>
        <h1>{card.name}</h1>
        <div className="page-title-meta">
          <VerificationBadge status={card.verificationStatus} />
          <span>Last verified: {card.lastVerified}</span>
        </div>
      </div>

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
            <div className="stat">
              <strong>{loungeText(card)}</strong>
              <span>Total lounge visits listed</span>
            </div>
            <div className="stat">
              <strong>{card.forexMarkup}%</strong>
              <span>Forex markup</span>
            </div>
            <div className="stat">
              <strong>{formatCurrency(card.feeWaiverSpend)}</strong>
              <span>Fee waiver spend</span>
            </div>
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
                    <th>Monthly cap</th>
                  </tr>
                </thead>
                <tbody>
                  {card.rewards.map((reward) => (
                    <tr key={reward.category}>
                      <td>{reward.category}</td>
                      <td>{reward.rate}%</td>
                      <td>{reward.capMonthly ? formatCurrency(reward.capMonthly) : "No cap listed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="detail-section">
            <h2>Milestone Benefits</h2>
            <DetailList items={card.milestoneBenefits} />
          </section>

          <section className="detail-section">
            <h2>Additional Benefits</h2>
            <DetailList items={card.additionalBenefits} />
          </section>

          <section className="detail-section">
            <h2>Exclusions</h2>
            <DetailList items={card.exclusions} />
          </section>

          <section className="detail-section">
            <h2>Eligibility</h2>
            <div className="split-grid">
              <div>
                <h3>Salaried</h3>
                <DetailList items={card.eligibility?.salaried} />
              </div>
              <div>
                <h3>Self-employed</h3>
                <DetailList items={card.eligibility?.selfEmployed} />
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h2>Redemption</h2>
            {redemptions.length > 0 ? (
              <div className="info-grid">
                {redemptions.map(([label, value]) => (
                  <div className="info-row" key={label}>
                    <span>{label}</span>
                    <strong>{valueLabel(label, value)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Not listed.</p>
            )}
          </section>

          {card.interestRateMonthly ? (
            <section className="detail-section">
              <h2>Interest</h2>
              <p className="muted">{card.interestRateMonthly}% monthly interest rate listed in source data.</p>
            </section>
          ) : null}

          <div className="notice">
            Disclosure: this product may earn commission from some links. Recommendations should stay based on card fit,
            not payout. Final terms are subject to the issuer's latest policies. Verification status:{" "}
            {verification.label.toLowerCase()}.
          </div>

          <div className="actions">
            <a className="button" href={card.applyUrl} rel="nofollow sponsored" target="_blank">
              Apply <ExternalLink size={15} />
            </a>
            <a className="button secondary" href={card.sourceUrl} rel="nofollow" target="_blank">
              Source <ExternalLink size={15} />
            </a>
          </div>
        </article>

        <aside className="detail-aside">
          <div className="ad-slot">Ad slot: card detail page</div>
          <div className="panel card">
            <h2>Trust & Source</h2>
            <VerificationBadge status={card.verificationStatus} lastVerified={card.lastVerified} variant="full" />
            <div className="info-grid">
              <div className="info-row">
                <span>Issuer</span>
                <strong>{card.issuer}</strong>
              </div>
              <div className="info-row">
                <span>Reward type</span>
                <strong>{card.rewardType}</strong>
              </div>
            </div>
            <a className="button secondary" href={card.sourceUrl} rel="nofollow" target="_blank">
              Open source <ExternalLink size={15} />
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
