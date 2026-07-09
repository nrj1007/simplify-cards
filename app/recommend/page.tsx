import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { defaultSpendProfile, scoreCards, applyResultStrategy } from "@/lib/recommend";
import { toRecommendResult } from "@/lib/recommend-result";
import type { SpendProfile } from "@/lib/types";
import RecommendCalculator from "../ui/RecommendCalculator";

export const metadata: Metadata = buildPageMetadata({
  title: "Card Recommender by Spend",
  description:
    "Set your monthly spend across categories and see which Indian credit cards earn you the most each year, after fees.",
  path: "/recommend"
});

const recommendPageDefaultSpend: SpendProfile = {
  online: defaultSpendProfile.online ?? 0,
  base: defaultSpendProfile.base ?? 0,
  travel: 0,
  hotels: 0,
  airlines: 0,
  dining: 0,
  grocery: 0,
  fuel: 0,
  amazon: 0,
  upi: 0,
  utilities: 0,
  rent: 0,
  insurance: 0,
  education: 0,
  gold: 0,
  government: 0,
  international: 0
};

export default function RecommendPage() {
  const input = { spend: recommendPageDefaultSpend, resultStrategy: "single-list" as const };
  const scored = scoreCards(input);
  // Default view: single-list (spend-based, not a broad query — split doesn't apply here).
  // Sections shape is used so the calculator component has a unified data contract.
  const sections = applyResultStrategy(scored, input).map((section) => ({
    title: section.title,
    results: section.cards.map(toRecommendResult)
  }));

  return (
    <div className="page-shell recommend-page">
      <section className="page-hero">
        <div className="container page-hero-inner">
          <h1 className="smallcaps-compare recommend-heading">recommend</h1>
        </div>
      </section>
      <section className="page-content">
        <div className="container">
          <RecommendCalculator defaultSpend={recommendPageDefaultSpend} initialSections={sections} />
        </div>
      </section>
    </div>
  );
}
