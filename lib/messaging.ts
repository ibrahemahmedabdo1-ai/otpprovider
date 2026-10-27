import { Prisma, ServiceKey, MsgStatus, Tenant } from '@prisma/client';
import { db } from './db';
import { encrypt, decrypt, generateCode, hmacCode, safeEqual } from './crypto';
import { getRoutes, sendViaResend, otpEmailHtml } from './email';
import { settleMessage } from './billing';
import { chooseDevice } from './whatsapp';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

const IN_FLIGHT: MsgStatus[] = ['QUEUED', 'PROCESSING', 'SUBMITTED', 'SENT'];

/**
 * Creates the request row under a tenant row lock. The wallet "hold" counts every unsettled in-flight
 * message at the current price, so parallel requests cannot spend more than the balance.
 * Idempotent per (tenant, idempotencyKey).
 */
export async function createRequest(
  tenant: Tenant, service: ServiceKey, price: Prisma.Decimal,
  data: { apiKeyId?: string; idempotencyKey?: string; recipient: string; ttlSeconds: number; deviceId?: string | null; template?: string },
) {
  return db.$transaction(async (tx) => {
    if (data.idempotencyKey) {
      const ex = await tx.messageRequest.findUnique({ where: { tenantId_idempotencyKey: { tenantId: tenant.id, idempotencyKey: data.idempotencyKey } } });
      if (ex) return { msg: ex, duplicate: true };
    }
    const rows = await tx.$queryRaw<{ balance: Prisma.Decimal; allowNegative: boolean }[]>`
      SELECT "balance","allowNegative" FROM "Tenant" WHERE "id" = ${tenant.id} FOR UPDATE`;
    const inflight = await tx.messageRequest.count({ where: { tenantId: tenant.id, service, status: { in: IN_FLIGHT }, charge: 0 } });
    const need = price.times(inflight + 1);
    if (!rows[0].allowNegative && new Prisma.Decimal(rows[0].balance).lessThan(need))
      throw new ApiError(402, 'INSUFFICIENT_BALANCE', 'Insufficient wallet balance');
    const msg = await tx.messageRequest.create({
      data: {
        tenantId: tenant.id, service, apiKeyId: data.apiKeyId, idempotencyKey: data.idempotencyKey,
        recipient: data.recipient, expiresAt: new Date(Date.now() + data.ttlSeconds * 1000),
        deviceId: data.deviceId ?? null, template: data.template,
      },
    });
    return { msg, duplicate: false };
  });
}

export const publicMessage = (m: { id: string; status: MsgStatus; service: ServiceKey; recipient: string; senderLabel: string | null; createdAt: Date; expiresAt: Date | null; charge: Prisma.Decimal }) => ({
  id: m.id, status: m.status, service: m.service, sender: m.senderLabel, recipient: m.recipient,
  created_at: m.createdAt, expires_at: m.expiresAt, charge: m.charge.toString(),
});

