import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { appendFileSync, readFileSync } from 'node:fs';
const envPath = new URL('../.env.local', import.meta.url).pathname;
const env = readFileSync(envPath, 'utf8');
const get = k => (env.match(new RegExp(k + '=([^\\n]+)')) || [])[1];
const client = initiateDeveloperControlledWalletsClient({ apiKey: get('CIRCLE_API_KEY'), entitySecret: get('CIRCLE_ENTITY_SECRET') });
const w = await client.createWallets({ walletSetId: get('CIRCLE_WALLET_SET_ID'), blockchains: ['ARC-TESTNET'], count: 3, accountType: 'EOA' });
const names = ['FASTFX', 'SOUQDATA', 'LINGO'];
w.data.wallets.forEach((wl, i) => {
  console.log(names[i], wl.address, wl.id);
  appendFileSync(envPath, `CIRCLE_SELLER_${names[i]}_ID=${wl.id}\nCIRCLE_SELLER_${names[i]}_ADDRESS=${wl.address}\n`);
});
