import { ExternalLink } from "lucide-react";
import { TrackedExternalLink, TrackedLink } from "./TrackedLink";
import type { CardScore, CreditCard } from "@/lib/types";
import { getTotalLoungeAccess } from "@/lib/lounge";
import { cardCtaHref, cardCtaLabel, cardCtaRel } from "@/lib/card-links";

type Props = {
  card?: CreditCard;
  score?: CardScore;
  analyticsPage?: string;
  analyticsSource?: "ask" | "finder" | "compare" | "recommend" | "details";
  analyticsQuery?: string;
};

export default function CardTile({
  card,
  score,
  analyticsPage = "finder",
  analyticsSource = "finder",
  analyticsQuery
}: Props) {
  const resolvedCard = card ?? score?.card;
  if (!resolvedCard) return null;
  const totalLoungeAccess = getTotalLoungeAccess(resolvedCard);
  const loungeVisits = totalLoungeAccess === "unlimited" ? "Unlimited" : String(totalLoungeAccess);
  const rankLabel = resolvedCard.tags[0] ?? resolvedCard.rewardType;
  const ctaLabel = cardCtaLabel(resolvedCard);
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
          <b>₹ {resolvedCard.annualFee}</b>
          <span>Annual fee</span>
        </div>
        <div className="metric">
          <b>{loungeVisits}</b>
          <span>Lounge visits</span>
        </div>
      </div>

      <p className="why">{why}</p>

      <div className="card-actions">
        <TrackedLink
          analyticsEvent={{
            event_name: "details_clicked",
            page: analyticsPage,
            source: analyticsSource,
            query: analyticsQuery,
            card_id: resolvedCard.id
          }}
          className="action-secondary"
          href={`/cards/${resolvedCard.id}`}
        >
          Details
        </TrackedLink>
        <TrackedExternalLink
          analyticsEvent={{
            event_name: "apply_clicked",
            page: analyticsPage,
            source: analyticsSource,
            query: analyticsQuery,
            card_id: resolvedCard.id
          }}
          className="action-primary"
          href={cardCtaHref(resolvedCard)}
          rel={cardCtaRel(resolvedCard)}
          target="_blank"
        >
          {ctaLabel} <ExternalLink size={14} style={{ verticalAlign: "-2px" }} />
        </TrackedExternalLink>
      </div>
    </article>
  );
}