export async function sendEmailOtp(tenant: Tenant, apiKeyId: string, price: Prisma.Decimal, ttlSeconds: number, to: string, idem?: string) {
  const routes = await getRoutes('EMAIL_OTP', tenant.senderId);
  if (!routes.length) throw new ApiError(503, 'NO_PROVIDER', 'No email provider is configured');
  const { msg, duplicate } = await createRequest(tenant, 'EMAIL_OTP', price, { apiKeyId, idempotencyKey: idem, recipient: to, ttlSeconds });
  if (duplicate) return msg;

  const code = generateCode(6);
  await db.messageRequest.update({ where: { id: msg.id }, data: { status: 'PROCESSING', codeHash: hmacCode(msg.id, code) } });
  const started = Date.now();
  let final: MsgStatus = 'FAILED';
  let senderLabel: string | null = null, providerName: string | null = null, providerMessageId: string | null = null;
  let errorCode: string | null = null, errorMessage: string | null = null;

  for (const r of routes) {
    const out = await sendViaResend(r.apiKey, r.from, to, 'Your verification code',
      otpEmailHtml(code, 'OTPProvider', Math.round(ttlSeconds / 60)), `otp-${msg.id}-${r.providerId ?? 'env'}`);
    await db.messageAttempt.create({ data: { messageId: msg.id, provider: r.providerName, outcome: out.outcome, response: out.outcome === 'ACCEPTED' ? out.providerMessageId : out.message.slice(0, 300) } });
    if (out.outcome === 'ACCEPTED') {
      final = 'SUBMITTED'; senderLabel = r.senderAddress; providerName = r.providerName; providerMessageId = out.providerMessageId;
      if (r.senderId) await db.emailSender.update({ where: { id: r.senderId }, data: { lastUsedAt: new Date() } });
      break;
    }
    senderLabel = r.senderAddress; providerName = r.providerName;
    if (out.outcome === 'UNKNOWN') { final = 'UNKNOWN_OUTCOME'; errorCode = 'UNKNOWN_OUTCOME'; errorMessage = out.message; break; } // never fail over after an uncertain attempt
    final = 'REJECTED'; errorCode = out.code; errorMessage = out.message; // definite rejection: next provider is safe
  }
  const updated = await db.messageRequest.update({
    where: { id: msg.id },
    data: { status: final, senderLabel, providerName, providerMessageId, errorCode, errorMessage, submittedAt: final === 'SUBMITTED' ? new Date() : null, durationMs: Date.now() - started },
  });
  await settleMessage(msg.id);
  return db.messageRequest.findUniqueOrThrow({ where: { id: updated.id } });
}

export async function sendWhatsappOtp(tenant: Tenant, apiKeyId: string, price: Prisma.Decimal, ttlSeconds: number, to: string, idem?: string) {
  const device = await chooseDevice(tenant.pinnedDeviceId);
  if (!device) throw new ApiError(503, 'NO_DEVICE', 'No WhatsApp device is currently online');
  const { msg, duplicate } = await createRequest(tenant, 'WHATSAPP_OTP', price, { apiKeyId, idempotencyKey: idem, recipient: to, ttlSeconds, deviceId: device.id, template: 'otp' });
  if (duplicate) return msg;
  const code = generateCode(6);
  const body = `Your verification code is ${code}. It expires in ${Math.round(ttlSeconds / 60)} minutes. Do not share it with anyone.`;
  return db.messageRequest.update({
    where: { id: msg.id },
    data: { codeHash: hmacCode(msg.id, code), bodyEnc: encrypt(body), senderLabel: device.phone ?? device.label },
  });
}

export type VerifyResult = { valid: boolean; reason?: 'NOT_FOUND' | 'EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'MISMATCH' | 'ALREADY_USED' };
const MAX_ATTEMPTS = 5;

export async function verifyOtp(tenantId: string, service: ServiceKey, requestId: string, code: string): Promise<VerifyResult> {
  const m = await db.messageRequest.findFirst({ where: { id: requestId, tenantId, service } });
  if (!m || !m.codeHash) return { valid: false, reason: 'NOT_FOUND' };
  if (m.verifiedAt) return { valid: false, reason: 'ALREADY_USED' };
  if (m.expiresAt && m.expiresAt < new Date()) return { valid: false, reason: 'EXPIRED' };
  if (m.codeAttempts >= MAX_ATTEMPTS) return { valid: false, reason: 'TOO_MANY_ATTEMPTS' };
  // atomic attempt increment so parallel guesses cannot exceed the limit
  const inc = await db.messageRequest.updateMany({ where: { id: m.id, codeAttempts: { lt: MAX_ATTEMPTS }, verifiedAt: null }, data: { codeAttempts: { increment: 1 } } });
  if (inc.count === 0) return { valid: false, reason: 'TOO_MANY_ATTEMPTS' };
  if (!safeEqual(m.codeHash, hmacCode(m.id, code))) return { valid: false, reason: 'MISMATCH' };
  const used = await db.messageRequest.updateMany({ where: { id: m.id, verifiedAt: null }, data: { verifiedAt: new Date(), codeHash: null } });
  return used.count ? { valid: true } : { valid: false, reason: 'ALREADY_USED' };
}

export { decrypt };
