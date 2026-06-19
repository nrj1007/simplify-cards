"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AskResultsSkeleton } from "@/components/loading/AskResultsSkeleton";

export const ASK_RESULTS_LOADING_EVENT = "mycards:ask-results-loading";

export function triggerAskResultsLoading() {
  window.dispatchEvent(new CustomEvent(ASK_RESULTS_LOADING_EVENT));
}

export default function AskResultsLoadingBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [loadingRouteKey, setLoadingRouteKey] = useState<string | null>(null);

  useEffect(() => {
    const showLoading = () => setLoadingRouteKey(routeKey);
    const clearLoading = () => setLoadingRouteKey(null);

    window.addEventListener(ASK_RESULTS_LOADING_EVENT, showLoading);
    window.addEventListener("pageshow", clearLoading);

    return () => {
      window.removeEventListener(ASK_RESULTS_LOADING_EVENT, showLoading);
      window.removeEventListener("pageshow", clearLoading);
    };
  }, [routeKey]);

  const isLoading = loadingRouteKey === routeKey;

  return isLoading ? <AskResultsSkeleton variant="inline" /> : <>{children}</>;
}
