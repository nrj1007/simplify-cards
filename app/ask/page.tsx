import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import AskQueryForm from "../ui/AskQueryForm";
import AskResultsLoadingBoundary from "../ui/AskResultsLoadingBoundary";
import CardTile from "../ui/CardTile";
import { answerQuestion, resolveDirectCardDetailQuery } from "@/lib/ask-ai";
import { buildAskResultMetadata } from "@/lib/analytics-events";
import { logAnalyticsEvent } from "@/lib/analytics-logs";
import { buildPageMetadata } from "@/lib/seo";
import { scoreCards } from "@/lib/recommend";
import type { RecommendationInput } from "@/lib/types";
import AskResultsClient from "./AskResultsClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Ask SimplifyCards",
  description:
    "Ask about cashback, travel, lounges, UPI rewards, fees, exclusions, or specific cards and get grounded answers from verified Indian credit card data.",
  path: "/ask"
});

const ASK_EXAMPLES = [
  "Best lifetime free cashback card",
  "Top cards for airport lounge access",
  "Axis Atlas",
  "Best travel card under ₹5000 fee",
  "SBI Cashback"
];

type Props = {
  searchParams: Promise<{
    query?: string;
    maxAnnualFee?: string;
    prevQuery?: string;
    ctxCards?: string;
    feedbackSaved?: string;
    feedbackError?: string;
  }>;
};

function parseInput(params: { query?: string; maxAnnualFee?: string; prevQuery?: string; ctxCards?: string }): RecommendationInput | null {
  const query = params.query?.trim();
  if (!query) return null;

  const parsedMaxFee = params.maxAnnualFee ? Number(params.maxAnnualFee) : undefined;
  const contextCardIds = params.ctxCards
    ?.split(",")
    .map((cardId) => cardId.trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    query,
    maxAnnualFee: parsedMaxFee !== undefined && !Number.isNaN(parsedMaxFee) ? parsedMaxFee : undefined,
    previousQuery: params.prevQuery?.trim() || undefined,
    contextCardIds: contextCardIds && contextCardIds.length > 0 ? contextCardIds : undefined
  };
}

export default async function AskPage({ searchParams }: Props) {
  const params = await searchParams;
  const input = parseInput(params);
  const directCardId = input ? resolveDirectCardDetailQuery(input) : null;
  if (directCardId) {
    redirect(`/cards/${directCardId}` as Route);
  }

  const result = input ? await answerQuestion(input) : null;
  if (input?.query && result) {
    await logAnalyticsEvent({
      event_name: "ask_query_submitted",
      page: "ask",
      source: "ask",
      query: input.query
    });
    await logAnalyticsEvent({
      event_name: "ask_result_rendered",
      page: "ask",
      source: "ask",
      query: input.query,
      card_ids: result.cards.map((item) => item.card.id),
      metadata: buildAskResultMetadata(result)
    });
  }
  const savedFeedback = params.feedbackSaved === "up" || params.feedbackSaved === "down" ? params.feedbackSaved : null;
  const feedbackError = params.feedbackError === "1";
  const flatMatchCount = result?.cards.length ?? 0;
  const sectionMatchCount =
    result?.sections?.reduce((total, section) => total + section.cards.length, 0) ?? 0;
  const hasSplit = Boolean(result?.sections && result.sections.length > 1);
  const displayedMatchCount = hasSplit ? sectionMatchCount : flatMatchCount;

  const returnTo = input
    ? `/ask?query=${encodeURIComponent(input.query ?? "")}${input.maxAnnualFee !== undefined ? `&maxAnnualFee=${input.maxAnnualFee}` : ""}`
    : "/ask";

  return (
    <div className="ask-results">
      <section className="ask-hero">
        <div className="container ask-hero-inner">
          <h1>
            <span className="sc-hero-prefix">Here&rsquo;s what we found </span>
            <span className="sc-hero-query">for you</span>
          </h1>

          <AskQueryForm
            ariaLabel="Ask another credit card question"
            buttonLabel="ask again"
            className="ask-search"
            defaultValue={input?.query ?? ""}
            maxAnnualFee={input?.maxAnnualFee}
            placeholder="e.g. best card for travel and cashback"
          />

          <div className="query-examples">
            <span className="query-examples-label">try asking:</span>
            {ASK_EXAMPLES.map((example) => (
              <Link
                key={example}
                className="query-chip"
                data-route-loader="ask-results"
                href={`/ask?query=${encodeURIComponent(example)}`}
              >
                {example}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ask-content">
        <div className="container content-grid">
          <AskResultsLoadingBoundary>
            {result && result.cards && result.cards.length > 0 ? (
              <AskResultsClient
                cards={result.cards}
                displayedMatchCount={displayedMatchCount || result.cards.length}
                feedbackError={feedbackError}
                input={input!}
                query={input?.query ?? ""}
                returnTo={returnTo}
                savedFeedback={savedFeedback}
                sections={result.sections}
                summary={result.summary}
              />
            ) : result ? (
              <div className="main-stack">
                <section className="panel">
                  <div className="panel-body">
                    <h2 className="section-title">No confident match</h2>
                    <div className="empty-state">
                      <h3>We could not answer this confidently.</h3>
                      <p>
                        {result.summary ||
                          "Try rephrasing — mention a use case like “cashback” or “lounge access” — or browse all cards below."}
                      </p>
                      <Link className="btn btn-primary" href="/finder">
                        Browse all cards →
                      </Link>
                    </div>
                    <div className="grid cards" style={{ marginTop: 20 }}>
                      {scoreCards({ query: "best overall" }).slice(0, 2).map((score) => (
                        <CardTile key={score.card.id} score={score} />
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="main-stack">
                <section className="panel">
                  <div className="panel-body">
                    <div className="empty-state">
                      <h3>Ask your first question.</h3>
                      <p>Type a question above and SimplifyCards will return a grounded answer from verified card data.</p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </AskResultsLoadingBoundary>
        </div>
      </section>
    </div>
  );
}
