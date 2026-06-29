"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal unhandled global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#f4f3ec",
        color: "#1a3330",
        margin: 0,
        padding: "40px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        boxSizing: "border-box"
      }}>
        <div style={{
          maxWidth: "500px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "32px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          textAlign: "center"
        }}>
          <span style={{
            fontSize: "12px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "#347d78"
          }}>System Error</span>
          <h1 style={{ fontSize: "24px", margin: "12px 0" }}>A critical error occurred</h1>
          <p style={{ fontSize: "15px", color: "#666", lineHeight: "1.5", margin: "0 0 24px" }}>
            The application encountered a critical error. Please click the button below to attempt recovery.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#347d78",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              Retry
            </button>
            <a
              href="/"
              style={{
                backgroundColor: "#f4f3ec",
                color: "#1a3330",
                textDecoration: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
