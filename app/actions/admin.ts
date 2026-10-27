'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { Role, ServiceKey } from '@prisma/client';
import { db } from '@/lib/db';
import { requireUser, hashPassword } from '@/lib/auth';
import { can, creatableRoles, type Permission } from '@/lib/rbac';
import { createAccount, DuplicateEmail } from '@/lib/accounts';
import { applyLedger, InsufficientFunds } from '@/lib/ledger';
import { refundMessage } from '@/lib/billing';
import { setReveal } from '@/lib/reveal';
import { generatePassword, encrypt, decrypt, randomToken } from '@/lib/crypto';
import { createDevice, rerouteQueued } from '@/lib/whatsapp';
import { listResendDomains } from '@/lib/resendApi';
import { getRoutes, sendViaResend, otpEmailHtml } from '@/lib/email';
import { normalizePhone } from '@/lib/phone';
import { ensureServiceConfigs } from '@/lib/services';
import { audit } from '@/lib/audit';
import { back } from '@/lib/flash';

const guard = async (perm: Permission) => (await requireUser({ perm })).user;
const actor = (u: { id: string; role: string }) => ({ id: u.id, role: u.role });
const S = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

/* ───────────── accounts (every role) ───────────── */
const acc = z.object({
  name: z.string().min(2).max(80), email: z.string().email(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'CLIENT']),
  company: z.string().max(120).optional(), packageId: z.string().optional(), credit: z.coerce.number().min(0).max(100000).optional(),
});

export async function createAccountAction(fd: FormData) {
  const me = await guard('accounts.create');
  const p = acc.safeParse(Object.fromEntries(fd));
  if (!p.success) back('/admin/accounts', 'err', 'Check the name, email and role.');
  const d = p.data!;
  if (!creatableRoles(me.role).includes(d.role as Role)) back('/admin/accounts', 'err', 'Your role cannot create this account type.');
  if (d.credit && !can(me, 'finance.write')) back('/admin/accounts', 'err', 'Only finance-authorized staff can grant initial credit.');
  try {
    const r = await createAccount({ email: d.email, name: d.name, role: d.role as Role, tenantName: d.company, packageId: d.packageId || null, initialCredit: d.credit, createdBy: actor(me) });
    setReveal(`Temporary password for ${r.user.email} (${d.role})`, r.password!, 'Send it through a secure channel. The user must change it at first sign-in.');
  } catch (e) {
    if (e instanceof DuplicateEmail) back('/admin/accounts', 'err', 'That email already exists.');
    throw e;
  }
  back('/admin/accounts', 'ok', 'Account created.');
}

export async function setUserStatusAction(fd: FormData) {
  const me = await guard('customers.write');
  const id = S(fd, 'userId'); const status = S(fd, 'status');
  if (!['ACTIVE', 'SUSPENDED', 'RESTRICTED', 'CLOSED'].includes(status)) back('/admin/customers', 'err', 'Bad status.');
  const u = await db.user.findUnique({ where: { id } });
  if (!u) back('/admin/customers', 'err', 'Not found.');
  if (u!.id === me.id) back('/admin/customers', 'err', 'You cannot change your own status.');
  if (u!.role !== 'CLIENT' && !can(me, 'staff.manage')) back('/admin/customers', 'err', 'Only Super Admin can change staff accounts.');
  const st = status as 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'CLOSED';
  await db.$transaction(async (tx) => {
    // RESTRICTED keeps the dashboard login but blocks API use; SUSPENDED/CLOSED also block login
    await tx.user.updateMany({ where: u!.tenantId ? { tenantId: u!.tenantId } : { id }, data: { status: st === 'RESTRICTED' ? 'ACTIVE' : st } });
    if (u!.tenantId) await tx.tenant.update({ where: { id: u!.tenantId }, data: { status: st } });
    if (st === 'SUSPENDED' || st === 'CLOSED') await tx.session.updateMany({ where: u!.tenantId ? { user: { tenantId: u!.tenantId } } : { userId: id }, data: { revokedAt: new Date() } });
  });
  await audit(actor(me), `account.${st.toLowerCase()}`, id);
  back(u!.role === 'CLIENT' ? `/admin/customers/${u!.tenantId}` : '/admin/staff', 'ok', `Status: ${st}`);
}

