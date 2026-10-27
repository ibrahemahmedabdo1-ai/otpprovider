import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import type { Role } from '@prisma/client';
import { db } from './db';
import { randomToken, sha256, decrypt } from './crypto';
import { can, isStaff, mfaRequired, type Permission } from './rbac';
import { audit } from './audit';

const COOKIE = 'otp_session';
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

export function passwordProblem(p: string): string | null {
  if (p.length < 10) return 'Password must be at least 10 characters';
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/\d/.test(p)) return 'Use upper case, lower case and a digit';
  return null;
}

export async function createSession(userId: string, mfaVerified: boolean) {
  const token = randomToken(32);
  const h = headers();
  await db.session.create({
    data: {
      userId, tokenHash: sha256(token), mfaVerified,
      userAgent: h.get('user-agent')?.slice(0, 200),
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim(),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5),
    },
  });
  cookies().set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { tenant: true } } },
  });
  if (!s || s.revokedAt || s.expiresAt < new Date()) return null;
  if (s.user.status === 'SUSPENDED' || s.user.status === 'CLOSED') return null;
  return s;
}

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await db.session.updateMany({ where: { tokenHash: sha256(token) }, data: { revokedAt: new Date() } });
  cookies().delete(COOKIE);
}

type Need = { roles?: Role[]; perm?: Permission };

/** Server-side gate used by every protected page and action. */
export async function requireUser(need: Need = {}) {
  const s = await getSession();
  if (!s) redirect('/login');
  const u = s.user;
  if (mfaRequired(u.role)) {
    if (!u.mfaEnabled) redirect('/mfa/setup');
    if (!s.mfaVerified) redirect('/mfa');
  }
  if (u.mustChangePassword) redirect('/change-password');
  if (need.roles && !need.roles.includes(u.role)) redirect(homeFor(u.role));
  if (need.perm && !can(u, need.perm)) redirect(homeFor(u.role) + '?denied=1');
  return { user: u, session: s };
}

/** Allows a user who is signed in but has not finished MFA / password change. */
export async function requireSessionOnly() {
  const s = await getSession();
  if (!s) redirect('/login');
  return s;
}

export type LoginResult =
  | { ok: true; next: string }
  | { ok: false; error: string };

export async function attemptLogin(email: string, password: string): Promise<LoginResult> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  const generic = { ok: false as const, error: 'Invalid email or password' };
  if (!user) { await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi'); return generic; }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, error: 'Account temporarily locked. Try again later.' };
  const good = await checkPassword(password, user.passwordHash);
  if (!good) {
    const fails = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60000) : null },
    });
    await audit({ id: user.id, role: user.role }, 'login.failed', user.id, { fails }, 'security');
    return generic;
  }
  if (user.status === 'SUSPENDED' || user.status === 'CLOSED') return { ok: false, error: 'This account is not active. Contact support.' };
  if (user.status === 'PENDING') return { ok: false, error: 'Please verify your email first.' };
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const needMfa = user.mfaEnabled;
  await createSession(user.id, !needMfa);
  await audit({ id: user.id, role: user.role }, 'login.success', user.id, undefined, 'security');
  if (needMfa) return { ok: true, next: '/mfa' };
  if (mfaRequired(user.role)) return { ok: true, next: '/mfa/setup' };
  return { ok: true, next: isStaff(user.role) ? '/admin' : '/dashboard' };
}

export function verifyTotp(secretEnc: string, code: string): boolean {
  try {
    authenticator.options = { window: 1 };
    return authenticator.check(code.replace(/\s/g, ''), decrypt(secretEnc));
  } catch { return false; }
}

export const homeFor = (role: Role) => (role === 'SUPPORT' ? '/support' : isStaff(role) ? '/admin' : '/dashboard');
