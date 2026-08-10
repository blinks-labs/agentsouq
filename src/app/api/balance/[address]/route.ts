// USDC balance (ERC-20 interface, 6 decimals) for any address on Arc testnet.
// Proxied server-side because the public RPC doesn't allow browser CORS.

import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { publicClient, usdcAbi, USDC_ADDRESS } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) return NextResponse.json({ error: "bad address" }, { status: 400 });
  const units = await publicClient
    .readContract({ address: USDC_ADDRESS, abi: usdcAbi, functionName: "balanceOf", args: [address] })
    .catch(() => null);
  if (units === null) return NextResponse.json({ error: "rpc error" }, { status: 502 });
  return NextResponse.json({ usdc: (Number(units) / 1e6).toFixed(2) });
}