export async function resetPasswordAction(fd: FormData) {
  const me = await guard('customers.write');
  const id = S(fd, 'userId');
  const u = await db.user.findUnique({ where: { id } });
  if (!u) back('/admin/customers', 'err', 'Not found.');
  if (u!.role !== 'CLIENT' && !can(me, 'staff.manage')) back('/admin/customers', 'err', 'Only Super Admin can reset staff passwords.');
  const pw = generatePassword(16);
  await db.$transaction([
    db.user.update({ where: { id }, data: { passwordHash: await hashPassword(pw), mustChangePassword: true, failedLogins: 0, lockedUntil: null } }),
    db.session.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } }),
  ]);
  await audit(actor(me), 'password.admin_reset', id);
  setReveal(`New temporary password for ${u!.email}`, pw, 'Existing sessions were signed out. The user must change it at next sign-in.');
  back(u!.role === 'CLIENT' ? `/admin/customers/${u!.tenantId}` : '/admin/staff', 'ok', 'Password reset.');
}

export async function resetMfaAction(fd: FormData) {
  const me = await guard('staff.manage');
  const id = S(fd, 'userId');
  await db.user.update({ where: { id }, data: { mfaEnabled: false, mfaSecretEnc: null } });
  await db.session.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
  await audit(actor(me), 'mfa.admin_reset', id, undefined, 'security');
  back('/admin/staff', 'ok', 'MFA reset. The user must enroll again at next sign-in.');
}

export async function setExtraPermsAction(fd: FormData) {
  const me = await guard('staff.manage');
  const id = S(fd, 'userId');
  const allowed = ['finance.read', 'customers.write', 'tickets.handle', 'audit.read'];
  const perms = fd.getAll('perms').map(String).filter((x) => allowed.includes(x));
  await db.user.update({ where: { id }, data: { extraPerms: perms } });
  await audit(actor(me), 'staff.perms', id, { perms });
  back('/admin/staff', 'ok', 'Permissions updated.');
}

/* ───────────── customer configuration ───────────── */
export async function updateCustomerAction(fd: FormData) {
  const me = await guard('customers.write');
  const id = S(fd, 'tenantId');
  const data: Prisma.TenantUpdateInput = {};
  const ov: Record<string, boolean> = {};
  for (const k of ['EMAIL_OTP', 'WHATSAPP_OTP', 'EMAIL_VALIDATION']) { const v = S(fd, `svc_${k}`); if (v === 'on') ov[k] = true; if (v === 'off') ov[k] = false; }
  data.serviceOverrides = ov;
  const prices: Record<string, string> = {};
  if (can(me, 'finance.write')) {
    for (const k of ['EMAIL_OTP', 'WHATSAPP_OTP', 'EMAIL_VALIDATION']) { const v = S(fd, `price_${k}`); if (v && !isNaN(Number(v)) && Number(v) >= 0) prices[k] = v; }
    data.priceOverrides = prices;
    data.allowNegative = fd.get('allowNegative') === 'on';
  }
  data.package = S(fd, 'packageId') ? { connect: { id: S(fd, 'packageId') } } : { disconnect: true };
  data.pinnedDeviceId = S(fd, 'pinnedDeviceId') || null;
  data.senderId = S(fd, 'senderId') || null;
  data.assignedSupportId = S(fd, 'assignedSupportId') || null;
  data.adminNote = S(fd, 'adminNote').slice(0, 2000) || null;
  data.name = S(fd, 'name').slice(0, 120) || undefined;
  await db.tenant.update({ where: { id }, data });
  await audit(actor(me), 'customer.update', id, { overrides: ov, prices });
  back(`/admin/customers/${id}`, 'ok', 'Customer settings saved.');
}

