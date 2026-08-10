// Paid seller endpoints. Every request without a valid X-PAYMENT header gets
// an HTTP 402 challenge (x402 style); with one, we verify + settle the USDC
// payment on Arc, then serve the data and return the settlement tx hash.

import { NextRequest, NextResponse } from "next/server";
import { CATALOG } from "@/lib/catalog";
import { paymentRequirements, verifyPayment, settlePayment, decodePaymentHeader } from "@/lib/payments";
import { addReceipt } from "@/lib/store";

export const runtime = "nodejs";

const DATA: Record<string, (q: string) => unknown> = {
  "fastfx-quote": () => ({
    provider: "FastFX", asOf: new Date().toISOString(), freshness: "real-time",
    quotes: { "USD/AED": 3.6725, "USD/PHP": 57.84, "USD/INR": 87.42, "AED/PHP": 15.75, "AED/INR": 23.8 },
    spreadBps: 8,
  }),
  "souqdata-quote": () => ({
    provider: "SouqData", asOf: new Date(Date.now() - 15 * 60_000).toISOString(), freshness: "15-min delayed",
    quotes: { "USD/AED": 3.6731, "USD/PHP": 57.71, "USD/INR": 87.3, "AED/PHP": 15.71, "AED/INR": 23.77 },
    spreadBps: 25,
  }),
  "souqdata-brief": () => ({
    provider: "SouqData",
    corridor: "UAE -> PH/IN/PK",
    monthlyVolumeUsd: "4.1B",
    insights: [
      "UAE-Philippines corridor volume up 9% QoQ; average remittance $340.",
      "Traditional rails average 4.6% total cost; stablecoin rails on Arc settle in seconds at sub-cent network fees.",
      "Peak flows cluster around end-of-month payroll; weekend settlement gaps are the top user complaint.",
      "USDC acceptance among PH cash-out partners grew 3x since 2025.",
    ],
  }),
  "lingo-translate": (q: string) => ({
    provider: "LingoPay",
    source: q || "Your remittance settled instantly with transparent fees.",
    translations: {
      ar: "تمت تسوية حوالتك فورًا برسوم شفافة.",
      tl: "Agad na na-settle ang iyong padala nang may malinaw na bayarin.",
      hi: "आपका प्रेषण पारदर्शी शुल्क के साथ तुरंत निपटाया गया।",
    },
  }),
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = CATALOG.find((s) => s.id === id);
  if (!service) return NextResponse.json({ error: "unknown service" }, { status: 404 });

  const header = req.headers.get("x-payment");
  if (!header) return NextResponse.json(paymentRequirements(service), { status: 402 });

  const auth = decodePaymentHeader(header);
  if (!auth) return NextResponse.json({ error: "malformed X-PAYMENT header" }, { status: 400 });

  const verdict = await verifyPayment(auth, service);
  if (!verdict.ok) return NextResponse.json({ ...paymentRequirements(service), error: verdict.reason }, { status: 402 });

  let txHash: string;
  try {
    txHash = await settlePayment(auth);
  } catch (e) {
    return NextResponse.json({ error: `settlement failed: ${(e as Error).message}` }, { status: 502 });
  }

  addReceipt({
    id: `${Date.now()}-${service.id}`,
    serviceId: service.id,
    seller: service.seller,
    from: auth.from,
    to: auth.to,
    amountUnits: auth.value,
    txHash,
    at: Date.now(),
  });

  const body = DATA[service.id](req.nextUrl.searchParams.get("q") ?? "");
  return NextResponse.json(
    { data: body, payment: { settled: true, txHash, network: "arc-testnet" } },
    { headers: { "X-PAYMENT-RESPONSE": Buffer.from(JSON.stringify({ success: true, txHash })).toString("base64") } },
  );
}
