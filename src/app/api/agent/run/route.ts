// Kicks off the buyer agent and streams its activity as SSE.

import { NextRequest } from "next/server";
import { runAgent, type AgentEvent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { task, budget } = await req.json();
  const baseUrl = req.nextUrl.origin;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runAgent(task || "Prepare a UAE remittance market brief", Number(budget) || 0.25, baseUrl, emit);
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