export async function adjustWalletAction(fd: FormData) {
  const me = await guard('finance.write');
  const id = S(fd, 'tenantId');
  const amount = Number(S(fd, 'amount')); const reason = S(fd, 'reason');
  if (!isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) back(`/admin/customers/${id}`, 'err', 'Enter a non-zero amount.');
  if (reason.length < 5) back(`/admin/customers/${id}`, 'err', 'A reason of at least 5 characters is required.');
  try {
    await applyLedger({ tenantId: id, type: 'ADJUSTMENT', amount, reason, createdById: me.id, ref: `adj:${randomToken(8)}` });
  } catch (e) { if (e instanceof InsufficientFunds) back(`/admin/customers/${id}`, 'err', 'Adjustment would make the balance negative.'); throw e; }
  await audit(actor(me), 'wallet.adjust', id, { amount, reason }, 'finance');
  back(`/admin/customers/${id}`, 'ok', 'Wallet adjusted (ledger entry created).');
}

export async function refundMessageAction(fd: FormData) {
  const me = await guard('finance.write');
  const id = S(fd, 'messageId'); const reason = S(fd, 'reason') || 'Admin refund';
  try { await refundMessage(id, me.id, reason); } catch (e) { back('/admin/messages', 'err', e instanceof Error && e.message === 'NOTHING_TO_REFUND' ? 'Nothing to refund.' : 'Refund failed.'); }
  await audit(actor(me), 'message.refund', id, { reason }, 'finance');
  back('/admin/messages', 'ok', 'Refunded through a ledger entry.');
}

export async function approveTopupAction(fd: FormData) {
  const me = await guard('finance.write');
  const id = S(fd, 'id');
  const t = await db.topupRequest.findUnique({ where: { id } });
  if (!t || t.status !== 'PENDING') back('/admin/payments', 'err', 'Request is not pending.');
  const claim = await db.topupRequest.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', decidedById: me.id, decidedAt: new Date() } });
  if (claim.count === 1) await applyLedger({ tenantId: t!.tenantId, type: 'TOPUP', amount: t!.amount, ref: `topup:${id}`, reason: `Top-up ${t!.method} ${t!.reference ?? ''}`.trim(), createdById: me.id });
  await audit(actor(me), 'topup.approve', id, { amount: t!.amount.toString() }, 'finance');
  back('/admin/payments', 'ok', 'Approved and credited.');
}

export async function rejectTopupAction(fd: FormData) {
  const me = await guard('finance.write');
  const id = S(fd, 'id');
  await db.topupRequest.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REJECTED', decidedById: me.id, decidedAt: new Date(), note: S(fd, 'reason') || undefined } });
  await audit(actor(me), 'topup.reject', id, undefined, 'finance');
  back('/admin/payments', 'ok', 'Rejected.');
}

/* ───────────── services / settings ───────────── */
export async function updateServiceAction(fd: FormData) {
  const me = await guard('services.manage');
  await ensureServiceConfigs();
  const key = S(fd, 'key') as ServiceKey;
  if (!['EMAIL_OTP', 'WHATSAPP_OTP', 'EMAIL_VALIDATION'].includes(key)) back('/admin/services', 'err', 'Unknown service.');
  const state = S(fd, 'state');
  if (!['ENABLED', 'DISABLED', 'DEGRADED'].includes(state)) back('/admin/services', 'err', 'Bad state.');
  const price = Number(S(fd, 'unitPrice'));
  if (!isFinite(price) || price < 0) back('/admin/services', 'err', 'Bad price.');
  const old = await db.serviceConfig.findUnique({ where: { key } });
  await db.serviceConfig.update({
    where: { key },
    data: {
      state: state as any, unitPrice: price, billOn: S(fd, 'billOn') === 'DELIVERED' ? 'DELIVERED' : 'SUBMITTED',
      dailyLimit: Math.max(1, Number(S(fd, 'dailyLimit')) || 100000), ttlSeconds: Math.min(1800, Math.max(60, Number(S(fd, 'ttlSeconds')) || 300)),
      settings: { ...((old?.settings as object) ?? {}), maxBatch: Math.min(500, Math.max(1, Number(S(fd, 'maxBatch')) || 100)) },
    },
  });
  await audit(actor(me), 'service.update', key, { state, price });
  back('/admin/services', 'ok', `${key} updated.`);
}

