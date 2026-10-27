import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import * as c from '@/lib/crypto';
import * as r from '@/lib/rbac';
import * as b from '@/lib/billing';
import * as e from '@/lib/email';
import * as w from '@/lib/whatsapp';
import * as p from '@/lib/phone';
import * as v from '@/lib/emailValidation';
import * as csv from '@/lib/csv';
import * as s from '@/lib/svix';
import * as d from '@/lib/dict';

describe('crypto', () => {
  it('encrypt/decrypt round-trips and is randomized', () => {
    const a = c.encrypt('secret'), b = c.encrypt('secret');
    expect(a).not.toBe(b);
    expect(c.decrypt(a)).toBe('secret');
  });
  it('rejects tampered ciphertext', () => {
    const e = c.encrypt('secret').split('.');
    e[2] = Buffer.from('xx').toString('base64url');
    expect(() => c.decrypt(e.join('.'))).toThrow();
  });
  it('OTP codes are numeric of requested length and hash is bound to the request id', () => {
    expect(c.generateCode(6)).toMatch(/^\d{6}$/);
    expect(c.hmacCode('r1', '123456')).not.toBe(c.hmacCode('r2', '123456'));
    expect(c.safeEqual('a', 'a')).toBe(true);
    expect(c.safeEqual('a', 'b')).toBe(false);
  });
});

describe('rbac', () => {
  it('support cannot touch money, services or staff', () => {
    for (const p of ['finance.write', 'services.manage', 'staff.manage', 'whatsapp.manage', 'packages.manage'] as const)
      expect(r.can({ role: 'SUPPORT' }, p)).toBe(false);
    expect(r.can({ role: 'SUPPORT' }, 'tickets.handle')).toBe(true);
  });
  it('clients have no staff permission', () => expect(r.can({ role: 'CLIENT' }, 'customers.read')).toBe(false));
  it('only finance-capable roles can write finance', () => {
    expect(r.can({ role: 'FINANCE' }, 'finance.write')).toBe(true);
    expect(r.can({ role: 'ADMIN' }, 'finance.write')).toBe(false);
  });
  it('extra permissions are additive', () => expect(r.can({ role: 'SUPPORT', extraPerms: ['finance.read'] }, 'finance.read')).toBe(true));
  it('admin cannot create super admins; super admin can create any role', () => {
    expect(r.creatableRoles('ADMIN')).not.toContain('SUPER_ADMIN');
    expect(r.creatableRoles('SUPER_ADMIN')).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'CLIENT']));
    expect(r.creatableRoles('SUPPORT')).toEqual([]);
  });
  it('MFA is mandatory for admin, finance and super admin', () => {
    expect(r.mfaRequired('SUPER_ADMIN') && r.mfaRequired('ADMIN') && r.mfaRequired('FINANCE')).toBe(true);
    expect(r.mfaRequired('CLIENT')).toBe(false);
  });
});

describe('billing rules (pure)', () => {
  it('SUBMITTED policy charges once the provider accepted', () => {
    expect(b.isBillable('SUBMITTED', 'SUBMITTED')).toBe(true);
    expect(b.isBillable('QUEUED', 'SUBMITTED')).toBe(false);
    expect(b.isBillable('FAILED', 'SUBMITTED')).toBe(false);
    expect(b.isBillable('UNKNOWN_OUTCOME', 'SUBMITTED')).toBe(false);
  });
  it('DELIVERED policy never charges on acceptance alone', () => {
    expect(b.isBillable('SUBMITTED', 'DELIVERED')).toBe(false);
    expect(b.isBillable('SENT', 'DELIVERED')).toBe(false);
    expect(b.isBillable('DELIVERED', 'DELIVERED')).toBe(true);
    expect(b.isBillable('READ', 'DELIVERED')).toBe(true);
  });
});

describe('email failover classification', () => {
  it('only definite rejections allow failover; timeouts and 5xx are uncertain', () => {
    expect(e.classifyHttp(200)).toBe('ACCEPTED');
    expect(e.classifyHttp(422)).toBe('REJECTED');
    expect(e.classifyHttp(429)).toBe('REJECTED');
    expect(e.classifyHttp(500)).toBe('UNKNOWN');
    expect(e.classifyHttp(null)).toBe('UNKNOWN');
  });
});

