"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signMessageFor } from "@/lib/guard";

type FeedItem = {
  type: string;
  text?: string;
  seller?: string;
  amount?: string;
  txHash?: string;
  serviceId?: string;
  totalSpent?: string;
  purchases?: number;
};
type Balance = { label: string; address: string; usdc: string };
type Receipt = { id: string; serviceId: string; seller: string; amountUnits: string; txHash: string; at: number };
type CatalogItem = { id: string; seller: string; category: string; price: string; qualityScore: number; latencyMs: number; description: string };

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

const EXPLORER = "https://testnet.arcscan.app";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const toHex = (s: string) => "0x" + Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, "0")).join("");

const DEFAULT_TASK =
  "Prepare a remittance intelligence brief for a UAE fintech: real-time FX quotes AED to PHP and INR for a live pricing engine, corridor insights, and a customer summary in Tagalog and Hindi.";

// tiny markdown renderer for the deliverable (headings, bold, bullets)
function Md({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, "<h3>$1</h3>")
    .replace(/^# (.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)(?!\n<li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br/>");
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Home() {
  const [phase, setPhase] = useState<"new" | "session">("new");
  const [task, setTask] = useState(DEFAULT_TASK);
  const [budget, setBudget] = useState("0.25");
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [deliverable, setDeliverable] = useState("");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
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

  async function connect() {
    if (!window.ethereum) {
      setNotice("No wallet extension found — install MetaMask (any EVM wallet works, no funds needed).");
      return;
    }
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    setWallet(accounts[0] ?? null);
    setNotice("");
  }

  function disconnect() {
    setWallet(null);
    setWalletBalance(null);
  }

  // connected wallet's USDC balance on Arc testnet (USDC is the native token)
  useEffect(() => {
    if (!wallet) return;
    fetch("https://rpc.testnet.arc.io", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [wallet, "latest"] }),
    })
      .then((r) => r.json())
      .then((j) => setWalletBalance((Number(BigInt(j.result)) / 1e18).toFixed(2)))
      .catch(() => setWalletBalance(null));
  }, [wallet]);

  async function dispatch() {
    setNotice("");
    if (!wallet || !window.ethereum) {
      setNotice("Connect a wallet first — the signature gates the demo (no funds or gas needed).");
      return;
    }
    let signature: string;
    const ts = Date.now();
    try {
      signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [toHex(signMessageFor(wallet, ts)), wallet],
      })) as string;
    } catch {
      setNotice("Signature declined.");
      return;
    }

    setPhase("session");
    setRunning(true);
    setFeed([{ type: "user", text: task }]);
    setDeliverable("");
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, budget: Number(budget), address: wallet, signature, ts }),
      });
      if (!res.ok) {
        const j = await res.json();
        setFeed((f) => [...f, { type: "error", text: j.error ?? `HTTP ${res.status}` }]);
        return;
      }
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

  const walletChip = wallet ? (
    <span className="wallet-group">
      <span className="chip chip-static" title={wallet}>
        ⬡ {short(wallet)}
        {walletBalance !== null && <span className="bal">{walletBalance} USDC</span>}
      </span>
      <button className="chip chip-x" onClick={disconnect} title="Disconnect">✕</button>
    </span>
  ) : (
    <button className="chip" onClick={connect}>⬡ Connect wallet</button>
  );

  /* ─────────── new-session view: centered composer ─────────── */
  if (phase === "new") {
    return (
      <main className="hero">
        <div className="hero-top">{walletChip}</div>
        <div className="hero-center">
          <h1 className="wordmark">AgentSouq</h1>
          <p className="tagline">
            The souq where <em>AI agents</em> are the customers — discovering services, weighing counterparties,
            and settling per-call in USDC on Arc.
          </p>

          <div className="composer">
            <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={4} spellCheck={false} />
            <div className="composer-bar">
              <label className="budget">
                budget&nbsp;
                <input value={budget} onChange={(e) => setBudget(e.target.value)} />
                &nbsp;USDC
              </label>
              <button className="go" onClick={dispatch} disabled={running}>
                Dispatch agent ↵
              </button>
            </div>
          </div>
          {notice && <p className="notice">{notice}</p>}
          <p className="fineprint">Sign-in is a wallet signature — no funds, no gas, capped at $0.25 testnet USDC per run.</p>

          <div className="stalls">
            {catalog.map((s) => (
              <div key={s.id} className="stall">
                <div className="stall-head">
                  <span className="seller">{s.seller}</span>
                  <span className="price">{s.price}</span>
                </div>
                <p>{s.description}</p>
                <span className="meta">quality {s.qualityScore} · {s.latencyMs}ms</span>
              </div>
            ))}
          </div>
        </div>
        <footer>Arc testnet · native USDC + EIP-3009 · Circle Wallets · x402 · testnet demo</footer>
      </main>
    );
  }

  /* ─────────── session view: chat left, artifacts main ─────────── */
  return (
    <main className="session">
      <aside className="chat">
        <div className="chat-head">
          <span className="wordmark-sm" onClick={() => setPhase("new")} role="button">AgentSouq</span>
          {walletChip}
        </div>
        <div className="chat-feed" ref={feedRef}>
          {feed.map((e, i) =>
            e.type === "user" ? (
              <div key={i} className="msg msg-user">{e.text}</div>
            ) : e.type === "payment" ? (
              <div key={i} className="msg msg-pay">
                Paid <b>{e.amount}</b> → {e.seller}
                <a href={`${EXPLORER}/tx/${e.txHash}`} target="_blank" rel="noreferrer" className="txlink">
                  {short(e.txHash!)} ↗
                </a>
              </div>
            ) : e.type === "done" ? (
              <div key={i} className="msg msg-done">Run complete — {e.purchases} purchases, {e.totalSpent} spent.</div>
            ) : (
              <div key={i} className={`msg msg-${e.type}`}>{e.text}</div>
            ),
          )}
          {running && <div className="msg msg-status pulse">working…</div>}
        </div>
        <button className="newrun" onClick={() => setPhase("new")} disabled={running}>
          + New task
        </button>
      </aside>

      <section className="artifacts">
        <div className="art">
          <h3>Deliverable</h3>
          {deliverable ? <Md text={deliverable} /> : <p className="empty">The agent&apos;s composed output lands here after it finishes buying data.</p>}
        </div>

        <div className="art-row">
          <div className="art">
            <h3>Settlements on Arc</h3>
            {receipts.length === 0 && <p className="empty">No settlements yet this session.</p>}
            {receipts.map((r) => (
              <div key={r.id} className="line">
                <span>{r.seller} <span className="meta">{r.serviceId}</span></span>
                <span className="num">
                  ${(Number(r.amountUnits) / 1e6).toFixed(2)}{" "}
                  <a href={`${EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noreferrer">tx ↗</a>
                </span>
              </div>
            ))}
          </div>
          <div className="art">
            <h3>Wallets <span className="meta">Circle · Arc testnet</span></h3>
            {balances.map((b) => (
              <div key={b.address} className="line">
                <a href={`${EXPLORER}/address/${b.address}`} target="_blank" rel="noreferrer">{b.label}</a>
                <span className="num">{b.usdc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
