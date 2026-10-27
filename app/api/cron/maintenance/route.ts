import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rerouteQueued, HEARTBEAT_STALE_MS } from '@/lib/whatsapp';
import { safeEqual } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/, '');
  if (secret.length < 16 || !safeEqual(secret, got)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const now = new Date();
  const out: Record<string, number> = {};

  // Devices that stopped sending heartbeats are marked disconnected, and their queued (never started) jobs are moved.
  const stale = await db.whatsAppDevice.findMany({ where: { status: 'CONNECTED', lastHeartbeat: { lt: new Date(now.getTime() - HEARTBEAT_STALE_MS) } } });
  out.devicesMarkedDisconnected = stale.length;
  for (const d of stale) {
    await db.whatsAppDevice.update({ where: { id: d.id }, data: { status: 'DISCONNECTED', lastError: 'Heartbeat lost' } });
    await rerouteQueued(d.id);
    await audit(null, 'device.heartbeat_lost', d.id, undefined, 'system');
  }
  // Anything stuck in PROCESSING may or may not have been sent: mark it uncertain. It is never auto-retried or charged.
  out.stuckProcessing = (await db.messageRequest.updateMany({
    where: { status: 'PROCESSING', createdAt: { lt: new Date(now.getTime() - 3 * 60000) } },
    data: { status: 'UNKNOWN_OUTCOME', errorCode: 'UNKNOWN_OUTCOME', errorMessage: 'No result reported', bodyEnc: null },
  })).count;
  out.expiredQueued = (await db.messageRequest.updateMany({
    where: { status: 'QUEUED', expiresAt: { lt: now } }, data: { status: 'EXPIRED', bodyEnc: null },
  })).count;
  out.sessions = (await db.session.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(now.getTime() - 7 * 864e5) } }] } })).count;
  out.tokens = (await db.authToken.deleteMany({ where: { expiresAt: { lt: now } } })).count;
  out.rateLimits = (await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 864e5) } } })).count;
  out.commands = (await db.deviceCommand.deleteMany({ where: { done: true, createdAt: { lt: new Date(now.getTime() - 7 * 864e5) } } })).count;
  return NextResponse.json({ ok: true, ...out });
}
