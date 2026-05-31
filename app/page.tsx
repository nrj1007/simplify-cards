import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, Search, Sparkles } from "lucide-react";
import { scoreCards } from "@/lib/recommend";
import CardTile from "./ui/CardTile";
import AskBox from "./ui/AskBox";

const HOW_IT_WORKS = [
  {
    icon: "💬",
    title: "Ask in plain English",
    desc: "No jargon. Describe what you need — cashback, lounge, travel, low fees.",
  },
  {
    icon: "✅",
    title: "Matched to verified data",
    desc: "We compare against manually verified card facts, not generic web results.",
  },
  {
    icon: "🎯",
    title: "Compare and apply",
    desc: "See rewards, fees, and lounge access side by side. Apply directly.",
  },
];

export default function Home() {
  const topCards = scoreCards({ query: "best cashback online lounge", maxAnnualFee: 5000 }).slice(0, 3);

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-badge">✦ 100+ cards verified</div>
          <h1 className="home-headline">
            Stop switching tabs to compare credit cards. <em>Just ask.</em>
          </h1>
          <p className="home-sub">
            Ask in plain English — we match your use case to verified Indian card data.
          </p>
          <div className="home-askbox-wrap">
            <AskBox />
          </div>
          <div className="home-browse">
            <span className="home-browse-label">Or browse by:</span>
            <div className="chips">
              <Link className="chip" href="/finder?tag=cashback">
                <Search size={15} /> Cashback
              </Link>
              <Link className="chip" href="/finder?tag=lounge">
                <Sparkles size={15} /> Lounge
              </Link>
              <Link className="chip" href="/finder?fee=0">
                <BadgeIndianRupee size={15} /> Lifetime free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section how-section">
        <h2 className="how-title">How it works</h2>
        <div className="how-steps">
          {HOW_IT_WORKS.map((step) => (
            <div className="how-step" key={step.title}>
              <div className="how-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Popular picks</h2>
            <p>Top-rated cards from verified data.</p>
          </div>
          <Link className="button secondary" href="/finder">
            Browse all <ArrowRight size={16} />
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
