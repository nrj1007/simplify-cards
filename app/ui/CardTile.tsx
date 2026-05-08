import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { CardScore, CreditCard } from "@/lib/types";

type Props = {
  card?: CreditCard;
  score?: CardScore;
};

export default function CardTile({ card, score }: Props) {
  const resolvedCard = card ?? score?.card;
  if (!resolvedCard) return null;
  const loungeVisits =
    resolvedCard.loungeDomestic === "unlimited" || resolvedCard.loungeInternational === "unlimited"
      ? "Unlimited"
      : String(resolvedCard.loungeDomestic + resolvedCard.loungeInternational);

  return (
    <article className="panel card">
      <div>
        <div className="meta">{resolvedCard.issuer}</div>
        <h3>{resolvedCard.name}</h3>
      </div>
      <div className="meta">
        {resolvedCard.tags.slice(0, 4).map((tag) => (
          <span className="badge" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="stats">
        <div className="stat">
          <strong>Rs {resolvedCard.annualFee}</strong>
          <span>Annual fee</span>
        </div>
        <div className="stat">
          <strong>{loungeVisits}</strong>
          <span>Lounge visits</span>
        </div>
      </div>
      {score ? (
        <p className="muted" style={{ margin: 0 }}>
          Estimated value: Rs {score.estimatedAnnualRewards.toLocaleString("en-IN")} yearly rewards before caveats.
        </p>
      ) : null}
      <div className="actions">
        <Link className="button secondary" href={`/cards/${resolvedCard.id}`}>
          Details
        </Link>
        <a className="button" href={resolvedCard.applyUrl} rel="nofollow sponsored" target="_blank">
          Apply <ExternalLink size={15} />
        </a>
      </div>
    </article>
  );
}
