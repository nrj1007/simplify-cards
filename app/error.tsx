"use client";

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
        <div className="about-hero-actions" style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button className="btn btn-primary" onClick={() => reset()} style={{ cursor: "pointer" }}>
            Try again
          </button>
          <Link className="btn btn-ghost" href="/">
            Go to Home
          </Link>
        </div>
      </PageHero>

      <div className="page-content">
        <div className="container" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
            <h2>Need assistance?</h2>
            <p style={{ margin: "16px 0 24px" }}>
              If you keep seeing this message, please let us know about the issue by reporting it through our contact page.
            </p>
            <div>
              <Link href="/contact" className="text-link">Contact Support</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
