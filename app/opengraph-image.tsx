import { ImageResponse } from "next/og";

export const alt = "SimplifyCards - find Indian credit cards that save you more";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const comparisonRows = [
  ["Rewards", "Rates and redemption"],
  ["Fees", "Waivers and real cost"],
  ["Fine print", "Caps and exclusions"],
] as const;

function LogoMark({ width = 58, height = 48 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="og-card-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="60%" stopColor="#581c87" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
        <linearGradient id="og-check-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e112c" />
          <stop offset="50%" stopColor="#b8975a" />
          <stop offset="100%" stopColor="#f3e8ff" />
        </linearGradient>
        <linearGradient id="og-slice-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#b8975a" />
        </linearGradient>
      </defs>
      <path d="M40 15 C 54 11, 80 13, 92 16 C 94 17, 95 19, 94 21 C 92 24, 70 24, 44 21 C 41 21, 40 18, 40 15 Z" fill="url(#og-slice-gradient)" />
      <path d="M16 20 C 16 16, 20 15, 25 16 L88 28 C 92 28, 94 31, 94 35 L88 65 C 88 68, 85 70, 81 70 L22 79 C 18 79, 16 76, 16 71 Z" fill="url(#og-card-gradient)" />
      <rect x="22" y="28" width="16" height="12" rx="3.5" fill="#f3edf5" opacity="0.95" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" stroke="#fdfbf7" strokeWidth="6" strokeLinejoin="miter" fill="none" />
      <path d="M20 56 L48 66 L105 18 L44 84 Z" fill="url(#og-check-gradient)" />
    </svg>
  );
}

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "linear-gradient(135deg, #fffefb 0%, #f5f1e8 52%, #ebe4d8 100%)",
          color: "#1e112c",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.42,
            backgroundImage:
              "linear-gradient(rgba(88, 28, 135, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(88, 28, 135, 0.07) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            width: "100%",
            height: "10px",
            background: "linear-gradient(90deg, #581c87 0%, #7e22ce 58%, #b8975a 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "42px 56px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <LogoMark />
              <div style={{ display: "flex", marginLeft: "10px", fontSize: "30px", fontWeight: 900, letterSpacing: "-1px" }}>
                <span style={{ color: "#581c87" }}>Simplify</span>
                <span>Cards</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 17px",
                border: "1px solid #dfcfb2",
                borderRadius: "999px",
                background: "rgba(255, 253, 248, 0.9)",
                color: "#765716",
                fontSize: "15px",
                fontWeight: 800,
                letterSpacing: "0.4px",
              }}
            >
              200+ EXPERT-VERIFIED CARDS
            </div>
          </div>

          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: "48px" }}>
            <div style={{ display: "flex", flexDirection: "column", width: "610px", paddingBottom: "8px" }}>
              <div style={{ display: "flex", color: "#5b5466", fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>
                Ask. Compare. Decide.
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  fontSize: "62px",
                  lineHeight: 1.02,
                  fontWeight: 900,
                  letterSpacing: "-2.4px",
                }}
              >
                <span>Find the cards that</span>
                <span style={{ color: "#581c87" }}>save you more.</span>
              </div>
              <div
                style={{
                  display: "flex",
                  maxWidth: "590px",
                  marginTop: "24px",
                  color: "#5b5466",
                  fontSize: "22px",
                  lineHeight: 1.38,
                  fontWeight: 500,
                }}
              >
                Compare rewards, fees, caps and exclusions to find your best-fit Indian credit card.
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: "31px", color: "#581c87", fontSize: "19px", fontWeight: 800 }}>
                simplifycards.in
                <span style={{ display: "flex", marginLeft: "12px", color: "#b8975a" }}>→</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "410px",
                padding: "18px",
                border: "1px solid #e3d8c5",
                borderRadius: "28px",
                background: "rgba(255, 253, 248, 0.96)",
                boxShadow: "0 22px 60px rgba(30, 17, 44, 0.13)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "170px",
                  padding: "24px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #1e112c 0%, #581c87 68%, #9a6e32 100%)",
                  color: "#ffffff",
                  boxShadow: "0 15px 34px rgba(88, 28, 135, 0.24)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", fontSize: "18px", fontWeight: 900 }}>
                    <LogoMark width={38} height={32} />
                    <span style={{ marginLeft: "8px" }}>Your best fit</span>
                  </div>
                  <div style={{ display: "flex", padding: "6px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.14)", fontSize: "12px", fontWeight: 800 }}>
                    #1
                  </div>
                </div>
                <div style={{ display: "flex", marginTop: "30px", color: "#eadcf5", fontSize: "14px", fontWeight: 700 }}>
                  RANKED FOR YOUR SPEND
                </div>
                <div style={{ display: "flex", marginTop: "8px", fontSize: "24px", fontWeight: 900 }}>
                  Value after fees
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", marginTop: "12px" }}>
                {comparisonRows.map(([label, detail], index) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 10px",
                      borderBottom: index === comparisonRows.length - 1 ? "0" : "1px solid #ece3d5",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "15px", fontWeight: 900 }}>{label}</span>
                      <span style={{ marginTop: "3px", color: "#6a6273", fontSize: "13px" }}>{detail}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "28px",
                        height: "28px",
                        borderRadius: "999px",
                        background: "#f3e8ff",
                        color: "#581c87",
                        fontSize: "17px",
                        fontWeight: 900,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.5 8.2 L6.6 11.2 L12.6 4.8" stroke="#581c87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
