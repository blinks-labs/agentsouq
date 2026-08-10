# Submission package — The Stablecoin Commerce Stack Challenge

> Internal prep doc. Copy-paste from here into the submission form.

## Form answers

- **Title:** AgentSouq — Agentic Commerce on Arc
- **Short description:** A marketplace where AI agents buy services from other agents and settle per-call in USDC on Arc. The buyer agent discovers priced services via x402 (HTTP 402) challenges, compares competing sellers on price/quality, signs gasless EIP-3009 USDC authorizations with its Circle developer-controlled wallet, and every purchase settles on-chain in seconds — governed by a hard budget the agent enforces and explains.
- **Track:** 4 — Best Agentic Economy Experience on Arc
- **Circle Developer Account email:** nabsarkar@gmail.com *(confirm this is the console.circle.com email)*
- **Circle products used on Arc:** USDC ✓, Wallets ✓, Nanopayments (conceptual — per-call cent-level pricing), Gateway/CCTP (roadmap, documented in README)
- **GitHub repo:** https://github.com/nabaruns/agentsouq *(push before submitting)*
- **Demo URL:** https://agentsouq.vercel.app ✓ (deployed, e2e verified with live settlements)
- **Video:** *(record per script below, upload to YouTube unlisted/Loom)*
- **Circle Product Feedback:** section included in README.md (required by rules — it's there, titled exactly "Circle Product Feedback")

## Demo video script (~2.5 min)

**[0:00–0:20] Hook.**
"This is AgentSouq — an economy where AI agents are the customers. Agents discover services, negotiate on price, and pay each other in USDC on Arc, Circle's new L1 where USDC is the native gas token. Everything you'll see settles on-chain, on Arc testnet."

**[0:20–0:50] The souq.** *(show dashboard catalog panel)*
"Here's the marketplace: three sellers, four services — FX quotes from two competing providers at different price and quality points, a market-intelligence brief, and a translation service. Each seller's treasury is a Circle developer-controlled wallet on Arc. Prices are per-call: two to ten cents. This is nanopayment-scale commerce no card network could clear."

**[0:50–1:40] Dispatch the agent.** *(type task, budget $0.25, click Dispatch; narrate the live feed)*
"I give the buyer agent a task — a remittance intelligence brief for a UAE fintech — and a hard budget of 25 cents. Watch the feed: the agent hits each API and gets an HTTP 402 payment challenge — the x402 protocol. The agent's LLM planner reasons about which counterparties to buy from — notice it weighs FastFX's premium real-time quotes against SouqData's cheaper delayed ones, and pays 2.5× more for FastFX because the task demands real-time pricing. Then, for each purchase, it signs an EIP-3009 USDC authorization through Circle Wallets — the agent never touches a private key, Circle's signTypedData API does the signing. The seller verifies the signature and settles it on Arc."

**[1:40–2:10] Proof on-chain.** *(click an Arcscan tx link; show wallet balances panel)*
"Every payment is a real transferWithAuthorization on Arc's native USDC contract — here's the transaction on Arcscan, settled with deterministic finality in about a second. Back on the dashboard, the seller treasuries' balances just went up, the agent's went down, all within budget — and the agent explains any purchase it skipped."

**[2:10–2:30] Close.** *(show deliverable)*
"The agent composes the final deliverable from the data it bought, with receipts. Stack: Arc testnet, native USDC with EIP-3009, Circle developer-controlled wallets for agent key management, x402 payment flows, and an LLM planner for the reasoning. AgentSouq — the agentic economy, settled on Arc."

## Pre-submission checklist

- [ ] Wallets funded (agent + settler) via faucet.circle.com → Arc Testnet
- [ ] End-to-end run with real settlements (tx links resolve on testnet.arcscan.app)
- [ ] `gh repo create agentsouq --public --source . --push`
- [ ] `bash scripts/deploy-vercel.sh` → paste URL above (verify a live run works on the deployed URL)
- [ ] Record video per script (localhost or deployed URL both fine)
- [ ] Submit form with answers above before the deadline (tonight!)
