import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authDevice, bumpSent } from '@/lib/whatsapp';
import { settleMessage } from '@/lib/billing';

export const dynamic = 'force-dynamic';
const schema = z.object({
  id: z.string(),
  status: z.enum(['SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REJECTED', 'UNKNOWN_OUTCOME']),
  providerMessageId: z.string().max(200).optional(),
  error: z.string().max(300).optional(),
});
const RANK: Record<string, number> = { QUEUED: 0, PROCESSING: 1, SUBMITTED: 2, SENT: 3, DELIVERED: 4, READ: 5 };

export async function POST(req: NextRequest) {
  const dev = await authDevice(req.headers.get('authorization'));
  if (!dev) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid' }, { status: 422 });
  const b = p.data;
  const m = await db.messageRequest.findFirst({ where: { id: b.id, deviceId: dev.id } });
  if (!m) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const failure = ['FAILED', 'REJECTED', 'UNKNOWN_OUTCOME'].includes(b.status);
  // statuses only move forward; a late "SENT" never overwrites "DELIVERED"
  if (!failure && (RANK[m.status] ?? 99) >= RANK[b.status]) return NextResponse.json({ ok: true, ignored: true });
  const now = new Date();
  await db.messageRequest.update({
    where: { id: m.id },
    data: {
      status: b.status, providerMessageId: b.providerMessageId ?? m.providerMessageId, providerName: 'WhatsApp device',
      errorCode: failure ? b.status : m.errorCode, errorMessage: failure ? b.error ?? null : m.errorMessage,
      submittedAt: m.submittedAt ?? (failure ? null : now),
      deliveredAt: b.status === 'DELIVERED' || b.status === 'READ' ? m.deliveredAt ?? now : m.deliveredAt,
      bodyEnc: null, // the plaintext code is dropped as soon as the device has handled it
      durationMs: m.durationMs ?? now.getTime() - m.createdAt.getTime(),
    },
  });
  if (b.status === 'SUBMITTED' && m.status === 'PROCESSING') await bumpSent(dev.id);
  if (!failure) await settleMessage(m.id);
  return NextResponse.json({ ok: true });
}
