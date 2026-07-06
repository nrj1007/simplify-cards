import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { defaultSpendProfile, scoreCards, applyResultStrategy } from "@/lib/recommend";
import { toRecommendResult } from "@/lib/recommend-result";
import RecommendCalculator from "../ui/RecommendCalculator";

export const metadata: Metadata = buildPageMetadata({
  title: "Card Recommender by Spend",
  description:
    "Set your monthly spend across categories and see which Indian credit cards earn you the most each year, after fees.",
  path: "/recommend"
});

export default function RecommendPage() {
  const input = { spend: defaultSpendProfile, resultStrategy: "single-list" as const };
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
          <RecommendCalculator defaultSpend={defaultSpendProfile} initialSections={sections} />
        </div>
      </section>
    </div>
  );
}
