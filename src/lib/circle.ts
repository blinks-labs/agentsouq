// Circle developer-controlled wallet used as the agent's wallet on Arc.
// The agent never touches a raw private key: EIP-3009 authorizations are
// signed through Circle's signTypedData API.

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import type { Hex } from "viem";
import { EIP712_DOMAIN } from "./chain";
import { EIP3009_TYPES } from "./payments";

let _client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;
function client() {
  return (_client ??= initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  }));
}

export const AGENT_WALLET_ID = () => process.env.CIRCLE_AGENT_WALLET_ID!;
export const AGENT_WALLET_ADDRESS = () => process.env.CIRCLE_AGENT_WALLET_ADDRESS! as `0x${string}`;

export async function signTransferAuthorization(message: {
  from: `0x${string}`; to: `0x${string}`; value: string; validAfter: string; validBefore: string; nonce: Hex;
}): Promise<Hex> {
  const typedData = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ...EIP3009_TYPES,
    },
    domain: EIP712_DOMAIN,
    primaryType: "TransferWithAuthorization",
    message,
  };
  const res = await client().signTypedData({ walletId: AGENT_WALLET_ID(), data: JSON.stringify(typedData) });
  const sig = res.data?.signature;
  if (!sig) throw new Error("Circle signTypedData returned no signature");
  return sig as Hex;
}
