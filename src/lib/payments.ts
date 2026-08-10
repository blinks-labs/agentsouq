// Minimal x402-compatible payment engine for Arc testnet.
// Scheme: "exact" — EIP-3009 transferWithAuthorization on Arc's native USDC.
// The buyer signs a typed-data authorization (gasless for the buyer);
// the settler wallet submits it on-chain and the seller is paid atomically.

import { createWalletClient, http, verifyTypedData, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet, publicClient, usdcAbi, USDC_ADDRESS, EIP712_DOMAIN } from "./chain";
import type { Service } from "./catalog";

export const X402_NETWORK = `eip155:${arcTestnet.id}`;

export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export type PaymentAuthorization = {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
  signature: Hex;
};

// x402-style 402 challenge body for a service
export function paymentRequirements(service: Service) {
  return {
    x402Version: 1,
    error: "Payment required",
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        maxAmountRequired: service.priceUnits.toString(),
        asset: USDC_ADDRESS,
        payTo: service.sellerAddress,
        resource: service.path,
        description: service.description,
        maxTimeoutSeconds: 300,
        extra: { name: EIP712_DOMAIN.name, version: EIP712_DOMAIN.version },
      },
    ],
  };
}

export async function verifyPayment(auth: PaymentAuthorization, service: Service): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (auth.to.toLowerCase() !== service.sellerAddress.toLowerCase()) return { ok: false, reason: "payTo mismatch" };
  if (BigInt(auth.value) < service.priceUnits) return { ok: false, reason: "insufficient amount" };
  const now = Math.floor(Date.now() / 1000);
  if (now <= Number(auth.validAfter) || now >= Number(auth.validBefore)) return { ok: false, reason: "authorization expired or not yet valid" };

  const valid = await verifyTypedData({
    address: auth.from,
    domain: EIP712_DOMAIN,
    types: EIP3009_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from: auth.from, to: auth.to, value: BigInt(auth.value),
      validAfter: BigInt(auth.validAfter), validBefore: BigInt(auth.validBefore), nonce: auth.nonce,
    },
    signature: auth.signature,
  });
  if (!valid) return { ok: false, reason: "invalid signature" };

  const [balance, used] = await Promise.all([
    publicClient.readContract({ address: USDC_ADDRESS, abi: usdcAbi, functionName: "balanceOf", args: [auth.from] }),
    publicClient.readContract({ address: USDC_ADDRESS, abi: usdcAbi, functionName: "authorizationState", args: [auth.from, auth.nonce] }),
  ]);
  if (used) return { ok: false, reason: "authorization already used" };
  if (balance < BigInt(auth.value)) return { ok: false, reason: "insufficient USDC balance" };
  return { ok: true };
}

export async function settlePayment(auth: PaymentAuthorization): Promise<Hex> {
  const settler = privateKeyToAccount(process.env.SETTLER_PRIVATE_KEY as Hex);
  const wallet = createWalletClient({ account: settler, chain: arcTestnet, transport: http() });
  const sig = auth.signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as Hex;
  const s = `0x${sig.slice(64, 128)}` as Hex;
  const v = parseInt(sig.slice(128, 130), 16);
  const hash = await wallet.writeContract({
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "transferWithAuthorization",
    args: [auth.from, auth.to, BigInt(auth.value), BigInt(auth.validAfter), BigInt(auth.validBefore), auth.nonce, v, r, s],
  });
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return hash;
}

export function decodePaymentHeader(header: string): PaymentAuthorization | null {
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8")).authorization as PaymentAuthorization;
  } catch {
    return null;
  }
}

export function encodePaymentHeader(auth: PaymentAuthorization): string {
  return Buffer.from(JSON.stringify({ x402Version: 1, scheme: "exact", network: X402_NETWORK, authorization: auth })).toString("base64");
}
