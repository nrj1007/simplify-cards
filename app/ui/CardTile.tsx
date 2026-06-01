import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { CardScore, CreditCard } from "@/lib/types";
import { getTotalLoungeAccess } from "@/lib/lounge";

type Props = {
  card?: CreditCard;
  score?: CardScore;
};

export default function CardTile({ card, score }: Props) {
  const resolvedCard = card ?? score?.card;
  if (!resolvedCard) return null;
  const totalLoungeAccess = getTotalLoungeAccess(resolvedCard);
  const loungeVisits = totalLoungeAccess === "unlimited" ? "Unlimited" : String(totalLoungeAccess);
  const rankLabel = resolvedCard.tags[0] ?? resolvedCard.rewardType;
  const why =
    resolvedCard.bestFor.length > 0
      ? `Good for ${resolvedCard.bestFor.slice(0, 2).join(", ").toLowerCase()}.`
      : `${resolvedCard.rewardType} rewards from ${resolvedCard.issuer}.`;

  return (
    <article className="card-tile">
      <div className="card-header">
        <div>
          <div className="issuer">{resolvedCard.issuer}</div>
          <h3>{resolvedCard.name}</h3>
        </div>
        {rankLabel ? <div className="rank-chip">{rankLabel}</div> : null}
      </div>

      <div className="tag-row">
        {resolvedCard.tags.slice(0, 3).map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="metric-grid">
        <div className="metric">
          <b>Rs {resolvedCard.annualFee}</b>
          <span>Annual fee</span>
        </div>
        <div className="metric">
          <b>{loungeVisits}</b>
          <span>Lounge visits</span>
        </div>
      </div>

      <p className="why">{why}</p>

      <div className="card-actions">
        <Link className="action-secondary" href={`/cards/${resolvedCard.id}`}>
          Details
        </Link>
        <a className="action-primary" href={resolvedCard.applyUrl} rel="nofollow sponsored" target="_blank">
          Apply <ExternalLink size={14} style={{ verticalAlign: "-2px" }} />
        </a>
      </div>
    </article>
  );
}
