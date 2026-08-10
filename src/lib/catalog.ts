// The souq: services offered by independent sellers, each with its own
// Circle developer-controlled treasury wallet on Arc testnet.
// Prices are USDC (6-decimal base units) — sub-cent pricing is the point.

export type Service = {
  id: string;
  seller: string;
  sellerAddress: `0x${string}`;
  category: "fx-quote" | "market-brief" | "translation";
  description: string;
  priceUnits: bigint; // USDC base units (6 decimals)
  qualityScore: number; // advertised quality, 0..1
  latencyMs: number; // advertised latency
  path: string; // API path of the paid endpoint
};

const addr = (k: string) => (process.env[k] || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CATALOG: Service[] = [
  {
    id: "fastfx-quote",
    seller: "FastFX",
    sellerAddress: addr("CIRCLE_SELLER_FASTFX_ADDRESS"),
    category: "fx-quote",
    description: "Institutional-grade AED/USD/PHP/INR FX quotes, sub-second freshness",
    priceUnits: 50_000n, // $0.05
    qualityScore: 0.98,
    latencyMs: 120,
    path: "/api/services/fastfx-quote",
  },
  {
    id: "souqdata-quote",
    seller: "SouqData",
    sellerAddress: addr("CIRCLE_SELLER_SOUQDATA_ADDRESS"),
    category: "fx-quote",
    description: "Budget FX quotes, 15-minute delayed",
    priceUnits: 20_000n, // $0.02
    qualityScore: 0.80,
    latencyMs: 900,
    path: "/api/services/souqdata-quote",
  },
  {
    id: "souqdata-brief",
    seller: "SouqData",
    sellerAddress: addr("CIRCLE_SELLER_SOUQDATA_ADDRESS"),
    category: "market-brief",
    description: "UAE remittance-corridor market brief (volumes, fees, trends)",
    priceUnits: 100_000n, // $0.10
    qualityScore: 0.92,
    latencyMs: 600,
    path: "/api/services/souqdata-brief",
  },
  {
    id: "lingo-translate",
    seller: "LingoPay",
    sellerAddress: addr("CIRCLE_SELLER_LINGO_ADDRESS"),
    category: "translation",
    description: "Business translation EN ↔ AR/TL/HI for customer-facing summaries",
    priceUnits: 30_000n, // $0.03
    qualityScore: 0.95,
    latencyMs: 400,
    path: "/api/services/lingo-translate",
  },
];

export const formatUsdc = (units: bigint) => `$${(Number(units) / 1e6).toFixed(units % 10_000n === 0n ? 2 : 4)}`;