export async function saveSettingAction(fd: FormData) {
  const me = await guard('settings.manage');
  const key = S(fd, 'key');
  if (key === 'maintenance') await db.setting.upsert({ where: { key }, update: { value: fd.get('value') === 'on' }, create: { key, value: fd.get('value') === 'on' } });
  else if (key === 'payment_instructions') await db.setting.upsert({ where: { key }, update: { value: S(fd, 'value').slice(0, 2000) }, create: { key, value: S(fd, 'value').slice(0, 2000) } });
  else if (key === 'disposable_domains') {
    const list = S(fd, 'value').split(/[\s,]+/).map((x) => x.toLowerCase()).filter((x) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(x)).slice(0, 5000);
    await db.setting.upsert({ where: { key }, update: { value: list }, create: { key, value: list } });
  } else back('/admin/settings', 'err', 'Unknown setting.');
  await audit(actor(me), 'setting.update', key);
  back('/admin/settings', 'ok', 'Saved.');
}

/* ───────────── packages ───────────── */
const pk = z.object({ name: z.string().min(2).max(60), priceUsd: z.coerce.number().min(0), emailQuota: z.coerce.number().int().min(0), whatsappQuota: z.coerce.number().int().min(0), validationQuota: z.coerce.number().int().min(0), sortOrder: z.coerce.number().int().default(0) });
export async function savePackageAction(fd: FormData) {
  const me = await guard('packages.manage');
  const p = pk.safeParse(Object.fromEntries(fd));
  if (!p.success) back('/admin/packages', 'err', 'Check the package fields.');
  const id = S(fd, 'id');
  const data = { ...p.data!, custom: fd.get('custom') === 'on', active: fd.get('active') !== 'off' };
  if (id) await db.package.update({ where: { id }, data }); else await db.package.create({ data });
  await audit(actor(me), id ? 'package.update' : 'package.create', id || data.name);
  back('/admin/packages', 'ok', 'Package saved.');
}
export async function togglePackageAction(fd: FormData) {
  const me = await guard('packages.manage');
  const id = S(fd, 'id'); const p = await db.package.findUnique({ where: { id } });
  if (p) await db.package.update({ where: { id }, data: { active: !p.active } });
  await audit(actor(me), 'package.toggle', id);
  back('/admin/packages', 'ok', 'Updated.');
}

/* ───────────── WhatsApp devices ───────────── */
export async function createDeviceAction(fd: FormData) {
  const me = await guard('whatsapp.manage');
  const label = S(fd, 'label').slice(0, 60) || 'Device';
  const { device, token } = await createDevice(label, Math.max(1, Number(S(fd, 'priority')) || 1), Math.max(1, Number(S(fd, 'dailyLimit')) || 500));
  await audit(actor(me), 'device.create', device.id, { label });
  setReveal(`Gateway token for "${label}"`, token, 'Put this in the gateway .env as GATEWAY_TOKEN. It is shown once; rotate it if lost.');
  back('/admin/whatsapp', 'ok', 'Device created. Start the gateway with this token and scan the QR below.');
}

