import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, Search, Sparkles } from "lucide-react";
import { scoreCards } from "@/lib/recommend";
import CardTile from "./ui/CardTile";
import AskBox from "./ui/AskBox";

export default function Home() {
  const topCards = scoreCards({ query: "best cashback online lounge", maxAnnualFee: 5000 }).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Find the right Indian credit card without decoding every fee table.</h1>
          <p>
            Ask in plain English, compare cards by actual use case, and keep recommendations grounded in verified card
            data. Built lean with in-memory data for the MVP.
          </p>
          <div className="chips" style={{ marginTop: 20 }}>
            <span className="chip">
              <Search size={15} /> Cashback
            </span>
            <span className="chip">
              <Sparkles size={15} /> Lounge
            </span>
            <span className="chip">
              <BadgeIndianRupee size={15} /> Lifetime free
            </span>
          </div>
        </div>
        <AskBox />
      </section>

      <section className="section">
        <div className="ad-slot">Ad slot: top informational banner</div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Recommended Starting Points</h2>
            <p>Sample rankings from the deterministic card engine.</p>
          </div>
          <Link className="button secondary" href="/finder">
            Open finder <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid cards">
          {topCards.map((score) => (
            <CardTile key={score.card.id} score={score} />
          ))}
        </div>
      </section>
    </>
  );
}
