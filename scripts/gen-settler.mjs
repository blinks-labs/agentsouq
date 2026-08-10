import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { appendFileSync } from 'node:fs';
const pk = generatePrivateKey();
const acct = privateKeyToAccount(pk);
appendFileSync(new URL('../.env.local', import.meta.url).pathname, `SETTLER_PRIVATE_KEY=${pk}\nSETTLER_ADDRESS=${acct.address}\n`);
console.log('SETTLER', acct.address);
