"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { AskResultsSkeleton } from "@/components/loading/AskResultsSkeleton";
import type { AnalyticsMetadata } from "@/lib/analytics";
import type { RecommendationInput } from "@/lib/types";
import AnalyticsMount from "../ui/AnalyticsMount";
import AskQueryForm from "../ui/AskQueryForm";
import AskResultsLoadingBoundary from "../ui/AskResultsLoadingBoundary";
import AskResultsClient, { type ScoredCardItem } from "./AskResultsClient";
import { AskQueryComposerProvider, AskQueryExamples } from "./AskQueryComposer";

const ASK_EXAMPLES = [
  "Best lifetime free cashback card",
  "Top cards for airport lounge access",
  "Axis Atlas",
  "Best travel card under ₹5000 fee",
  "SBI Cashback"
] as const;

type AskApiResult = {
  summary: string;
  cards: ScoredCardItem[];
  sections?: Array<{
    title: string;
    cards: ScoredCardItem[];
  }>;
  analyticsMetadata?: AnalyticsMetadata;
};

type AskApiResponse = AskApiResult | { directCardId: string };

type RequestState =
  | { key: string; status: "idle" | "loading" }
  | { key: string; status: "success"; result: AskApiResult }
  | { key: string; status: "error" };

function parseInput(params: URLSearchParams): RecommendationInput | null {
  const query = params.get("query")?.trim();
  if (!query) return null;

  const maxAnnualFeeParam = params.get("maxAnnualFee");
  const parsedMaxFee = maxAnnualFeeParam ? Number(maxAnnualFeeParam) : undefined;
  const contextCardIds = params
    .get("ctxCards")
    ?.split(",")
    .map((cardId) => cardId.trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    query,
    maxAnnualFee: parsedMaxFee !== undefined && !Number.isNaN(parsedMaxFee) ? parsedMaxFee : undefined,
    previousQuery: params.get("prevQuery")?.trim() || undefined,
    contextCardIds: contextCardIds && contextCardIds.length > 0 ? contextCardIds : undefined
  };
}

function isAskApiResponse(value: unknown): value is AskApiResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AskApiResult> & { directCardId?: unknown };
  if (typeof candidate.directCardId === "string") return true;
  return typeof candidate.summary === "string" && Array.isArray(candidate.cards);
}

function AskEmptyState() {
  return (
    <div className="main-stack">
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <h3>Ask your first question</h3>
            <p>Type a question above and SimplifyCards will return a grounded answer from verified card data</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AskNoMatch({ summary }: { summary: string }) {
  return (
    <div className="main-stack">
      <section className="panel">
        <div className="panel-body">
          <h2 className="section-title">No confident match</h2>
          <div className="empty-state">
            <h3>We could not answer this confidently</h3>
            <p>
              {summary ||
                "Try rephrasing — mention a use case like “cashback” or “lounge access” — or browse all cards."}
            </p>
            <Link className="btn btn-primary" href="/finder">
              Browse all cards →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function AskErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="main-stack">
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <h3>We could not load your answer</h3>
            <p>Please try again. Your question is still in the search box.</p>
            <button className="btn btn-primary" onClick={onRetry} type="button">
              Try again
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AskPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();
  const input = useMemo(() => parseInput(new URLSearchParams(paramsKey)), [paramsKey]);
  const requestKey = input ? JSON.stringify(input) : "empty";
  const [retryCount, setRetryCount] = useState(0);
  const requestAttemptKey = `${requestKey}:${retryCount}`;
  const [requestState, setRequestState] = useState<RequestState>(() => ({
    key: requestAttemptKey,
    status: input ? "loading" : "idle"
  }));

  useEffect(() => {
    if (!input) return;

    const controller = new AbortController();

    void fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Ask request failed with status ${response.status}`);
        const data: unknown = await response.json();
        if (!isAskApiResponse(data)) throw new Error("Ask response was invalid");

        if ("directCardId" in data) {
          router.replace(`/cards/${data.directCardId}` as Route);
          return;
        }

        setRequestState({ key: requestAttemptKey, status: "success", result: data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load /ask results:", error);
        setRequestState({ key: requestAttemptKey, status: "error" });
      });

    return () => controller.abort();
  }, [input, requestAttemptKey, router]);

  const currentState: RequestState =
    requestState.key === requestAttemptKey
      ? requestState
      : { key: requestAttemptKey, status: input ? "loading" : "idle" };
  const result = currentState.status === "success" ? currentState.result : null;
  const savedFeedback = searchParams.get("feedbackSaved");
  const resolvedSavedFeedback = savedFeedback === "up" || savedFeedback === "down" ? savedFeedback : null;
  const feedbackError = searchParams.get("feedbackError") === "1";
  const flatMatchCount = result?.cards.length ?? 0;
  const sectionMatchCount = result?.sections?.reduce((total, section) => total + section.cards.length, 0) ?? 0;
  const hasSplit = Boolean(result?.sections && result.sections.length > 1);
  const displayedMatchCount = hasSplit ? sectionMatchCount : flatMatchCount;
  const returnTo = input
    ? `/ask?query=${encodeURIComponent(input.query ?? "")}${input.maxAnnualFee !== undefined ? `&maxAnnualFee=${input.maxAnnualFee}` : ""}`
    : "/ask";

  let content;
  if (currentState.status === "loading") {
    content = <AskResultsSkeleton variant="inline" />;
  } else if (currentState.status === "error") {
    content = <AskErrorState onRetry={() => setRetryCount((count) => count + 1)} />;
  } else if (result && result.cards.length > 0 && input) {
    content = (
      <AskResultsClient
        cards={result.cards}
        displayedMatchCount={displayedMatchCount || result.cards.length}
        feedbackError={feedbackError}
        input={input}
        query={input.query ?? ""}
        returnTo={returnTo}
        savedFeedback={resolvedSavedFeedback}
        sections={result.sections}
        summary={result.summary}
      />
    );
  } else if (result) {
    content = <AskNoMatch summary={result.summary} />;
  } else {
    content = <AskEmptyState />;
  }

  return (
    <AskQueryComposerProvider
      initialMaxAnnualFee={input?.maxAnnualFee}
      initialQuery={input?.query ?? ""}
      key={`${input?.query ?? ""}:${input?.maxAnnualFee ?? ""}`}
    >
      <div className="ask-results">
        {result && input?.query && result.analyticsMetadata ? (
          <AnalyticsMount
            event={{
              event_name: "ask_result_rendered",
              page: "ask",
              source: "ask",
              query: input.query,
              card_ids: result.cards.map((item) => item.card.id),
              metadata: result.analyticsMetadata
            }}
            key={requestKey}
          />
        ) : null}

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
              placeholder="e.g. best card for travel and cashback"
            />

            <div className="query-examples">
              <span className="query-examples-label">try asking:</span>
              <AskQueryExamples examples={ASK_EXAMPLES} />
            </div>
          </div>
        </section>

        <section className="ask-content">
          <div className="container content-grid">
            <AskResultsLoadingBoundary>{content}</AskResultsLoadingBoundary>
          </div>
        </section>
      </div>
    </AskQueryComposerProvider>
  );
}
