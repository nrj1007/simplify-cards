import { Suspense } from "react";
import type { Metadata } from "next";
import { AskResultsSkeleton } from "@/components/loading/AskResultsSkeleton";
import { buildPageMetadata } from "@/lib/seo";
import AskPageClient from "./AskPageClient";

export const dynamic = "force-static";

export const metadata: Metadata = buildPageMetadata({
  title: "Ask SimplifyCards",
  description:
    "Ask about cashback, travel, lounges, UPI rewards, fees, exclusions, or specific cards and get grounded answers from verified Indian credit card data.",
  path: "/ask"
});

function AskPageFallback() {
  return (
    <div className="ask-results">
      <section className="ask-hero">
        <div className="container ask-hero-inner">
          <h1>
            <span className="sc-hero-prefix">Here&rsquo;s what we found </span>
            <span className="sc-hero-query">for you</span>
          </h1>

          <form action="/ask" className="ask-search">
            <input
              aria-label="Ask another credit card question"
              name="query"
              placeholder="e.g. best card for travel and cashback"
            />
            <button className="btn btn-primary" type="submit">
              ask again
            </button>
          </form>
        </div>
      </section>

      <section className="ask-content">
        <div className="container content-grid">
          <AskResultsSkeleton variant="inline" />
        </div>
      </section>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<AskPageFallback />}>
      <AskPageClient />
    </Suspense>
  );
}
