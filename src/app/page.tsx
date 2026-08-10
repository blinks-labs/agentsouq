"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FeedItem = { type: string; text?: string; seller?: string; amount?: string; txHash?: string; serviceId?: string; totalSpent?: string; purchases?: number };
type Balance = { label: string; address: string; usdc: string };
type Receipt = { id: string; serviceId: string; seller: string; from: string; to: string; amountUnits: string; txHash: string; at: number };
type CatalogItem = { id: string; seller: string; category: string; price: string; qualityScore: number; latencyMs: number; description: string };

const EXPLORER = "https://testnet.arcscan.app";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function Home() {
  const [task, setTask] = useState("Prepare a remittance intelligence brief for a UAE fintech: current FX quotes for AED to PHP and INR, corridor market insights, and a customer-facing summary translated to Tagalog and Hindi.");
  const [budget, setBudget] = useState("0.25");
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [deliverable, setDeliverable] = useState("");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const refreshState = useCallback(async () => {
    const r = await fetch("/api/state");
    const j = await r.json();
    setBalances(j.balances);
    setReceipts(j.receipts);
  }, []);

  useEffect(() => {
    refreshState();
    fetch("/api/catalog").then((r) => r.json()).then((j) => setCatalog(j.services));
  }, [refreshState]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [feed]);

  async function run() {
    setRunning(true);
    setFeed([]);
    setDeliverable("");
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, budget: Number(budget) }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const ev: FeedItem = JSON.parse(part.slice(6));
          if (ev.type === "deliverable") setDeliverable(ev.text ?? "");
          else setFeed((f) => [...f, ev]);
          if (ev.type === "payment") refreshState();
        }
      }
    } finally {
      setRunning(false);
      refreshState();
    }
  }

  return (
    <main className="wrap">
      <header>
        <h1>🕌 AgentSouq</h1>
        <p className="sub">
          Autonomous agent commerce on <b>Arc testnet</b> — an AI agent discovers services, compares counterparties on
          price and quality, and settles per-call in <b>USDC</b> via x402 payments signed with <b>Circle Wallets</b>.
        </p>
      </header>

      <section className="card taskcard">
        <label>Task for the buyer agent</label>
        <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={3} disabled={running} />
        <div className="row">
          <label>
            Budget (USDC) <input value={budget} onChange={(e) => setBudget(e.target.value)} disabled={running} />
          </label>
          <button onClick={run} disabled={running}>
            {running ? "Agent working…" : "▶ Dispatch agent"}
          </button>
        </div>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Agent activity</h2>
          <div className="feed" ref={feedRef}>
            {feed.length === 0 && <p className="dim">Dispatch the agent to see its reasoning and payments live.</p>}
            {feed.map((e, i) => (
              <div key={i} className={`evt evt-${e.type}`}>
                {e.type === "payment" ? (
                  <>
                    💸 Paid <b>{e.amount}</b> to <b>{e.seller}</b> — settled on Arc:{" "}
                    <a href={`${EXPLORER}/tx/${e.txHash}`} target="_blank" rel="noreferrer">
                      {short(e.txHash!)}
                    </a>
                  </>
                ) : e.type === "done" ? (
                  <>✅ Done. {e.purchases} purchases, total spent {e.totalSpent}.</>
                ) : (
                  <>
                    {e.type === "thinking" ? "🧠 " : e.type === "decision" ? "⚖️ " : e.type === "error" ? "⛔ " : "· "}
                    {e.text}
                  </>
                )}
              </div>
            ))}
          </div>
          {deliverable && (
            <div className="deliverable">
              <h3>📦 Deliverable</h3>
              <pre>{deliverable}</pre>
            </div>
          )}
        </section>

        <div className="col">
          <section className="card">
            <h2>Souq catalog</h2>
            {catalog.map((s) => (
              <div key={s.id} className="svc">
                <div>
                  <b>{s.seller}</b> <span className="tag">{s.category}</span>
                  <div className="dim small">{s.description}</div>
                </div>
                <div className="price">
                  {s.price}
                  <div className="dim small">q {s.qualityScore} · {s.latencyMs}ms</div>
                </div>
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Wallets (Circle · Arc testnet)</h2>
            {balances.map((b) => (
              <div key={b.address} className="svc">
                <div>
                  <b>{b.label}</b>
                  <div className="dim small">
                    <a href={`${EXPLORER}/address/${b.address}`} target="_blank" rel="noreferrer">{short(b.address)}</a>
                  </div>
                </div>
                <div className="price">{b.usdc} USDC</div>
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Settlements on Arc</h2>
            {receipts.length === 0 && <p className="dim">No settlements yet.</p>}
            {receipts.map((r) => (
              <div key={r.id} className="svc">
                <div>
                  <b>{r.seller}</b> <span className="tag">{r.serviceId}</span>
                  <div className="dim small">{new Date(r.at).toLocaleTimeString()}</div>
                </div>
                <div className="price">
                  ${(Number(r.amountUnits) / 1e6).toFixed(2)}
                  <div className="small">
                    <a href={`${EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noreferrer">tx ↗</a>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      <footer className="dim small">
        Built on Arc testnet · USDC (native gas + EIP-3009) · Circle Developer-Controlled Wallets · x402 &quot;exact&quot; scheme ·
        Testnet demo only
      </footer>
    </main>
  );
}
