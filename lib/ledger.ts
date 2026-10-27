import { Prisma, LedgerType } from '@prisma/client';
import { db } from './db';

export class InsufficientFunds extends Error {
  constructor() { super('INSUFFICIENT_FUNDS'); }
}

type Opts = {
  tenantId: string;
  type: LedgerType;
  /** Signed amount: positive credits the wallet, negative debits it. */
  amount: Prisma.Decimal | number | string;
  ref?: string; // idempotency key: the same ref can only be applied once
  reason?: string;
  requestId?: string;
  createdById?: string;
};

/**
 * Atomic ledger write. Locks the tenant row, so concurrent requests cannot overspend.
 * Idempotent when `ref` is supplied: a second call with the same ref returns the first entry.
 */
export async function applyLedger(o: Opts) {
  const amount = new Prisma.Decimal(o.amount);
  return db.$transaction(
    async (tx) => {
      if (o.ref) {
        const existing = await tx.ledgerEntry.findUnique({ where: { ref: o.ref } });
        if (existing) return { entry: existing, duplicate: true };
      }
      const rows = await tx.$queryRaw<{ balance: Prisma.Decimal; allowNegative: boolean }[]>`
        SELECT "balance", "allowNegative" FROM "Tenant" WHERE "id" = ${o.tenantId} FOR UPDATE`;
      if (!rows.length) throw new Error('TENANT_NOT_FOUND');
      const next = new Prisma.Decimal(rows[0].balance).plus(amount);
      if (next.isNegative() && !rows[0].allowNegative) throw new InsufficientFunds();
      await tx.tenant.update({ where: { id: o.tenantId }, data: { balance: next } });
      const entry = await tx.ledgerEntry.create({
        data: {
          tenantId: o.tenantId, type: o.type, amount, balanceAfter: next, ref: o.ref,
          reason: o.reason, requestId: o.requestId, createdById: o.createdById,
        },
      });
      return { entry, duplicate: false };
    },
    { timeout: 15000 },
  );
}

export function fmtMoney(d: Prisma.Decimal | number | string, digits = 4): string {
  const n = Number(new Prisma.Decimal(d).toFixed(digits));
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits });
}
