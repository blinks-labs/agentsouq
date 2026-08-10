import { NextResponse } from "next/server";
import { publicClient, usdcAbi, USDC_ADDRESS } from "@/lib/chain";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const wallets = [
    { label: "Agent (Circle Wallet)", address: process.env.CIRCLE_AGENT_WALLET_ADDRESS },
    { label: "FastFX treasury (Circle Wallet)", address: process.env.CIRCLE_SELLER_FASTFX_ADDRESS },
    { label: "SouqData treasury (Circle Wallet)", address: process.env.CIRCLE_SELLER_SOUQDATA_ADDRESS },
    { label: "LingoPay treasury (Circle Wallet)", address: process.env.CIRCLE_SELLER_LINGO_ADDRESS },
    { label: "Settler (gas)", address: process.env.SETTLER_ADDRESS },
  ].filter((w): w is { label: string; address: string } => Boolean(w.address));

  const balances = await Promise.all(
    wallets.map(async (w) => {
      const units = await publicClient
        .readContract({ address: USDC_ADDRESS, abi: usdcAbi, functionName: "balanceOf", args: [w.address as `0x${string}`] })
        .catch(() => 0n);
      return { ...w, usdc: (Number(units) / 1e6).toFixed(4) };
    }),
  );

  return NextResponse.json({ balances, receipts: store.receipts });
}
