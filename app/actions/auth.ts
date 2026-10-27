'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db';
import { attemptLogin, destroySession, hashPassword, passwordProblem, getSession, requireSessionOnly, verifyTotp, homeFor, createSession } from '@/lib/auth';
import { createAccount, DuplicateEmail } from '@/lib/accounts';
import { randomToken, sha256 } from '@/lib/crypto';
import { emailConfigured, sendSystemEmail } from '@/lib/email';
import { hit } from '@/lib/ratelimit';
import { back } from '@/lib/flash';
import { audit } from '@/lib/audit';
import { mfaRequired } from '@/lib/rbac';

const ip = () => headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
const baseUrl = () => process.env.APP_URL || 'http://localhost:3000';

export async function loginAction(fd: FormData) {
  if (!(await hit(`login:${ip()}`, 20, 300))) back('/login', 'err', 'Too many attempts. Try again in a few minutes.');
  const r = await attemptLogin(String(fd.get('email') ?? ''), String(fd.get('password') ?? ''));
  if (!r.ok) back('/login', 'err', r.error);
  redirect(r.next);
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

const reg = z.object({ name: z.string().min(2).max(80), email: z.string().email().max(254), password: z.string().min(10).max(128), company: z.string().max(120).optional(), accept: z.literal('on') });

export async function registerAction(fd: FormData) {
  if (!(await hit(`register:${ip()}`, 8, 3600))) back('/register', 'err', 'Too many registrations from this network.');
  const p = reg.safeParse(Object.fromEntries(fd));
  if (!p.success) back('/register', 'err', 'Please fill all fields and accept the terms.');
  const d = p.data!;
  const prob = passwordProblem(d.password);
  if (prob) back('/register', 'err', prob);
  const needVerify = await emailConfigured();
  try {
    const { user } = await createAccount({ email: d.email, name: d.name, role: 'CLIENT', password: d.password, tenantName: d.company, status: needVerify ? 'PENDING' : 'ACTIVE', forceChange: false });
    if (needVerify) {
      const token = randomToken(32);
      await db.authToken.create({ data: { userId: user.id, kind: 'VERIFY_EMAIL', tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86400000) } });
      await sendSystemEmail(user.email, 'Verify your email', `<p>Welcome to OTPProvider.</p><p><a href="${baseUrl()}/verify/${token}">Verify my email</a> (valid for 24 hours)</p>`);
      back('/login', 'ok', 'Account created. Check your inbox to verify your email.');
    }
    back('/login', 'ok', 'Account created. You can sign in now.');
  } catch (e) {
    if (e instanceof DuplicateEmail) back('/register', 'err', 'This email is already registered.');
    throw e;
  }
}

export async function forgotAction(fd: FormData) {
  if (!(await hit(`forgot:${ip()}`, 6, 3600))) back('/forgot', 'err', 'Too many requests. Try later.');
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status !== 'CLOSED') {
    const token = randomToken(32);
    await db.authToken.create({ data: { userId: user.id, kind: 'RESET_PASSWORD', tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600000) } });
    await sendSystemEmail(user.email, 'Reset your password', `<p><a href="${baseUrl()}/reset/${token}">Reset password</a> (valid for 1 hour). If you did not request this, ignore this email.</p>`);
  }
  back('/forgot', 'ok', 'If that email exists, a reset link has been sent.'); // same answer either way
}

export async function resetAction(fd: FormData) {
  const token = String(fd.get('token') ?? '');
  const pw = String(fd.get('password') ?? '');
  const prob = passwordProblem(pw);
  if (prob) back(`/reset/${token}`, 'err', prob);
  const t = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.kind !== 'RESET_PASSWORD' || t.usedAt || t.expiresAt < new Date()) back('/forgot', 'err', 'This link is invalid or expired.');
  await db.$transaction([
    db.user.update({ where: { id: t!.userId }, data: { passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null, mustChangePassword: false } }),
    db.authToken.update({ where: { id: t!.id }, data: { usedAt: new Date() } }),
    db.session.updateMany({ where: { userId: t!.userId }, data: { revokedAt: new Date() } }), // sign out everywhere
  ]);
  await audit({ id: t!.userId, role: 'USER' }, 'password.reset', t!.userId, undefined, 'security');
  back('/login', 'ok', 'Password updated. Sign in with the new password.');
}

export async function changePasswordAction(fd: FormData) {
  const s = await requireSessionOnly();
  const cur = String(fd.get('current') ?? ''), pw = String(fd.get('password') ?? '');
  const { checkPassword } = await import('@/lib/auth');
  if (!(await checkPassword(cur, s.user.passwordHash))) back('/change-password', 'err', 'Current password is incorrect.');
  const prob = passwordProblem(pw);
  if (prob) back('/change-password', 'err', prob);
  await db.user.update({ where: { id: s.userId }, data: { passwordHash: await hashPassword(pw), mustChangePassword: false } });
  await db.session.updateMany({ where: { userId: s.userId, id: { not: s.id } }, data: { revokedAt: new Date() } });
  await audit({ id: s.userId, role: s.user.role }, 'password.change', s.userId, undefined, 'security');
  redirect(homeFor(s.user.role));
}

export async function mfaVerifyAction(fd: FormData) {
  const s = await requireSessionOnly();
  if (!(await hit(`mfa:${s.userId}`, 8, 300))) back('/mfa', 'err', 'Too many attempts. Wait a few minutes.');
  if (!s.user.mfaSecretEnc || !verifyTotp(s.user.mfaSecretEnc, String(fd.get('code') ?? ''))) {
    await audit({ id: s.userId, role: s.user.role }, 'mfa.failed', s.userId, undefined, 'security');
    back('/mfa', 'err', 'Invalid code.');
  }
  await db.session.update({ where: { id: s.id }, data: { mfaVerified: true } });
  redirect(homeFor(s.user.role));
}

export async function mfaSetupAction(fd: FormData) {
  const s = await requireSessionOnly();
  const enc = s.user.mfaSecretEnc;
  if (!enc || !verifyTotp(enc, String(fd.get('code') ?? ''))) back('/mfa/setup', 'err', 'Invalid code. Check your authenticator app and try again.');
  await db.user.update({ where: { id: s.userId }, data: { mfaEnabled: true } });
  await db.session.update({ where: { id: s.id }, data: { mfaVerified: true } });
  await audit({ id: s.userId, role: s.user.role }, 'mfa.enabled', s.userId, undefined, 'security');
  redirect(homeFor(s.user.role));
}

export async function disableMfaAction(fd: FormData) {
  const s = await requireSessionOnly();
  if (mfaRequired(s.user.role)) back('/dashboard/settings', 'err', 'MFA is mandatory for your role.');
  const { checkPassword } = await import('@/lib/auth');
  if (!(await checkPassword(String(fd.get('password') ?? ''), s.user.passwordHash))) back('/dashboard/settings', 'err', 'Wrong password.');
  await db.user.update({ where: { id: s.userId }, data: { mfaEnabled: false, mfaSecretEnc: null } });
  await audit({ id: s.userId, role: s.user.role }, 'mfa.disabled', s.userId, undefined, 'security');
  back('/dashboard/settings', 'ok', 'Two-factor authentication disabled.');
}

export async function revokeOtherSessionsAction() {
  const s = await requireSessionOnly();
  await db.session.updateMany({ where: { userId: s.userId, id: { not: s.id }, revokedAt: null }, data: { revokedAt: new Date() } });
  back('/dashboard/settings', 'ok', 'Other sessions signed out.');
}
