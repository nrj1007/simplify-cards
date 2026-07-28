"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/LoadingButton";
import { loadingCopy } from "@/lib/loading-copy";
import { triggerAskResultsLoading } from "./AskResultsLoadingBoundary";
import { useAskQueryComposer } from "../ask/AskQueryComposer";

type Props = {
  defaultValue?: string;
  placeholder: string;
  ariaLabel: string;
  buttonLabel: string;
  className?: string;
  multiline?: boolean;
  contextParams?: Record<string, string>;
};

type QueryInputElement = HTMLInputElement | HTMLTextAreaElement;

export default function AskQueryForm({
  defaultValue = "",
  placeholder,
  ariaLabel,
  buttonLabel,
  className,
  multiline = false,
  contextParams
}: Props) {
  const router = useRouter();
  const composer = useAskQueryComposer();
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const isLoading = submittedQuery !== null && submittedQuery !== defaultValue.trim();
  const queryValue = composer.draftQuery;

  function handleQueryChange(event: ChangeEvent<QueryInputElement>) {
    const nextQuery = event.currentTarget.value;
    composer.setDraftQuery(nextQuery);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();

    if (!query || isLoading) {
      event.preventDefault();
      return;
    }

    const nextParams = new URLSearchParams({ query });
    if (typeof composer.draftMaxAnnualFee === "number") {
      nextParams.set("maxAnnualFee", String(composer.draftMaxAnnualFee));
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

    setSubmittedQuery(query);
    triggerAskResultsLoading();
    router.push(nextHref as Route);
  }

  return (
    <form className={className} data-route-loader="ask-results" onSubmit={handleSubmit}>
      {multiline ? (
        <textarea
          aria-label={ariaLabel}
          data-ask-query-input
          disabled={isLoading}
          name="query"
          onChange={handleQueryChange}
          placeholder={placeholder}
          value={queryValue}
        />
      ) : (
        <input
          aria-label={ariaLabel}
          data-ask-query-input
          disabled={isLoading}
          name="query"
          onChange={handleQueryChange}
          placeholder={placeholder}
          value={queryValue}
        />
      )}
      {typeof composer.draftMaxAnnualFee === "number" ? (
        <input name="maxAnnualFee" type="hidden" value={composer.draftMaxAnnualFee} />
      ) : null}
      <LoadingButton className="btn btn-primary" loading={isLoading} loadingText={loadingCopy.ask.title} type="submit">
        {buttonLabel}
      </LoadingButton>
    </form>
  );
}
