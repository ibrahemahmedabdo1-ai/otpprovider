/** E.164 normalization (basic). Returns digits with leading +, or null. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s\-().]/g, '');
  const m = /^\+?(\d{8,15})$/.exec(s.startsWith('00') ? '+' + s.slice(2) : s);
  if (!m) return null;
  if (m[1].startsWith('0')) return null;
  return '+' + m[1];
}
export const maskPhone = (p: string) => (p.length > 6 ? p.slice(0, 4) + '*'.repeat(p.length - 6) + p.slice(-2) : '***');
export const maskEmail = (e: string) => {
  const [l, d] = e.split('@');
  return (l.length <= 2 ? l[0] + '*' : l.slice(0, 2) + '***') + '@' + d;
};
