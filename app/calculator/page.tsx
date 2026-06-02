import Link from "next/link";
import type { Metadata } from "next";
import CalculatorPicker from "@/app/ui/CalculatorPicker";
import RewardCalculator from "@/app/ui/RewardCalculator";
import { cards, getCardById } from "@/lib/cards";
import { milestoneRulesForCard } from "@/lib/recommend";

export const metadata: Metadata = {
  title: "Reward Calculator | myCards",
  description:
    "Estimate the rewards and rupee value you earn on any Indian credit card based on your monthly spend, including milestone benefits."
};

type Props = {
  searchParams: Promise<{ card?: string }>;
};

export default async function CalculatorPage({ searchParams }: Props) {
  const { card: cardId } = await searchParams;
  const card = cardId ? getCardById(cardId) : undefined;

  const cardOptions = cards
    .map((item) => ({ id: item.id, name: item.name, issuer: item.issuer }))
    .sort((a, b) => a.issuer.localeCompare(b.issuer) || a.name.localeCompare(b.name));

  return (
    <section className="section">
      <div className="page-title">
        <h1>Reward calculator</h1>
        <p>Pick any bank and card, then enter your monthly spend to estimate what you earn and what it is worth.</p>
      </div>

      <div className="panel card" style={{ marginTop: 18 }}>
        <CalculatorPicker cards={cardOptions} selectedCardId={card?.id} />
      </div>

      {card ? (
        <div className="panel card" style={{ marginTop: 18 }}>
          <div className="page-header-wrap" style={{ marginBottom: 0 }}>
            <div>
              <div className="issuer">{card.issuer}</div>
              <h2 style={{ margin: 0 }}>{card.name}</h2>
            </div>
            <Link className="button secondary" href={`/cards/${card.id}`}>
              View full card
            </Link>
          </div>
          <p className="muted calc-intro">
            Enter your monthly spend to estimate how many {card.rewardType} you earn and what they are worth across each
            redemption option.
          </p>
          <RewardCalculator card={card} milestones={milestoneRulesForCard(card)} />
        </div>
      ) : (
        <div className="panel card" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            Select a bank and card above to calculate your rewards.
          </p>
        </div>
      )}
    </section>
  );
}
