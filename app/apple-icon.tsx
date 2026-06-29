import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#347d78",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 320 256"
          width="120"
          height="96"
          fill="none"
          stroke="#f4f3ec"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="0" y="0" width="320" height="256" rx="28" />
          <line x1="0" y1="80" x2="320" y2="80" stroke="#f4f3ec" strokeWidth="28" />
          <rect x="40" y="160" width="60" height="40" rx="6" fill="#f4f3ec" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
