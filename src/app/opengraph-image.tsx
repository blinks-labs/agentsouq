import { ImageResponse } from "next/og";

export const alt = "AgentSouq — Agentic Commerce on Arc";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#100e14",
          backgroundImage: "radial-gradient(800px 400px at 50% -10%, rgba(232,161,61,0.18), transparent 65%)",
          color: "#ece5d8",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* arch mark */}
          <svg width="110" height="110" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#1c1824" />
            <path
              d="M32 12c-11.5 0-19 8.6-19 18.4 0 4.1 1.5 7.6 3.9 10.2L14 52h8.6l-1.9-8.2c-1.6-2.1-2.7-4.9-2.7-8.4 0-8 6-13.4 14-13.4s14 5.4 14 13.4c0 3.5-1.1 6.3-2.7 8.4L41.4 52H50l-2.9-11.4c2.4-2.6 3.9-6.1 3.9-10.2C51 20.6 43.5 12 32 12z"
              fill="#e8a13d"
            />
            <circle cx="32" cy="34" r="5" fill="#3fbf8f" />
          </svg>
          <div style={{ display: "flex", fontSize: 96 }}>
            <span style={{ color: "#e8a13d" }}>A</span>gentSouq
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#968e9e", marginTop: 18, fontFamily: "sans-serif" }}>
          AI agents buying services, settling per-call in USDC on Arc
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 44, fontFamily: "sans-serif", fontSize: 22 }}>
          {["Arc testnet", "USDC · EIP-3009", "Circle Wallets", "x402"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                border: "1px solid #2b2635",
                background: "#1c1824",
                borderRadius: 999,
                padding: "10px 24px",
                color: "#ece5d8",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
