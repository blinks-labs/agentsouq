import { NextResponse } from "next/server";
import { CATALOG, formatUsdc } from "@/lib/catalog";

export function GET() {
  return NextResponse.json({
    market: "AgentSouq: agentic services marketplace on Arc testnet",
    settlement: { network: "arc-testnet", asset: "USDC", scheme: "x402 exact (EIP-3009)" },
    services: CATALOG.map((s) => ({
      id: s.id,
      seller: s.seller,
      category: s.category,
      description: s.description,
      price: formatUsdc(s.priceUnits),
      priceUnits: s.priceUnits.toString(),
      qualityScore: s.qualityScore,
      latencyMs: s.latencyMs,
      endpoint: s.path,
    })),
  });
}
