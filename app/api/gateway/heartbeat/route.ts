import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authDevice, rerouteQueued } from '@/lib/whatsapp';
import { audit } from '@/lib/audit';
import { hit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
const schema = z.object({
  status: z.enum(['PAIRING', 'CONNECTED', 'DISCONNECTED']),
  qr: z.string().max(4000).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  error: z.string().max(300).nullable().optional(),
  version: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const dev = await authDevice(req.headers.get('authorization'));
  if (!dev) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await hit(`gw:${dev.id}`, 120))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid' }, { status: 422 });
  const b = p.data;
  const now = new Date();
  const wasConnected = dev.status === 'CONNECTED';
  // an admin-paused device stays paused until an admin resumes it, whatever the phone reports
  const status = dev.status === 'PAUSED' ? 'PAUSED' : b.status;
  await db.whatsAppDevice.update({
    where: { id: dev.id },
    data: {
      status, lastHeartbeat: now, gatewayVersion: b.version,
      qr: b.status === 'PAIRING' ? b.qr ?? null : null, qrAt: b.status === 'PAIRING' && b.qr ? now : null,
      phone: b.phone ?? dev.phone, lastError: b.error ?? (b.status === 'CONNECTED' ? null : dev.lastError),
      lastConnectedAt: b.status === 'CONNECTED' && !wasConnected ? now : dev.lastConnectedAt,
    },
  });
  if (wasConnected && b.status === 'DISCONNECTED') {
    const moved = await rerouteQueued(dev.id);
    await audit(null, 'device.disconnected', dev.id, { moved }, 'system');
  }
  return NextResponse.json({ ok: true, enabled: dev.enabled, paused: dev.status === 'PAUSED' });
}
