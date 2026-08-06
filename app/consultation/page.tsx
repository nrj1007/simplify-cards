import type { Metadata } from "next";
import { ArrowUpRight, ChartNoAxesCombined, Gift, Route, WalletCards } from "lucide-react";
import PageHero from "@/app/ui/PageHero";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "1-on-1 Credit Card Consultation",
  description: "Get personalized credit card strategies, reward redemption roadmap, and portfolio reviews based on your unique profile.",
  path: "/consultation"
});

const CONSULTATION_FEATURES = [
  {
    title: "1-on-1 Portfolio Review",
    description: "We analyze your current cards and spending habits.",
    icon: WalletCards
  },
  {
    title: "Personalized Recommendations",
    description: "Discover the best cards tailored to your lifestyle.",
    icon: ChartNoAxesCombined
  },
  {
    title: "Reward Redemption Roadmap",
    description: "Learn how and where to redeem points for maximum value.",
    icon: Gift
  },
  {
    title: "Milestone Tracking Strategy",
    description: "Never miss a fee waiver or spending milestone again.",
    icon: Route
  }
];

export default function ConsultationPage() {
  // TODO: Replace with actual Google Form URL
  const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSc_PLACEHOLDER/viewform";

  return (
    <div className="page-shell consultation-page">
      <PageHero
        eyebrow="1-on-1 consultation"
        title="Personalized Credit Card Strategy"
        lead="Stop guessing which cards to get. We'll analyze your spending and craft a custom portfolio to maximize your rewards, lounge access, and milestone benefits."
      />

      <section className="page-content">
        <div className="container consultation-layout">
          <section className="panel consultation-inclusions" aria-labelledby="consultation-inclusions-title">
            <header className="consultation-section-heading">
              <div className="page-eyebrow">What&apos;s included</div>
              <h2 id="consultation-inclusions-title">Your consultation, structured around four decisions</h2>
            </header>

            <div className="consultation-features">
              {CONSULTATION_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <article className="consultation-feature" key={feature.title}>
                    <div className="consultation-feature-icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <span className="consultation-feature-number">0{index + 1}</span>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="consultation-booking-card" aria-label="Consultation booking">
            <div className="consultation-booking-label">Session fee</div>
            <div className="consultation-price">
              <strong>₹2,499</strong>
              <span>per session</span>
            </div>

            <div className="consultation-booking-divider" />

            <p>Get a personalized portfolio, redemption, and milestone strategy based on your spending.</p>

            <a href={googleFormUrl} target="_blank" rel="noopener noreferrer" className="consultation-cta">
              Book your consultation
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <small>The booking form opens in a new tab.</small>
          </aside>
        </div>
      </section>
    </div>
  );
}
