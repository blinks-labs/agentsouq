// Demo-grade access control for the public deployment:
// wallet-signature gate + budget clamp + in-memory rate limits.

import { verifyMessage, type Hex } from "viem";

export const MAX_BUDGET_USD = 0.25;
export const SIGN_WINDOW_MS = 5 * 60_000;

type Limits = { perWallet: Map<string, number>; perIp: Map<string, number[]>; global: number[] };
const g = globalThis as unknown as { __souqLimits?: Limits };
const limits: Limits = (g.__souqLimits ??= { perWallet: new Map(), perIp: new Map(), global: [] });

export function signMessageFor(address: string, ts: number) {
  return `AgentSouq demo run\nwallet: ${address.toLowerCase()}\nts: ${ts}`;
}

export async function checkAccess(input: {
  address?: string;
  signature?: string;
  ts?: number;
  ip: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { address, signature, ts, ip } = input;
  if (!address || !signature || !ts) return { ok: false, reason: "Connect a wallet and sign the demo message to dispatch the agent." };
  if (Math.abs(Date.now() - ts) > SIGN_WINDOW_MS) return { ok: false, reason: "Signature expired — sign again." };

  const valid = await verifyMessage({
    address: address as Hex,
    message: signMessageFor(address, ts),
    signature: signature as Hex,
  }).catch(() => false);
  if (!valid) return { ok: false, reason: "Invalid wallet signature." };

  const now = Date.now();
  const wallet = address.toLowerCase();

  const ipRuns = (limits.perIp.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (ipRuns.length >= 10) return { ok: false, reason: "Rate limit: too many runs from this network — try later." };

  limits.global = limits.global.filter((t) => now - t < 3_600_000);
  if (limits.global.length >= 20) return { ok: false, reason: "Demo is busy — hourly settlement cap reached, try later." };

  limits.perWallet.set(wallet, now);
  ipRuns.push(now);
  limits.perIp.set(ip, ipRuns);
  limits.global.push(now);
  return { ok: true };
}
