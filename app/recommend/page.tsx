import type { Metadata } from "next";
import { defaultSpendProfile, scoreCards } from "@/lib/recommend";
import { rankResults } from "@/lib/recommend-result";
import RecommendCalculator from "../ui/RecommendCalculator";
import PageHero from "../ui/PageHero";

export const metadata: Metadata = {
  title: "Card Recommender by Spend | Card AI India",
  description:
    "Set your monthly spend across categories and see which Indian credit cards earn you the most each year, after fees."
};

export default function RecommendPage() {
  const initialResults = rankResults(scoreCards({ spend: defaultSpendProfile }));

  return (
    <div className="page-shell">
      <PageHero
        eyebrow="✦ Spend recommender"
        title="Find your best card by spend"
        lead="Set your monthly spend and we'll rank the cards that earn you the most each year, after fees."
      />
      <section className="page-content">
        <div className="container">
          <RecommendCalculator defaultSpend={defaultSpendProfile} initialResults={initialResults} />
        </div>
      </section>
    </div>
  );
}
