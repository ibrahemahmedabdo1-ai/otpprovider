import { cookies } from 'next/headers';
import { encrypt, decrypt } from './crypto';

const NAME = 'otp_reveal';

/** One-time secret display (new API key, temporary password, device token). Never put secrets in URLs. */
export function setReveal(title: string, value: string, note?: string) {
  cookies().set(NAME, encrypt(JSON.stringify({ title, value, note })), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 120 });
}
export function getReveal(): { title: string; value: string; note?: string } | null {
  const v = cookies().get(NAME)?.value;
  if (!v) return null;
  try { return JSON.parse(decrypt(v)); } catch { return null; }
}
export function clearReveal() { cookies().delete(NAME); }
