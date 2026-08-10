// The buyer agent: plans purchases with Claude (or a deterministic fallback),
// signs EIP-3009 USDC authorizations with its Circle wallet, buys services via
// x402, and synthesizes a deliverable — all within a hard budget cap.

import Anthropic from "@anthropic-ai/sdk";
import { randomBytes } from "node:crypto";
import type { Hex } from "viem";
import { CATALOG, formatUsdc, type Service } from "./catalog";
import { encodePaymentHeader, type PaymentAuthorization } from "./payments";
import { signTransferAuthorization, AGENT_WALLET_ADDRESS } from "./circle";

export type AgentEvent =
  | { type: "status" | "thinking" | "error"; text: string }
  | { type: "decision"; text: string; serviceId?: string }
  | { type: "payment"; serviceId: string; seller: string; amount: string; txHash: string }
  | { type: "deliverable"; text: string }
  | { type: "done"; totalSpent: string; purchases: number };

type Emit = (e: AgentEvent) => void;

const MODEL = "claude-opus-5";

function anthropic(): Anthropic | null {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
}

const PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    rationale: { type: "string" as const },
    purchases: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          serviceId: { type: "string" as const },
          reason: { type: "string" as const },
        },
        required: ["serviceId", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["rationale", "purchases"],
  additionalProperties: false,
};

async function plan(task: string, budgetUnits: bigint, emit: Emit): Promise<{ serviceId: string; reason: string }[]> {
  const client = anthropic();
  const catalogText = CATALOG.map(
    (s) => `- id=${s.id} seller=${s.seller} category=${s.category} price=${formatUsdc(s.priceUnits)} quality=${s.qualityScore} latency=${s.latencyMs}ms — ${s.description}`,
  ).join("\n");

  if (!client) {
    // Deterministic fallback: cheapest per needed category, budget-capped
    emit({ type: "thinking", text: "No LLM key configured — using deterministic planner: pick best value per category within budget." });
    const byCategory = new Map<string, Service>();
    for (const s of [...CATALOG].sort((a, b) => Number(a.priceUnits - b.priceUnits))) {
      if (!byCategory.has(s.category)) byCategory.set(s.category, s);
    }
    const picks: { serviceId: string; reason: string }[] = [];
    let spend = 0n;
    for (const s of byCategory.values()) {
      if (spend + s.priceUnits <= budgetUnits) {
        picks.push({ serviceId: s.id, reason: `cheapest ${s.category} offer (${formatUsdc(s.priceUnits)})` });
        spend += s.priceUnits;
      }
    }
    return picks;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: { type: "json_schema", schema: PLAN_SCHEMA } },
    system:
      "You are a procurement agent in AgentSouq, a marketplace on Arc testnet where services are paid per-call in USDC. " +
      "Given a task, a budget, and a catalog, decide which services to purchase. Weigh price against quality and latency — " +
      "cheaper is not always better if quality matters for the task. Never exceed the budget. Buy at most one service per category.",
    messages: [
      {
        role: "user",
        content: `Task: ${task}\nBudget: ${formatUsdc(budgetUnits)} USDC total\n\nCatalog:\n${catalogText}\n\nDecide what to buy.`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("Planning request was declined");
  const block = response.content.find((b) => b.type === "text");
  const parsed = JSON.parse(block && block.type === "text" ? block.text : "{}");
  emit({ type: "thinking", text: parsed.rationale ?? "Plan formed." });
  return parsed.purchases ?? [];
}

async function buy(service: Service, baseUrl: string, emit: Emit): Promise<{ data: unknown; txHash: string }> {
  const from = AGENT_WALLET_ADDRESS();
  const now = Math.floor(Date.now() / 1000);
  const message = {
    from,
    to: service.sellerAddress,
    value: service.priceUnits.toString(),
    validAfter: "0",
    validBefore: String(now + 300),
    nonce: `0x${randomBytes(32).toString("hex")}` as Hex,
  };
  emit({ type: "status", text: `Signing USDC authorization for ${formatUsdc(service.priceUnits)} → ${service.seller} via Circle Wallets…` });
  const signature = await signTransferAuthorization(message);
  const auth: PaymentAuthorization = { ...message, signature };

  const res = await fetch(`${baseUrl}${service.path}`, { headers: { "X-PAYMENT": encodePaymentHeader(auth) } });
  const body = await res.json();
  if (!res.ok) throw new Error(`${service.seller} rejected payment: ${body.error ?? res.status}`);
  return { data: body.data, txHash: body.payment.txHash };
}

async function synthesize(task: string, results: { service: Service; data: unknown }[], emit: Emit): Promise<string> {
  const client = anthropic();
  const purchasedData = results
    .map((r) => `### ${r.service.seller} (${r.service.category})\n${JSON.stringify(r.data, null, 2)}`)
    .join("\n\n");
  if (!client) {
    return `# Deliverable\n\nTask: ${task}\n\nPurchased data:\n\n${purchasedData}`;
  }
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: { effort: "low" },
    system:
      "You are a procurement agent that just purchased data from marketplace services. Compose the final deliverable for the user's task using ONLY the purchased data. Be concise and well-structured (markdown). Note which paid source each fact came from.",
    messages: [{ role: "user", content: `Task: ${task}\n\nPurchased data:\n\n${purchasedData}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("Synthesis request was declined");
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function runAgent(task: string, budgetUsd: number, baseUrl: string, emit: Emit) {
  const budgetUnits = BigInt(Math.round(budgetUsd * 1e6));
  emit({ type: "status", text: `Agent online. Wallet ${AGENT_WALLET_ADDRESS()} (Circle developer-controlled wallet on Arc testnet). Budget: ${formatUsdc(budgetUnits)}.` });

  emit({ type: "status", text: "Discovering services in the souq…" });
  const purchases = await plan(task, budgetUnits, emit);
  if (purchases.length === 0) {
    emit({ type: "error", text: "Nothing purchasable within budget." });
    return;
  }

  let spent = 0n;
  const results: { service: Service; data: unknown }[] = [];
  for (const p of purchases) {
    const service = CATALOG.find((s) => s.id === p.serviceId);
    if (!service) continue;
    if (spent + service.priceUnits > budgetUnits) {
      emit({ type: "decision", text: `Skipping ${service.id} — would exceed budget (spent ${formatUsdc(spent)} of ${formatUsdc(budgetUnits)}).`, serviceId: service.id });
      continue;
    }
    emit({ type: "decision", text: `Buying ${service.id} from ${service.seller}: ${p.reason}`, serviceId: service.id });
    const { data, txHash } = await buy(service, baseUrl, emit);
    spent += service.priceUnits;
    results.push({ service, data });
    emit({ type: "payment", serviceId: service.id, seller: service.seller, amount: formatUsdc(service.priceUnits), txHash });
  }

  emit({ type: "status", text: "Synthesizing deliverable from purchased data…" });
  const deliverable = await synthesize(task, results, emit);
  emit({ type: "deliverable", text: deliverable });
  emit({ type: "done", totalSpent: formatUsdc(spent), purchases: results.length });
}
