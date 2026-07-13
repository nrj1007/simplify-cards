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
          background: "linear-gradient(135deg, #091211 0%, #163633 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: "radial-gradient(circle, rgba(52, 125, 120, 0.2) 0%, transparent 50%)",
            zIndex: 0,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "160px",
              height: "160px",
              borderRadius: "40px",
              background: "linear-gradient(135deg, rgba(52,125,120,0.6) 0%, rgba(52,125,120,0.1) 100%)",
              border: "1px solid rgba(52,125,120,0.5)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              marginBottom: "40px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 320 256"
              width="96"
              height="96"
              fill="none"
              stroke="#4ad7c1"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="0" y="0" width="320" height="256" rx="36" />
              <line x1="0" y1="80" x2="320" y2="80" stroke="#4ad7c1" strokeWidth="20" />
              <rect x="50" y="150" width="70" height="46" rx="12" fill="#4ad7c1" />
            </svg>
          </div>

          <div
            style={{
              fontSize: "84px",
              fontWeight: "900",
              color: "#ffffff",
              letterSpacing: "-2px",
              marginBottom: "24px",
              textShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            SimplifyCards
          </div>

          <div
            style={{
              fontSize: "32px",
              color: "#a4c5c2",
              textAlign: "center",
              maxWidth: "850px",
              lineHeight: "1.5",
              fontWeight: "500",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "12px",
            background: "linear-gradient(90deg, #347d78 0%, #4ad7c1 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
