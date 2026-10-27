import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('hex');

function key(): Buffer {
  const k = process.env.ENCRYPTION_KEY || '';
  if (k.length < 32) throw new Error('ENCRYPTION_KEY is missing or too short');
  return createHash('sha256').update(k).digest();
}

/** AES-256-GCM. Output: iv.tag.ciphertext (base64url). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload: string): string {
  const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

export function generateCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) s += randomInt(0, 10).toString();
  return s;
}

export function hmacCode(requestId: string, code: string): string {
  const secret = process.env.APP_SECRET || '';
  if (secret.length < 16) throw new Error('APP_SECRET is missing or too short');
  return createHmac('sha256', secret).update(`${requestId}:${code}`).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function generatePassword(len = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[randomInt(0, chars.length)];
  return s;
}
