import { db } from './db';
import { decrypt } from './crypto';

export type SendOutcome =
  | { outcome: 'ACCEPTED'; providerMessageId: string }
  | { outcome: 'REJECTED'; code: string; message: string } // provider definitely did not send: failover is safe
  | { outcome: 'UNKNOWN'; message: string }; // timeout / 5xx: the provider may have accepted it: never blindly retry

export type Route = { providerId: string | null; providerName: string; apiKey: string; from: string; senderId: string | null; senderAddress: string };

/** Pure classifier (unit-tested): decides whether a failed HTTP call is safe to fail over. */
export function classifyHttp(status: number | null): 'ACCEPTED' | 'REJECTED' | 'UNKNOWN' {
  if (status === null) return 'UNKNOWN';
  if (status >= 200 && status < 300) return 'ACCEPTED';
  if (status === 408 || status === 429) return 'REJECTED'; // 429 = refused before processing
  if (status >= 400 && status < 500) return 'REJECTED';
  return 'UNKNOWN';
}

export async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string, idemKey: string): Promise<SendOutcome> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    const kind = classifyHttp(res.status);
    const body = await res.json().catch(() => ({} as any));
    if (kind === 'ACCEPTED') return { outcome: 'ACCEPTED', providerMessageId: String(body.id ?? '') };
    if (kind === 'REJECTED') return { outcome: 'REJECTED', code: String(body.name ?? res.status), message: String(body.message ?? 'Rejected by provider').slice(0, 300) };
    return { outcome: 'UNKNOWN', message: `Provider returned ${res.status}` };
  } catch (e) {
    return { outcome: 'UNKNOWN', message: e instanceof Error ? e.name : 'network error' };
  } finally {
    clearTimeout(timer);
  }
}

/** Ordered list of usable routes: DB providers (enabled, with an active verified sender) then the env fallback. */
export async function getRoutes(service: 'EMAIL_OTP' | 'SYSTEM', pinnedSenderId?: string | null): Promise<Route[]> {
  const routes: Route[] = [];
  const providers = await db.emailProvider.findMany({
    where: { enabled: true }, orderBy: { priority: 'asc' },
    include: { senders: { where: { active: true, verified: true } } },
  });
  for (const p of providers) {
    if (!p.apiKeyEnc) continue;
    const eligible = p.senders
      .filter((s) => (service === 'SYSTEM' ? s.services.includes('SYSTEM') || s.services.includes('EMAIL_OTP') : s.services.includes(service)))
      .sort((a, b) => Number(b.services.includes(service)) - Number(a.services.includes(service)));
    const sender = (pinnedSenderId && eligible.find((s) => s.id === pinnedSenderId)) || eligible[0];
    if (!sender) continue;
    let apiKey = '';
    try { apiKey = decrypt(p.apiKeyEnc); } catch { continue; }
    routes.push({
      providerId: p.id, providerName: p.name, apiKey, senderId: sender.id,
      from: `${sender.displayName} <${sender.address}>`, senderAddress: sender.address,
    });
  }
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    const from = process.env.RESEND_FROM;
    const addr = /<([^>]+)>/.exec(from)?.[1] ?? from;
    routes.push({ providerId: null, providerName: 'Resend (env)', apiKey: process.env.RESEND_API_KEY, from, senderId: null, senderAddress: addr });
  }
  return routes;
}

/** Platform email (verification, reset). Not billed. Returns false when no provider is configured. */
export async function sendSystemEmail(to: string, subject: string, html: string): Promise<boolean> {
  const routes = await getRoutes('SYSTEM');
  for (const r of routes) {
    const out = await sendViaResend(r.apiKey, r.from, to, subject, html, `sys-${Date.now()}-${to}`);
    if (out.outcome === 'ACCEPTED') return true;
    if (out.outcome === 'UNKNOWN') return false; // do not fail over after an uncertain attempt
  }
  return false;
}

export const emailConfigured = async () => (await getRoutes('SYSTEM')).length > 0;

export function otpEmailHtml(code: string, brand: string, ttlMin: number) {
  const safeBrand = brand.replace(/[<>&"]/g, '');
  return `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
  <h2 style="margin:0 0 8px">${safeBrand}</h2>
  <p>Your verification code is:</p>
  <p style="font-size:32px;letter-spacing:6px;font-weight:700;margin:12px 0">${code}</p>
  <p style="color:#666">It expires in ${ttlMin} minutes. If you did not request it, ignore this email.</p></div>`;
}