export async function updateDeviceAction(fd: FormData) {
  const me = await guard('whatsapp.manage');
  const id = S(fd, 'id');
  await db.whatsAppDevice.update({ where: { id }, data: { label: S(fd, 'label').slice(0, 60) || 'Device', priority: Math.max(1, Number(S(fd, 'priority')) || 1), dailyLimit: Math.max(1, Number(S(fd, 'dailyLimit')) || 500), enabled: fd.get('enabled') === 'on' } });
  if (fd.get('enabled') !== 'on') await rerouteQueued(id);
  await audit(actor(me), 'device.update', id);
  back('/admin/whatsapp', 'ok', 'Device updated.');
}

export async function deviceCommandAction(fd: FormData) {
  const me = await guard('whatsapp.manage');
  const id = S(fd, 'id'); const type = S(fd, 'type');
  if (!['REFRESH_QR', 'DISCONNECT', 'RECONNECT'].includes(type)) back('/admin/whatsapp', 'err', 'Bad command.');
  await db.deviceCommand.create({ data: { deviceId: id, type: type as any } });
  if (type === 'DISCONNECT') await rerouteQueued(id);
  await audit(actor(me), `device.${type.toLowerCase()}`, id);
  back('/admin/whatsapp', 'ok', 'Command sent. The gateway executes it within a few seconds.');
}

export async function testMessageAction(fd: FormData) {
  const me = await guard('whatsapp.manage');
  const id = S(fd, 'id'); const phone = normalizePhone(S(fd, 'to'));
  if (!phone) back('/admin/whatsapp', 'err', 'Enter the phone in international format.');
  const d = await db.whatsAppDevice.findUnique({ where: { id } });
  if (!d || d.status !== 'CONNECTED') back('/admin/whatsapp', 'err', 'Device is not connected.');
  await db.deviceCommand.create({ data: { deviceId: id, type: 'TEST_MESSAGE', payload: { to: phone, text: 'OTPProvider test message. If you can read this, the gateway works.' } } });
  await audit(actor(me), 'device.test', id, { to: phone });
  back('/admin/whatsapp', 'ok', 'Test message queued. "Last test" updates when the device confirms.');
}

export async function pauseDeviceAction(fd: FormData) {
  const me = await guard('whatsapp.manage');
  const id = S(fd, 'id'); const pause = S(fd, 'pause') === '1';
  await db.whatsAppDevice.update({ where: { id }, data: { status: pause ? 'PAUSED' : 'DISCONNECTED' } });
  if (pause) await rerouteQueued(id);
  await audit(actor(me), pause ? 'device.pause' : 'device.resume', id);
  back('/admin/whatsapp', 'ok', pause ? 'Device paused: it receives no new messages.' : 'Device resumed. Status updates at its next heartbeat.');
}

export async function rotateDeviceTokenAction(fd: FormData) {
  const me = await guard('whatsapp.manage');
  const id = S(fd, 'id');
  const { sha256 } = await import('@/lib/crypto');
  const token = 'gw_' + randomToken(24);
  await db.whatsAppDevice.update({ where: { id }, data: { tokenHash: sha256(token), status: 'DISCONNECTED' } });
  await audit(actor(me), 'device.rotate_token', id, undefined, 'security');
  setReveal('New gateway token', token, 'The old token stopped working. Update the gateway .env and restart it.');
  back('/admin/whatsapp', 'ok', 'Token rotated.');
}

export async function deleteDeviceAction(fd: FormData) {
  const me = await guard('whatsapp.manage');
  const id = S(fd, 'id');
  await rerouteQueued(id);
  await db.whatsAppDevice.delete({ where: { id } });
  await db.tenant.updateMany({ where: { pinnedDeviceId: id }, data: { pinnedDeviceId: null } });
  await audit(actor(me), 'device.delete', id);
  back('/admin/whatsapp', 'ok', 'Device removed.');
}

