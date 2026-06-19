"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AskResultsSkeleton } from "@/components/loading/AskResultsSkeleton";

export const ASK_RESULTS_LOADING_EVENT = "mycards:ask-results-loading";

export function triggerAskResultsLoading() {
  window.dispatchEvent(new CustomEvent(ASK_RESULTS_LOADING_EVENT));
}

export default function AskResultsLoadingBoundary({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const showLoading = () => setIsLoading(true);
    const clearLoading = () => setIsLoading(false);

    window.addEventListener(ASK_RESULTS_LOADING_EVENT, showLoading);
    window.addEventListener("pageshow", clearLoading);

    return () => {
      window.removeEventListener(ASK_RESULTS_LOADING_EVENT, showLoading);
      window.removeEventListener("pageshow", clearLoading);
    };
  }, []);

  return isLoading ? <AskResultsSkeleton variant="inline" /> : <>{children}</>;
}
