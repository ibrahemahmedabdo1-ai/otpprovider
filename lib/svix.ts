import { createHmac, timingSafeEqual } from 'crypto';

/** Svix-style signature check (Resend webhooks). Pure, unit-tested. */
export function verifySvix(id: string, ts: string, body: string, sigHeader: string, secret: string, now = Date.now()): boolean {
  if (!id || !ts || !sigHeader || !secret) return false;
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
  return sigHeader.split(' ').some((part) => {
    const [, sig] = part.split(',');
    if (!sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
