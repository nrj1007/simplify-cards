import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f4f3ec",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          boxSizing: "border-box",
          border: "20px solid #347d78",
        }}
      >
        <div style={{ display: "flex", marginBottom: "40px" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 320 256"
            width="160"
            height="128"
            fill="none"
            stroke="#347d78"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="0" y="0" width="320" height="256" rx="28" />
            <line x1="0" y1="80" x2="320" y2="80" stroke="#347d78" strokeWidth="24" />
            <rect x="40" y="160" width="60" height="40" rx="6" fill="#347d78" />
          </svg>
        </div>

        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "#1a3330",
            fontFamily: "sans-serif",
            letterSpacing: "-1px",
            marginBottom: "16px",
          }}
        >
          SimplifyCards
        </div>

        <div
          style={{
            fontSize: "28px",
            color: "#4e7370",
            fontFamily: "sans-serif",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: "1.4",
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