/* ───────────── email providers & senders ───────────── */
export async function addProviderAction(fd: FormData) {
  const me = await guard('email.manage');
  const key = S(fd, 'apiKey');
  if (!key.startsWith('re_')) back('/admin/email', 'err', 'A Resend API key starts with re_.');
  const p = await db.emailProvider.create({ data: { name: S(fd, 'name').slice(0, 60) || 'Resend', apiKeyEnc: encrypt(key), priority: Math.max(1, Number(S(fd, 'priority')) || 1) } });
  await audit(actor(me), 'provider.add', p.id);
  back('/admin/email', 'ok', 'Provider added. Add a sender and check its domain.');
}
export async function toggleProviderAction(fd: FormData) {
  const me = await guard('email.manage');
  const id = S(fd, 'id'); const p = await db.emailProvider.findUnique({ where: { id } });
  if (p) await db.emailProvider.update({ where: { id }, data: { enabled: !p.enabled } });
  await audit(actor(me), 'provider.toggle', id);
  back('/admin/email', 'ok', 'Updated.');
}
export async function deleteProviderAction(fd: FormData) {
  const me = await guard('email.manage');
  await db.emailProvider.delete({ where: { id: S(fd, 'id') } });
  await audit(actor(me), 'provider.delete', S(fd, 'id'));
  back('/admin/email', 'ok', 'Provider deleted.');
}
export async function checkProviderAction(fd: FormData) {
  const me = await guard('email.manage');
  const p = await db.emailProvider.findUnique({ where: { id: S(fd, 'id') }, include: { senders: true } });
  if (!p?.apiKeyEnc) back('/admin/email', 'err', 'No key stored.');
  const r = await listResendDomains(decrypt(p!.apiKeyEnc!));
  if (!r.ok) {
    await db.emailProvider.update({ where: { id: p!.id }, data: { lastStatus: `Check failed: ${r.error}`, lastCheck: new Date() } });
    back('/admin/email', 'err', `Provider check failed (${r.error}). A sending-only key cannot list domains; confirm the domain in the Resend dashboard and mark the sender verified manually.`);
  }
  const ok = new Set((r as any).domains.filter((d: any) => d.status === 'verified').map((d: any) => d.name.toLowerCase()));
  for (const s of p!.senders) await db.emailSender.update({ where: { id: s.id }, data: { verified: ok.has(s.address.split('@')[1].toLowerCase()) } });
  await db.emailProvider.update({ where: { id: p!.id }, data: { lastStatus: `OK: ${(r as any).domains.length} domain(s), ${ok.size} verified`, lastCheck: new Date() } });
  await audit(actor(me), 'provider.check', p!.id);
  back('/admin/email', 'ok', 'Domains checked against Resend. Sender verification updated from the provider response.');
}
export async function addSenderAction(fd: FormData) {
  const me = await guard('email.manage');
  const addr = S(fd, 'address').toLowerCase();
  if (!z.string().email().safeParse(addr).success) back('/admin/email', 'err', 'Invalid sender address.');
  const services = fd.getAll('services').map(String);
  try { await db.emailSender.create({ data: { providerId: S(fd, 'providerId'), address: addr, displayName: S(fd, 'displayName').slice(0, 60) || 'OTPProvider', services: services.length ? services : ['EMAIL_OTP'] } }); }
  catch { back('/admin/email', 'err', 'That sender already exists.'); }
  await audit(actor(me), 'sender.add', addr);
  back('/admin/email', 'ok', 'Sender added (unverified until the domain is confirmed).');
}
export async function senderToggleAction(fd: FormData) {
  const me = await guard('email.manage');
  const id = S(fd, 'id'); const field = S(fd, 'field');
  const s = await db.emailSender.findUnique({ where: { id } });
  if (!s || !['active', 'verified'].includes(field)) back('/admin/email', 'err', 'Not found.');
  await db.emailSender.update({ where: { id }, data: { [field]: !(s as any)[field] } });
  await audit(actor(me), `sender.${field}`, id, field === 'verified' ? { manual: true } : undefined);
  back('/admin/email', 'ok', 'Updated.');
}
export async function deleteSenderAction(fd: FormData) {
  const me = await guard('email.manage');
  await db.emailSender.delete({ where: { id: S(fd, 'id') } });
  await db.tenant.updateMany({ where: { senderId: S(fd, 'id') }, data: { senderId: null } });
  await audit(actor(me), 'sender.delete', S(fd, 'id'));
  back('/admin/email', 'ok', 'Removed.');
}
export async function testEmailAction(fd: FormData) {
  const me = await guard('email.manage');
  const to = S(fd, 'to');
  if (!z.string().email().safeParse(to).success) back('/admin/email', 'err', 'Enter a valid recipient.');
  const routes = await getRoutes('EMAIL_OTP');
  if (!routes.length) back('/admin/email', 'err', 'No usable provider: it needs an enabled provider with an active, verified sender.');
  const r = routes[0];
  const out = await sendViaResend(r.apiKey, r.from, to, 'OTPProvider test email', otpEmailHtml('123456', 'OTPProvider test', 5), `test-${randomToken(6)}`);
  await audit(actor(me), 'email.test', to, { outcome: out.outcome });
  if (out.outcome === 'ACCEPTED') back('/admin/email', 'ok', `Accepted by ${r.providerName} (id ${out.providerMessageId}). Acceptance is not delivery: check the inbox.`);
  back('/admin/email', 'err', `${out.outcome}: ${'message' in out ? out.message : ''}`);
}

