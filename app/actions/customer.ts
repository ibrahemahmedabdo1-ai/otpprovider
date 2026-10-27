'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { generateApiKey } from '@/lib/apiAuth';
import { setReveal } from '@/lib/reveal';
import { back } from '@/lib/flash';
import { audit } from '@/lib/audit';
import { validateAndBill, extraDisposable } from '@/lib/validationService';
import { gateService, getServiceConfig } from '@/lib/services';
import { ApiError } from '@/lib/messaging';
import { saveAttachment } from '@/lib/attachments';

const SERVICES = ['EMAIL_OTP', 'WHATSAPP_OTP', 'EMAIL_VALIDATION'];

export async function createKeyAction(fd: FormData) {
  const { user, tenant } = await requireClient();
  const label = String(fd.get('label') ?? '').trim().slice(0, 60) || 'Default';
  const services = fd.getAll('services').map(String).filter((s) => SERVICES.includes(s));
  const rate = Math.min(Math.max(Number(fd.get('rate') ?? 60) || 60, 1), 1000);
  if ((await db.apiKey.count({ where: { tenantId: tenant.id, revokedAt: null } })) >= 20) back('/dashboard/keys', 'err', 'Key limit reached (20 active keys).');
  const k = generateApiKey();
  await db.apiKey.create({ data: { tenantId: tenant.id, label, prefix: k.prefix, hash: k.hash, services, rateLimit: rate } });
  await audit({ id: user.id, role: user.role }, 'apikey.create', tenant.id, { label }, 'security');
  setReveal('New API key', k.full, 'Store it securely. We keep only a hash, so it cannot be shown again.');
  revalidatePath('/dashboard/keys');
  back('/dashboard/keys', 'ok', 'API key created.');
}

