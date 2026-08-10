// In-memory demo store for payment receipts and agent activity.
// Balances/settlements are always re-derived from chain, so this is display-only.

export type Receipt = {
  id: string;
  serviceId: string;
  seller: string;
  from: string;
  to: string;
  amountUnits: string;
  txHash: string;
  at: number;
};

type Store = { receipts: Receipt[] };

const g = globalThis as unknown as { __souqStore?: Store };
export const store: Store = (g.__souqStore ??= { receipts: [] });

export function addReceipt(r: Receipt) {
  store.receipts.unshift(r);
  if (store.receipts.length > 100) store.receipts.pop();
}
