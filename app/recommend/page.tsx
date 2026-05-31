import type { Metadata } from "next";
import { defaultSpendProfile, scoreCards } from "@/lib/recommend";
import { rankResults } from "@/lib/recommend-result";
import RecommendCalculator from "../ui/RecommendCalculator";

export const metadata: Metadata = {
  title: "Card Recommender by Spend | Card AI India",
  description:
    "Set your monthly spend across categories and see which Indian credit cards earn you the most each year, after fees."
};

export default function RecommendPage() {
  const initialResults = rankResults(scoreCards({ spend: defaultSpendProfile }));

  return (
    <section className="section">
      <div className="page-title">
        <h1>Find your best card by spend</h1>
        <p>Set your monthly spend and we&apos;ll rank the cards that earn you the most each year, after fees.</p>
      </div>
      <RecommendCalculator defaultSpend={defaultSpendProfile} initialResults={initialResults} />
    </section>
  );
}
