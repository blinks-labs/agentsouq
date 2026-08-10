// One-time Circle developer-controlled wallets setup:
// 1. generate + register entity secret  2. create wallet set  3. create agent wallet on Arc testnet
import { generateEntitySecret, registerEntitySecretCiphertext, initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { appendFileSync, writeFileSync, existsSync, readFileSync } from 'node:fs';

const API_KEY = process.env.CIRCLE_API_KEY;
if (!API_KEY) { console.error('CIRCLE_API_KEY missing'); process.exit(1); }

const envPath = new URL('../.env.local', import.meta.url).pathname;
const env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

let entitySecret = process.env.CIRCLE_ENTITY_SECRET || (env.match(/CIRCLE_ENTITY_SECRET=(\w+)/) || [])[1];

if (!entitySecret) {
  // generateEntitySecret only prints; generate our own 32 bytes instead
  const { randomBytes } = await import('node:crypto');
  const { mkdirSync } = await import('node:fs');
  entitySecret = randomBytes(32).toString('hex');
  appendFileSync(envPath, `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`); // persist BEFORE registering
  const recoveryDir = new URL('../recovery', import.meta.url).pathname;
  mkdirSync(recoveryDir, { recursive: true });
  const res = await registerEntitySecretCiphertext({
    apiKey: API_KEY,
    entitySecret,
    recoveryFileDownloadPath: recoveryDir,
  });
  console.log('entity secret registered:', JSON.stringify(res.data ?? res).slice(0, 200));
}

const client = initiateDeveloperControlledWalletsClient({ apiKey: API_KEY, entitySecret });

let walletSetId = (env.match(/CIRCLE_WALLET_SET_ID=([\w-]+)/) || [])[1];
if (!walletSetId) {
  const ws = await client.createWalletSet({ name: 'agentsouq' });
  walletSetId = ws.data?.walletSet?.id;
  console.log('walletSet:', walletSetId);
  appendFileSync(envPath, `CIRCLE_WALLET_SET_ID=${walletSetId}\n`);
}

// Try Arc enums in order until one works
for (const chain of ['ARC-TESTNET', 'ARC-SEPOLIA', 'ARC']) {
  try {
    const w = await client.createWallets({ walletSetId, blockchains: [chain], count: 1, accountType: 'EOA' });
    const wallet = w.data?.wallets?.[0];
    console.log('WALLET CREATED on', chain, JSON.stringify(wallet));
    appendFileSync(envPath, `CIRCLE_AGENT_WALLET_ID=${wallet.id}\nCIRCLE_AGENT_WALLET_ADDRESS=${wallet.address}\n`);
    process.exit(0);
  } catch (e) {
    console.error(chain, '->', e.response?.data ? JSON.stringify(e.response.data) : e.message);
  }
}
console.log('No Arc enum worked; will fall back to viem EOA for agent wallet.');
