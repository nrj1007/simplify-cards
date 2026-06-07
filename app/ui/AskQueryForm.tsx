"use client";

import type { FormEvent } from "react";
import { trackEvent } from "@/lib/analytics-client";

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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();

    if (!query) return;

    trackEvent({
      event_name: "ask_query_submitted",
      page: "ask",
      source: "ask",
      query
    });
  }

  return (
    <form action="/ask" className={className} method="GET" onSubmit={handleSubmit}>
      {multiline ? (
        <textarea
          aria-label={ariaLabel}
          defaultValue={defaultValue}
          name="query"
          placeholder={placeholder}
        />
      ) : (
        <input
          aria-label={ariaLabel}
          defaultValue={defaultValue}
          name="query"
          placeholder={placeholder}
        />
      )}
      {typeof maxAnnualFee === "number" ? <input name="maxAnnualFee" type="hidden" value={maxAnnualFee} /> : null}
      <button className="btn btn-primary" type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}
