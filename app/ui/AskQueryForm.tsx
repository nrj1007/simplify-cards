"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/LoadingButton";
import { trackEvent } from "@/lib/analytics-client";
import { triggerAskResultsLoading } from "./AskResultsLoadingBoundary";

type Props = {
  defaultValue?: string;
  maxAnnualFee?: number;
  placeholder: string;
  ariaLabel: string;
  buttonLabel: string;
  className?: string;
  multiline?: boolean;
};

export default function AskQueryForm({
  defaultValue = "",
  maxAnnualFee,
  placeholder,
  ariaLabel,
  buttonLabel,
  className,
  multiline = false
}: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();

    if (!query || isLoading) {
      event.preventDefault();
      return;
    }

    trackEvent({
      event_name: "ask_query_submitted",
      page: "ask",
      source: "ask",
      query
    });
    setIsLoading(true);
    triggerAskResultsLoading();
    const nextParams = new URLSearchParams({ query });
    if (typeof maxAnnualFee === "number") {
      nextParams.set("maxAnnualFee", String(maxAnnualFee));
    }
    router.push(`/ask?${nextParams.toString()}` as Route);
  }

  return (
    <form className={className} data-route-loader="ask-results" onSubmit={handleSubmit}>
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
      <LoadingButton className="btn btn-primary" loading={isLoading} loadingText="Finding cards..." type="submit">
        {buttonLabel}
      </LoadingButton>
    </form>
  );
}
