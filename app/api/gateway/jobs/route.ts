import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authDevice } from '@/lib/whatsapp';
import { decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * Atomically claims queued messages for this device (QUEUED -> PROCESSING).
 * FOR UPDATE SKIP LOCKED guarantees two workers can never claim the same row.
 */
export async function POST(req: NextRequest) {
  const dev = await authDevice(req.headers.get('authorization'));
  if (!dev) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!dev.enabled || dev.status !== 'CONNECTED') return NextResponse.json({ jobs: [] });
  const remaining = Math.max(0, dev.dailyLimit - (dev.sentTodayDate === new Date().toISOString().slice(0, 10) ? dev.sentToday : 0));
  if (remaining === 0) return NextResponse.json({ jobs: [] });
  const claimed = await db.$queryRaw<{ id: string; recipient: string; bodyEnc: string | null; expiresAt: Date | null }[]>`
    UPDATE "MessageRequest" SET "status" = 'PROCESSING'
    WHERE "id" IN (
      SELECT "id" FROM "MessageRequest"
      WHERE "deviceId" = ${dev.id} AND "status" = 'QUEUED' AND "service" = 'WHATSAPP_OTP'
      ORDER BY "createdAt" ASC LIMIT ${Math.min(5, remaining)} FOR UPDATE SKIP LOCKED)
    RETURNING "id","recipient","bodyEnc","expiresAt"`;
  const jobs: { id: string; to: string; text: string }[] = [];
  for (const m of claimed) {
    if (!m.bodyEnc || (m.expiresAt && m.expiresAt < new Date())) {
      await db.messageRequest.update({ where: { id: m.id }, data: { status: 'EXPIRED', bodyEnc: null } });
      continue;
    }
    jobs.push({ id: m.id, to: m.recipient, text: decrypt(m.bodyEnc) });
  }
  return NextResponse.json({ jobs });
}
