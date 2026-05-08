import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cards, getCardById } from "@/lib/cards";

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

export default async function CardPage({ params }: Props) {
  const { id } = await params;
  const card = getCardById(id);
  if (!card) notFound();

  return (
    <section className="section">
      <div className="page-title">
        <p>{card.issuer}</p>
        <h1>{card.name}</h1>
        <p>Last verified: {card.lastVerified}. Always check final terms on the issuer page before applying.</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr)", marginTop: 18 }}>
        <div className="panel card">
          <div className="stats">
            <div className="stat">
              <strong>Rs {card.joiningFee}</strong>
              <span>Joining fee</span>
            </div>
            <div className="stat">
              <strong>Rs {card.annualFee}</strong>
              <span>Annual fee</span>
            </div>
            <div className="stat">
              <strong>{card.loungeDomestic + card.loungeInternational}</strong>
              <span>Total lounge visits listed</span>
            </div>
            <div className="stat">
              <strong>{card.forexMarkup}%</strong>
              <span>Forex markup</span>
            </div>
          </div>
          <div className="meta">
            {card.tags.map((tag) => (
              <span className="badge" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div>
            <h2>Rewards</h2>
            <ul>
              {card.rewards.map((reward) => (
                <li key={reward.category}>
                  {reward.rate}% equivalent on {reward.category}
                  {reward.capMonthly ? `, capped at Rs ${reward.capMonthly}/month` : ""}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Exclusions</h2>
            <p className="muted">{card.exclusions.join(", ")}</p>
          </div>
          <div className="notice">
            Disclosure: this product may earn commission from some links. Recommendations should stay based on card fit,
            not payout.
          </div>
          <div className="actions">
            <a className="button" href={card.applyUrl} rel="nofollow sponsored" target="_blank">
              Apply <ExternalLink size={15} />
            </a>
            <a className="button secondary" href={card.sourceUrl} rel="nofollow" target="_blank">
              Source <ExternalLink size={15} />
            </a>
          </div>
        </div>
        <div className="ad-slot">Ad slot: card detail page</div>
      </div>
    </section>
  );
}
