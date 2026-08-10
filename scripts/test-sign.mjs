import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { readFileSync } from 'node:fs';
const env = readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8');
const get = k => (env.match(new RegExp(k + '=([^\n]+)')) || [])[1];
const client = initiateDeveloperControlledWalletsClient({ apiKey: get('CIRCLE_API_KEY'), entitySecret: get('CIRCLE_ENTITY_SECRET') });
const typedData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' }, { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' },
    ],
    TransferWithAuthorization: [
      { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
    ],
  },
  domain: { name: 'USDC', version: '2', chainId: 5042002, verifyingContract: '0x3600000000000000000000000000000000000000' },
  primaryType: 'TransferWithAuthorization',
  message: {
    from: get('CIRCLE_AGENT_WALLET_ADDRESS'), to: get('CIRCLE_SELLER_FASTFX_ADDRESS'),
    value: '50000', validAfter: '0', validBefore: String(Math.floor(Date.now()/1000)+300),
    nonce: '0x' + '11'.repeat(32),
  },
};
const res = await client.signTypedData({ walletId: get('CIRCLE_AGENT_WALLET_ID'), data: JSON.stringify(typedData) });
console.log('signature:', res.data?.signature?.slice(0, 40) + '...');
// verify recovery
const { verifyTypedData } = await import('viem');
const ok = await verifyTypedData({
  address: get('CIRCLE_AGENT_WALLET_ADDRESS'),
  domain: typedData.domain, types: { TransferWithAuthorization: typedData.types.TransferWithAuthorization },
  primaryType: 'TransferWithAuthorization', message: typedData.message, signature: res.data.signature,
});
console.log('signature valid for agent wallet:', ok);
