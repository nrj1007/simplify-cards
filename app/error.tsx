"use client";

import type { Route } from "next";
import { useEffect } from "react";
import Link from "next/link";
import PageHero from "@/app/ui/PageHero";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (or external error tracking service)
    console.error("Unhandled error caught by page boundary:", error);
  }, [error]);

  return (
    <div className="page-shell error-page">
      <PageHero
        eyebrow="Application Error"
        title="Something went wrong."
        lead="An unexpected error occurred while rendering this page. We have logged the details and will look into it."
      >
        <div className="about-hero-actions">
          <button className="btn btn-primary btn-pointer" onClick={() => reset()}>
            Try again
          </button>
          <Link className="btn btn-ghost" href="/">
            Go to Home
          </Link>
        </div>
      </PageHero>

      <div className="page-content">
        <div className="container message-page-container">
          <div className="panel message-page-panel">
            <h2>Need assistance?</h2>
            <p className="message-page-text">
              If you keep seeing this message, please let us know about the issue by reporting it through our contact page.
            </p>
            <div>
              <Link href={"/contact" as Route} className="text-link">Contact Support</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
