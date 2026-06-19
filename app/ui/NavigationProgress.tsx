"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { loadingCopy, type LoadingCopyKey } from "@/lib/loading-copy";

type NavigationProgressContextValue = {
  startNavigation: (copyKey?: LoadingCopyKey) => void;
  stopNavigation: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue>({
  startNavigation: () => undefined,
  stopNavigation: () => undefined
});

function isSameDocumentHashNavigation(url: URL) {
  return (
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash !== ""
  );
}

function loadingCopyKeyForUrl(url: URL): LoadingCopyKey {
  if (url.pathname === "/ask") return "ask";
  if (url.pathname === "/recommend") return "recommend";
  if (url.pathname === "/compare") return "compare";
  if (url.pathname === "/calculator") return "calculator";
  if (url.pathname.startsWith("/cards/")) return "cardDetail";
  if (url.pathname === "/finder" || url.pathname === "/cards") return "cards";

  return "cards";
}

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [copyKey, setCopyKey] = useState<LoadingCopyKey>("cards");
  const fallbackTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const visibleSinceRef = useRef(0);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stopNavigation = useCallback(() => {
    clearFallback();
    clearStopTimer();

    const elapsed = visibleSinceRef.current === 0 ? 0 : Date.now() - visibleSinceRef.current;
    const remaining = Math.max(260 - elapsed, 0);

    stopTimerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      visibleSinceRef.current = 0;
      stopTimerRef.current = null;
    }, remaining);
  }, [clearFallback, clearStopTimer]);

  const startNavigation = useCallback((nextCopyKey: LoadingCopyKey = "cards") => {
    clearFallback();
    clearStopTimer();
    setCopyKey(nextCopyKey);
    visibleSinceRef.current = Date.now();
    setIsLoading(true);
    fallbackTimerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      visibleSinceRef.current = 0;
      fallbackTimerRef.current = null;
    }, 15000);
  }, [clearFallback, clearStopTimer]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;

      const url = new URL(anchor.href, window.location.href);
      if (anchor.dataset.routeLoader === "redirect") {
        startNavigation("redirect");
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (anchor.dataset.routeLoader === "ask-results") {
        window.dispatchEvent(new CustomEvent("mycards:ask-results-loading"));
        return;
      }
      if (anchor.dataset.routeLoader === "none") return;
      if (isSameDocumentHashNavigation(url)) return;

      startNavigation(loadingCopyKeyForUrl(url));
    };

    const handleFormSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;

      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.routeLoader === "ask-results" || form.dataset.routeLoader === "none") return;

      const action = form.getAttribute("action") || window.location.href;
      const url = new URL(action, window.location.href);
      if (url.origin !== window.location.origin) return;

      startNavigation(loadingCopyKeyForUrl(url));
    };

    window.addEventListener("pageshow", stopNavigation);
    window.addEventListener("popstate", stopNavigation);
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("submit", handleFormSubmit, true);

    return () => {
      window.removeEventListener("pageshow", stopNavigation);
      window.removeEventListener("popstate", stopNavigation);
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("submit", handleFormSubmit, true);
      clearFallback();
      clearStopTimer();
    };
  }, [clearFallback, clearStopTimer, startNavigation, stopNavigation]);

  const currentCopy = loadingCopy[copyKey];

  return (
    <NavigationProgressContext.Provider value={{ startNavigation, stopNavigation }}>
      {children}
      <Suspense fallback={null}>
        <NavigationProgressEvents />
      </Suspense>
      <div
        aria-hidden={!isLoading}
        aria-live="polite"
        className={`route-loader${isLoading ? " route-loader-visible" : ""}`}
        role="status"
      >
        <div className="route-loader-progress" />
        <div className="route-loader-backdrop" />
        <div className="route-loader-card">
          <span className="route-loader-icon" aria-hidden="true">
            <CreditCard size={20} strokeWidth={2.4} />
          </span>
          <span className="route-loader-copy">
            <span className="route-loader-title-row">
              <span className="route-loader-title">{currentCopy.title}</span>
              <span className="route-loader-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="route-loader-subtitle">{currentCopy.subtitle}</span>
          </span>
        </div>
      </div>
    </NavigationProgressContext.Provider>
  );
}

function NavigationProgressEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { stopNavigation } = useNavigationProgress();

  useEffect(() => {
    const frame = window.requestAnimationFrame(stopNavigation);

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchParams, stopNavigation]);

  return null;
}

export function useNavigationProgress() {
  return useContext(NavigationProgressContext);
}
