import { Prisma, Tenant } from '@prisma/client';
import { db } from './db';
import { validateEmail } from './emailValidation';
import { applyLedger, InsufficientFunds } from './ledger';
import { ApiError } from './messaging';

export async function extraDisposable(): Promise<string[]> {
  const s = await db.setting.findUnique({ where: { key: 'disposable_domains' } });
  return Array.isArray(s?.value) ? (s!.value as string[]) : [];
}

/** Validates and bills one address. Each record is billed once (ref = record id). */
export async function validateAndBill(tenant: Tenant, price: Prisma.Decimal, email: string, extra: string[]) {
  const r = await validateEmail(email, extra);
  const rec = await db.emailValidation.create({ data: { tenantId: tenant.id, email: r.email, verdict: r.verdict, checks: r.checks as any, charge: price } });
  try {
    await applyLedger({ tenantId: tenant.id, type: 'USAGE', amount: price.negated(), ref: `val:${rec.id}`, reason: 'EMAIL_VALIDATION', requestId: rec.id });
  } catch (e) {
    await db.emailValidation.delete({ where: { id: rec.id } });
    if (e instanceof InsufficientFunds) throw new ApiError(402, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance');
    throw e;
  }
  return { id: rec.id, email: r.email, verdict: r.verdict, checks: r.checks };
}
