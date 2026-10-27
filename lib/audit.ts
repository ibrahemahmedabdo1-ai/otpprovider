import { db } from './db';
import { headers } from 'next/headers';

export async function audit(
  actor: { id: string; role: string } | null,
  action: string,
  target?: string,
  detail?: Record<string, unknown>,
  category = 'admin',
) {
  let ip: string | null = null;
  try { ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? null; } catch { /* outside request */ }
  try {
    await db.auditLog.create({
      data: { actorId: actor?.id, actorRole: actor?.role, action, target, detail: detail as any, ip, category },
    });
  } catch (e) {
    console.error('audit failed', action);
  }
}
