// Kicks off the buyer agent and streams its activity as SSE.

import { NextRequest } from "next/server";
import { runAgent, type AgentEvent } from "@/lib/agent";
import { checkAccess, MAX_BUDGET_USD } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { task, budget, address, signature, ts } = await req.json();
  const baseUrl = req.nextUrl.origin;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const access = await checkAccess({ address, signature, ts, ip });
  if (!access.ok) return Response.json({ error: access.reason }, { status: 403 });

  const cappedBudget = Math.min(Number(budget) || 0.25, MAX_BUDGET_USD);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runAgent(task || "Prepare a UAE remittance market brief", cappedBudget, baseUrl, emit);
      } catch (e) {
        emit({ type: "error", text: (e as Error).message });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
