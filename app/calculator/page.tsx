import type { Metadata } from "next";
import CalculatorPicker from "@/app/ui/CalculatorPicker";
import RewardCalculator from "@/app/ui/RewardCalculator";
import { cards, getCardById } from "@/lib/cards";
import { milestoneRulesForCard } from "@/lib/recommend";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Reward Calculator",
  description:
    "Estimate the rewards and rupee value you earn on any Indian credit card based on your monthly spend, including milestone benefits.",
  path: "/calculator"
});

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
    <div className="page-shell calculator-modern-shell">
      <section className="page-hero calculator-page-hero" aria-labelledby="calculator-page-title">
        <div className="container page-hero-inner">
          <h1 id="calculator-page-title">calculator</h1>
        </div>
      </section>
      <section className="page-content">
        <div className="container">
          {card ? (
            <RewardCalculator
              key={card.id}
              card={card}
              milestones={milestoneRulesForCard(card)}
              picker={<CalculatorPicker cards={cardOptions} selectedCardId={card.id} variant="calculator" />}
              variant="calculator"
            />
          ) : (
            <div className="calc calculator-layout-shell">
              <div className="calc-grid calculator-recommend-layout progressive-flow is-selection-only" data-step="selection">
                <div className="calc-inputs spend-profile recommend-controls">
                  <div className="spend-profile-head recommend-controls-head card-picker-head">
                    <h2>Pick card of your choice</h2>
                  </div>
                  <CalculatorPicker cards={cardOptions} variant="calculator" />
                </div>
                <div className="calc-output recommend-results-panel calculator-results-panel">
                  <aside className="calculator-empty-guide" aria-live="polite" aria-label="How the reward calculator works">
                    <div className="empty-guide-selection-copy">
                      <h2>See your reward forecast</h2>
                      <p className="empty-guide-description">Select an issuer and credit card to begin</p>
                    </div>
                    <ol className="empty-guide-steps">
                      <li className="empty-guide-step">
                        <span className="empty-guide-step-number">1</span>
                        <strong>Pick a card</strong>
                      </li>
                      <li className="empty-guide-step">
                        <span className="empty-guide-step-number">2</span>
                        <strong>Add spends</strong>
                      </li>
                      <li className="empty-guide-step">
                        <span className="empty-guide-step-number">3</span>
                        <strong>View rewards</strong>
                      </li>
                    </ol>
                  </aside>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
