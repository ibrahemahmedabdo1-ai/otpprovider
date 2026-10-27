import { promises as dns } from 'dns';

const SYNTAX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

// Small built-in list. Admin can extend it from Settings (key: disposable_domains).
export const BUILTIN_DISPOSABLE = [
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com',
  'trashmail.com', 'getnada.com', 'sharklasers.com', 'throwawaymail.com', 'dispostable.com', 'maildrop.cc',
  'fakeinbox.com', 'mintemail.com', 'mailnesia.com', 'spamgourmet.com', 'tempinbox.com', 'emailondeck.com',
];
const ROLE_LOCALS = ['admin', 'administrator', 'info', 'support', 'sales', 'contact', 'help', 'billing', 'abuse', 'postmaster', 'webmaster', 'noreply', 'no-reply', 'hello', 'office', 'team'];

export type ValidationChecks = {
  syntax: boolean;
  domainResolves: boolean | null;
  mx: boolean | null;
  disposable: boolean;
  roleBased: boolean;
  /** Always "unknown": SMTP probing is not performed, so mailbox existence is never claimed. */
  mailboxExists: 'unknown';
};

export type Verdict = 'DELIVERABLE_LIKELY' | 'RISKY' | 'INVALID' | 'UNKNOWN';

/** Pure scoring (unit-tested). */
export function verdictFrom(c: ValidationChecks): Verdict {
  if (!c.syntax) return 'INVALID';
  if (c.domainResolves === false || c.mx === false) return 'INVALID';
  if (c.domainResolves === null && c.mx === null) return 'UNKNOWN';
  if (c.disposable || c.roleBased) return 'RISKY';
  return 'DELIVERABLE_LIKELY';
}

export function checkSyntax(email: string): boolean {
  if (email.length > 254) return false;
  const [local] = email.split('@');
  if (!local || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return SYNTAX.test(email);
}

async function lookup<T>(p: Promise<T>): Promise<{ ok: boolean | null; value?: T }> {
  try { return { ok: true, value: await p }; } catch (e: any) {
    if (e?.code === 'ENOTFOUND' || e?.code === 'ENODATA') return { ok: false };
    return { ok: null };
  }
}

export async function validateEmail(raw: string, extraDisposable: string[] = []) {
  const email = raw.trim().toLowerCase();
  const syntax = checkSyntax(email);
  const checks: ValidationChecks = { syntax, domainResolves: null, mx: null, disposable: false, roleBased: false, mailboxExists: 'unknown' };
  if (syntax) {
    const [local, domain] = email.split('@');
    checks.roleBased = ROLE_LOCALS.includes(local);
    checks.disposable = [...BUILTIN_DISPOSABLE, ...extraDisposable].includes(domain);
    const mx = await lookup(dns.resolveMx(domain));
    if (mx.ok === true && mx.value && mx.value.length) { checks.mx = true; checks.domainResolves = true; }
    else if (mx.ok === false || (mx.ok === true)) {
      // no MX: RFC 5321 falls back to A/AAAA
      const a = await lookup(dns.resolve4(domain));
      checks.mx = false;
      checks.domainResolves = a.ok === null ? null : a.ok && !!a.value?.length;
      if (checks.domainResolves) checks.mx = false;
    }
  }
  return { email, checks, verdict: verdictFrom(checks) };
}
