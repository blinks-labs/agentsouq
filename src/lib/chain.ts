import { defineChain, createPublicClient, http } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

// USDC on Arc: native gas token with an ERC-20 interface (6 decimals) at a fixed address
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const USDC_DECIMALS = 6;
export const EIP712_DOMAIN = {
  name: "USDC",
  version: "2",
  chainId: arcTestnet.id,
  verifyingContract: USDC_ADDRESS,
} as const;

export const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

export const explorerTx = (hash: string) => `https://testnet.arcscan.app/tx/${hash}`;
export const explorerAddr = (addr: string) => `https://testnet.arcscan.app/address/${addr}`;

export const usdcAbi = [
  {
    type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "authorizationState", stateMutability: "view",
    inputs: [{ name: "authorizer", type: "address" }, { name: "nonce", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "transferWithAuthorization", stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" }, { name: "to", type: "address" },
      { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" }, { name: "r", type: "bytes32" }, { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;
