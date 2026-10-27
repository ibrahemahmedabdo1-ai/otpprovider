import { NextRequest, NextResponse } from 'next/server';
import { verifySvix } from '@/lib/svix';
import { db } from '@/lib/db';
import { settleMessage } from '@/lib/billing';
import { applyLedger } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || '';
  const body = await req.text();
  const ok = verifySvix(req.headers.get('svix-id') ?? '', req.headers.get('svix-timestamp') ?? '', body, req.headers.get('svix-signature') ?? '', secret);
  if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  let evt: any;
  try { evt = JSON.parse(body); } catch { return NextResponse.json({ error: 'invalid' }, { status: 400 }); }
  const pid = evt?.data?.email_id as string | undefined;
  if (!pid) return NextResponse.json({ ok: true });
  const m = await db.messageRequest.findFirst({ where: { providerMessageId: pid, service: 'EMAIL_OTP' } });
  if (!m) return NextResponse.json({ ok: true });
  if (evt.type === 'email.delivered' && m.status !== 'DELIVERED') {
    await db.messageRequest.update({ where: { id: m.id }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
    await settleMessage(m.id);
  } else if ((evt.type === 'email.bounced' || evt.type === 'email.failed') && !['FAILED'].includes(m.status)) {
    await db.messageRequest.update({ where: { id: m.id }, data: { status: 'FAILED', errorCode: evt.type, errorMessage: String(evt.data?.bounce?.message ?? 'Bounced').slice(0, 300) } });
    if (!m.charge.isZero()) await applyLedger({ tenantId: m.tenantId, type: 'REVERSAL', amount: m.charge, ref: `bounce:${m.id}`, reason: 'Auto reversal: email bounced', requestId: m.id });
  }
  return NextResponse.json({ ok: true });
}
