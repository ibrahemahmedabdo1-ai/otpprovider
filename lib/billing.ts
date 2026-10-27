import { Prisma, MsgStatus, ServiceKey } from '@prisma/client';
import { db } from './db';
import { applyLedger, InsufficientFunds } from './ledger';

const SUBMITTED_OR_BETTER: MsgStatus[] = ['SUBMITTED', 'SENT', 'DELIVERED', 'READ'];
const DELIVERED_OR_BETTER: MsgStatus[] = ['DELIVERED', 'READ'];

/** Pure rule (unit-tested): is this status a billable event under the configured policy? */
export function isBillable(status: MsgStatus, billOn: 'SUBMITTED' | 'DELIVERED'): boolean {
  return (billOn === 'DELIVERED' ? DELIVERED_OR_BETTER : SUBMITTED_OR_BETTER).includes(status);
}

/** Idempotent: ref `msg:<id>` guarantees one debit per message, however many times this is called. */
export async function settleMessage(messageId: string) {
  const m = await db.messageRequest.findUnique({ where: { id: messageId } });
  if (!m) return;
  const cfg = await db.serviceConfig.findUnique({ where: { key: m.service } });
  if (!cfg || !isBillable(m.status, cfg.billOn)) return;
  const tenant = await db.tenant.findUnique({ where: { id: m.tenantId } });
  if (!tenant) return;
  const po = (tenant.priceOverrides ?? {}) as Record<string, string>;
  const price = new Prisma.Decimal(po[m.service] ?? cfg.unitPrice);
  try {
    const { duplicate } = await applyLedger({
      tenantId: m.tenantId, type: 'USAGE', amount: price.negated(), ref: `msg:${m.id}`,
      reason: `${m.service} ${m.id}`, requestId: m.id,
    });
    if (!duplicate) await db.messageRequest.update({ where: { id: m.id }, data: { charge: price } });
  } catch (e) {
    if (e instanceof InsufficientFunds) {
      await db.messageRequest.update({ where: { id: m.id }, data: { errorCode: 'BILLING_INSUFFICIENT_FUNDS' } });
    } else throw e;
  }
}

/** Reverses a charge using a ledger entry (history is never deleted). */
export async function refundMessage(messageId: string, byUserId: string, reason: string) {
  const m = await db.messageRequest.findUnique({ where: { id: messageId } });
  if (!m || m.charge.isZero()) throw new Error('NOTHING_TO_REFUND');
  await applyLedger({
    tenantId: m.tenantId, type: 'REFUND', amount: m.charge, ref: `refund:${m.id}`,
    reason, requestId: m.id, createdById: byUserId,
  });
}

export const billableServices: ServiceKey[] = ['EMAIL_OTP', 'WHATSAPP_OTP', 'EMAIL_VALIDATION'];