export async function revokeKeyAction(fd: FormData) {
  const { user, tenant } = await requireClient();
  const r = await db.apiKey.updateMany({ where: { id: String(fd.get('id')), tenantId: tenant.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (r.count) await audit({ id: user.id, role: user.role }, 'apikey.revoke', String(fd.get('id')), undefined, 'security');
  back('/dashboard/keys', 'ok', 'Key revoked. It stops working immediately.');
}

export async function rotateKeyAction(fd: FormData) {
  const { user, tenant } = await requireClient();
  const old = await db.apiKey.findFirst({ where: { id: String(fd.get('id')), tenantId: tenant.id, revokedAt: null } });
  if (!old) back('/dashboard/keys', 'err', 'Key not found.');
  const k = generateApiKey();
  await db.$transaction([
    db.apiKey.update({ where: { id: old!.id }, data: { revokedAt: new Date() } }),
    db.apiKey.create({ data: { tenantId: tenant.id, label: old!.label, prefix: k.prefix, hash: k.hash, services: old!.services, rateLimit: old!.rateLimit } }),
  ]);
  await audit({ id: user.id, role: user.role }, 'apikey.rotate', old!.id, undefined, 'security');
  setReveal('Rotated API key', k.full, 'The previous key is already revoked. Update your integration now.');
  back('/dashboard/keys', 'ok', 'Key rotated.');
}

const topup = z.object({ amount: z.coerce.number().min(1).max(100000), method: z.enum(['USDT', 'BANK_TRANSFER', 'OTHER']), reference: z.string().max(200).optional(), note: z.string().max(500).optional() });
export async function topupRequestAction(fd: FormData) {
  const { user, tenant } = await requireClient();
  const p = topup.safeParse(Object.fromEntries(fd));
  if (!p.success) back('/dashboard/wallet', 'err', 'Enter a valid amount and method.');
  if ((await db.topupRequest.count({ where: { tenantId: tenant.id, status: 'PENDING' } })) >= 5) back('/dashboard/wallet', 'err', 'You already have 5 pending requests.');
  await db.topupRequest.create({ data: { tenantId: tenant.id, ...p.data! } });
  await audit({ id: user.id, role: user.role }, 'topup.request', tenant.id, { amount: p.data!.amount }, 'finance');
  back('/dashboard/wallet', 'ok', 'Top-up request sent. Your balance is credited only after our team confirms the payment.');
}

export async function cancelTopupAction(fd: FormData) {
  const { tenant } = await requireClient();
  await db.topupRequest.updateMany({ where: { id: String(fd.get('id')), tenantId: tenant.id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  back('/dashboard/wallet', 'ok', 'Request cancelled.');
}

export async function validateEmailsAction(fd: FormData) {
  const { tenant } = await requireClient();
  const list = [...new Set(String(fd.get('emails') ?? '').split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
  if (!list.length) back('/dashboard/validation', 'err', 'Paste at least one email address.');
  const cfg = await getServiceConfig('EMAIL_VALIDATION');
  const max = Number((cfg.settings as any)?.maxBatch ?? 100);
  if (list.length > max) back('/dashboard/validation', 'err', `Limit is ${max} addresses per request.`);
  const gate = await gateService(tenant, 'EMAIL_VALIDATION');
  if (!gate.ok) back('/dashboard/validation', 'err', gate.message);
  const extra = await extraDisposable();
  let done = 0;
  try { for (const e of list) { await validateAndBill(tenant, (gate as any).price, e, extra); done++; } }
  catch (e) { if (e instanceof ApiError) back('/dashboard/validation', 'err', `${e.message}. Processed ${done} of ${list.length}.`); throw e; }
  back('/dashboard/validation', 'ok', `Validated ${done} address(es).`);
}

const tk = z.object({ subject: z.string().min(3).max(120), body: z.string().min(3).max(5000), category: z.enum(['general', 'billing', 'technical', 'whatsapp', 'account-closure']).default('general') });
export async function createTicketAction(fd: FormData) {
  const { user, tenant } = await requireClient();
  const p = tk.safeParse(Object.fromEntries(fd));
  if (!p.success) back('/dashboard/support', 'err', 'Please enter a subject and message.');
  const att = await saveAttachment(fd.get('file'));
  if (att === 'BAD') back('/dashboard/support', 'err', 'Attachment must be PNG, JPG, PDF or TXT up to 1 MB.');
  const t = await db.ticket.create({
    data: { tenantId: tenant.id, subject: p.data!.subject, category: p.data!.category, assignedId: tenant.assignedSupportId,
      messages: { create: { authorId: user.id, authorName: user.name, authorRole: 'CLIENT', body: p.data!.body, ...(att ?? {}) } } },
  });
  back(`/dashboard/support/${t.id}`, 'ok', 'Ticket created.');
}

export async function customerReplyAction(fd: FormData) {
  const { user, tenant } = await requireClient();
  const id = String(fd.get('ticketId'));
  const t = await db.ticket.findFirst({ where: { id, tenantId: tenant.id } });
  if (!t) back('/dashboard/support', 'err', 'Ticket not found.');
  const body = String(fd.get('body') ?? '').trim().slice(0, 5000);
  const att = await saveAttachment(fd.get('file'));
  if (att === 'BAD') back(`/dashboard/support/${id}`, 'err', 'Attachment must be PNG, JPG, PDF or TXT up to 1 MB.');
  if (!body && !att) back(`/dashboard/support/${id}`, 'err', 'Write a message.');
  await db.$transaction([
    db.ticketMessage.create({ data: { ticketId: id, authorId: user.id, authorName: user.name, authorRole: 'CLIENT', body: body || '(attachment)', ...(att ?? {}) } }),
    db.ticket.update({ where: { id }, data: { status: t!.status === 'RESOLVED' || t!.status === 'CLOSED' ? 'OPEN' : t!.status === 'WAITING' ? 'OPEN' : t!.status } }),
  ]);
  back(`/dashboard/support/${id}`, 'ok', 'Sent.');
}

export async function updateProfileAction(fd: FormData) {
  const { user } = await requireClient();
  const name = String(fd.get('name') ?? '').trim().slice(0, 80);
  if (name.length < 2) back('/dashboard/settings', 'err', 'Name is too short.');
  await db.user.update({ where: { id: user.id }, data: { name } });
  back('/dashboard/settings', 'ok', 'Profile updated.');
}
