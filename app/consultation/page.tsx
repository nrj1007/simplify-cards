import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "1-on-1 Credit Card Consultation",
  description: "Get personalized credit card strategies, reward redemption roadmap, and portfolio reviews based on your unique profile.",
  path: "/consultation"
});

export default function ConsultationPage() {
  // TODO: Replace with actual Google Form URL
  const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSc_PLACEHOLDER/viewform";
  
  return (
    <main className="consultation-page">
      <div className="consultation-page-hero">
        <h1>Personalized Credit Card Strategy</h1>
        <p>Stop guessing which cards to get. We&apos;ll analyze your spending and craft a custom portfolio to maximize your rewards, lounge access, and milestone benefits.</p>
        
        <div className="consultation-card">
          <div className="consultation-price">
            ₹2,499 <span>/ session</span>
          </div>
          
          <ul className="consultation-features">
            <li>
              <CheckCircle2 size={24} />
              <span><strong>1-on-1 Portfolio Review:</strong> We analyze your current cards and spending habits.</span>
            </li>
            <li>
              <CheckCircle2 size={24} />
              <span><strong>Personalized Recommendations:</strong> Discover the best cards tailored to your lifestyle.</span>
            </li>
            <li>
              <CheckCircle2 size={24} />
              <span><strong>Reward Redemption Roadmap:</strong> Learn how and where to redeem points for maximum value.</span>
            </li>
            <li>
              <CheckCircle2 size={24} />
              <span><strong>Milestone Tracking Strategy:</strong> Never miss a fee waiver or spending milestone again.</span>
            </li>
          </ul>
          
          <a href={googleFormUrl} target="_blank" rel="noopener noreferrer" className="consultation-cta">
            Book Your Consultation Now
          </a>
        </div>
      </div>
    </main>
  );
}
