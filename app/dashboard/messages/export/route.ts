import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { csvRow } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tenant } = await requireClient();
  const rows = await db.messageRequest.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 10000 });
  const out = [csvRow(['id', 'created_at', 'service', 'sender', 'recipient', 'status', 'error_code', 'charge'])]
    .concat(rows.map((m) => csvRow([m.id, m.createdAt.toISOString(), m.service, m.senderLabel, m.recipient, m.status, m.errorCode, m.charge.toString()])));
  return new NextResponse(out.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="messages.csv"' } });
}