describe('whatsapp device selection', () => {
  const now = Date.now();
  const mk = (o: Partial<any>) => ({ id: 'd', enabled: true, status: 'CONNECTED', lastHeartbeat: new Date(now - 5000), dailyLimit: 10, sentToday: 0, sentTodayDate: new Date(now).toISOString().slice(0, 10), priority: 1, ...o });
  it('skips disabled, offline, stale and exhausted devices', () => {
    const list = [mk({ id: 'a', enabled: false }), mk({ id: 'b', status: 'DISCONNECTED' }), mk({ id: 'c', lastHeartbeat: new Date(now - 120000) }), mk({ id: 'd', sentToday: 10 }), mk({ id: 'ok', priority: 5 })];
    expect(w.pickDevice(list, null, now)?.id).toBe('ok');
  });
  it('prefers lowest priority number, honours a usable pin, ignores an unusable pin', () => {
    const list = [mk({ id: 'p2', priority: 2 }), mk({ id: 'p1', priority: 1 })];
    expect(w.pickDevice(list, null, now)?.id).toBe('p1');
    expect(w.pickDevice(list, 'p2', now)?.id).toBe('p2');
    expect(w.pickDevice([mk({ id: 'x', enabled: false }), mk({ id: 'p1' })], 'x', now)?.id).toBe('p1');
  });
  it('returns null when nothing is usable', () => expect(w.pickDevice([mk({ status: 'PAUSED' })], null, now)).toBeNull());
});

describe('phone / email helpers', () => {
  it('normalizes international numbers', () => {
    expect(p.normalizePhone('+20 123-456-7890')).toBe('+201234567890');
    expect(p.normalizePhone('00201234567890')).toBe('+201234567890');
    expect(p.normalizePhone('abc')).toBeNull();
    expect(p.normalizePhone('+0123456789')).toBeNull();
  });
  it('masks contact data', () => {
    expect(p.maskEmail('ibrahim@example.com')).toBe('ib***@example.com');
    expect(p.maskPhone('+201234567890')).toContain('*');
  });
});

describe('email validation', () => {
  it('syntax rules', () => {
    expect(v.checkSyntax('a@b.co')).toBe(true);
    expect(v.checkSyntax('a..b@c.com')).toBe(false);
    expect(v.checkSyntax('no-at.com')).toBe(false);
  });
  it('never claims the mailbox exists', () => {
    const verdict = v.verdictFrom({ syntax: true, domainResolves: true, mx: true, disposable: false, roleBased: false, mailboxExists: 'unknown' });
    expect(verdict).toBe('DELIVERABLE_LIKELY');
  });
  it('disposable/role are risky; missing MX is invalid; undecided DNS is unknown', () => {
    const base = { syntax: true, domainResolves: true, mx: true, disposable: false, roleBased: false, mailboxExists: 'unknown' as const };
    expect(v.verdictFrom({ ...base, disposable: true })).toBe('RISKY');
    expect(v.verdictFrom({ ...base, roleBased: true })).toBe('RISKY');
    expect(v.verdictFrom({ ...base, mx: false, domainResolves: false })).toBe('INVALID');
    expect(v.verdictFrom({ ...base, mx: null, domainResolves: null })).toBe('UNKNOWN');
  });
});

describe('csv export', () => {
  it('neutralizes spreadsheet formulas and quotes properly', () => {
    expect(csv.csvCell('=cmd()')).toBe("'=cmd()");
    expect(csv.csvCell('a,b')).toBe('"a,b"');
    expect(csv.csvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('webhook signature (svix)', () => {
  const secret = 'whsec_' + Buffer.from('k'.repeat(24)).toString('base64');
  const sign = (id: string, ts: string, body: string) => 'v1,' + createHmac('sha256', Buffer.from('k'.repeat(24))).update(`${id}.${ts}.${body}`).digest('base64');
  it('accepts valid, rejects tampered and stale', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(s.verifySvix('i', ts, '{}', sign('i', ts, '{}'), secret)).toBe(true);
    expect(s.verifySvix('i', ts, '{"x":1}', sign('i', ts, '{}'), secret)).toBe(false);
    const old = String(Math.floor(Date.now() / 1000) - 1000);
    expect(s.verifySvix('i', old, '{}', sign('i', old, '{}'), secret)).toBe(false);
  });
});

describe('i18n', () => {
  it('has Arabic coverage for core vocabulary and every language has entries', () => {
    expect(d.DICT.ar['Sign in']).toBeTruthy();
    for (const l of ['ar', 'ru', 'es', 'de', 'id', 'zh'] as const) expect(Object.keys(d.DICT[l]).length).toBe(d.DICT_SIZE);
  });
});