/* ───────────── tickets (support & admin) ───────────── */
export async function staffReplyAction(fd: FormData) {
  const me = await guard('tickets.handle');
  const id = S(fd, 'ticketId'); const body = S(fd, 'body').slice(0, 5000);
  const { saveAttachment } = await import('@/lib/attachments');
  const att = await saveAttachment(fd.get('file'));
  if (att === 'BAD') back(`/support/${id}`, 'err', 'Attachment must be PNG, JPG, PDF or TXT up to 1 MB.');
  if (!body && !att) back(`/support/${id}`, 'err', 'Write a message.');
  const internal = fd.get('internal') === 'on';
  const t = await db.ticket.findUnique({ where: { id } });
  if (!t) back('/support', 'err', 'Not found.');
  await db.$transaction([
    db.ticketMessage.create({ data: { ticketId: id, authorId: me.id, authorName: me.name, authorRole: me.role, body: body || '(attachment)', internal, ...(att ?? {}) } }),
    db.ticket.update({ where: { id }, data: { assignedId: t!.assignedId ?? me.id, status: internal ? t!.status : 'WAITING' } }),
  ]);
  if (!internal) {
    const owner = await db.user.findFirst({ where: { tenantId: t!.tenantId, role: 'CLIENT' } });
    if (owner) { const { sendSystemEmail } = await import('@/lib/email'); sendSystemEmail(owner.email, `Support replied: ${t!.subject}`, `<p>Our team replied to your ticket "<b>${t!.subject.replace(/[<>]/g, '')}</b>". Sign in to read it.</p>`).catch(() => {}); }
  }
  back(`/support/${id}`, 'ok', internal ? 'Internal note saved.' : 'Reply sent.');
}

export async function ticketMetaAction(fd: FormData) {
  const me = await guard('tickets.handle');
  const id = S(fd, 'ticketId'); const op = S(fd, 'op');
  const data: Prisma.TicketUpdateInput = {};
  if (op === 'assign') data.assignedId = me.id;
  else if (op === 'unassign') data.assignedId = null;
  else if (op === 'escalate') data.status = 'ESCALATED';
  else if (op === 'resolve') data.status = 'RESOLVED';
  else if (op === 'close') data.status = 'CLOSED';
  else if (op === 'reopen') data.status = 'OPEN';
  else if (op === 'priority' && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(S(fd, 'priority'))) data.priority = S(fd, 'priority') as any;
  else back(`/support/${id}`, 'err', 'Bad operation.');
  await db.ticket.update({ where: { id }, data });
  await audit(actor(me), `ticket.${op}`, id, undefined, 'support');
  back(`/support/${id}`, 'ok', 'Updated.');
}
