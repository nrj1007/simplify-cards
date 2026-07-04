"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Search } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/LoadingButton";
import { Sparkle } from "@/components/icons/Sparkle";
import { trackEvent } from "@/lib/analytics-client";
import { loadingCopy } from "@/lib/loading-copy";
import { triggerAskResultsLoading } from "./AskResultsLoadingBoundary";

type Props = {
  defaultValue?: string;
  maxAnnualFee?: number;
  placeholder: string;
  ariaLabel: string;
  buttonLabel: string;
  className?: string;
  multiline?: boolean;
  contextParams?: Record<string, string>;
};

export default function AskQueryForm({
  defaultValue = "",
  maxAnnualFee,
  placeholder,
  ariaLabel,
  buttonLabel,
  className,
  multiline = false,
  contextParams
}: Props) {
  const router = useRouter();
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const isLoading = submittedQuery !== null && submittedQuery !== defaultValue.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();

    if (!query || isLoading) {
      event.preventDefault();
      return;
    }

    const nextParams = new URLSearchParams({ query });
    if (typeof maxAnnualFee === "number") {
      nextParams.set("maxAnnualFee", String(maxAnnualFee));
    }
    if (contextParams) {
      for (const [key, value] of Object.entries(contextParams)) {
        if (value) nextParams.set(key, value);
      }
    }

    const nextHref = `/ask?${nextParams.toString()}`;
    if (nextHref === `${window.location.pathname}${window.location.search}`) {
      return;
    }

    trackEvent({
      event_name: "ask_query_submitted",
      page: "ask",
      source: "ask",
      query
    });
    setSubmittedQuery(query);
    triggerAskResultsLoading();
    router.push(nextHref as Route);
  }

  return (
    <form className={className} data-route-loader="ask-results" onSubmit={handleSubmit}>
      <span className="sc-search-icon" aria-hidden="true">
        <Search size={18} />
      </span>
      {multiline ? (
        <textarea
          aria-label={ariaLabel}
          defaultValue={defaultValue}
          disabled={isLoading}
          name="query"
          placeholder={placeholder}
        />
      ) : (
        <input
          aria-label={ariaLabel}
          defaultValue={defaultValue}
          disabled={isLoading}
          name="query"
          placeholder={placeholder}
        />
      )}
      {typeof maxAnnualFee === "number" ? <input name="maxAnnualFee" type="hidden" value={maxAnnualFee} /> : null}
      <LoadingButton className="btn btn-primary" loading={isLoading} loadingText={loadingCopy.ask.title} type="submit">
        <span className="sc-pulse" aria-hidden="true" />
        <Sparkle className="sc-sparkle" size={16} />
        <span className="loading-button-label">{buttonLabel}</span>
      </LoadingButton>
    </form>
  );
}
