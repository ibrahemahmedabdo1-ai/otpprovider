import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return new NextResponse('Unauthorized', { status: 401 });
  const m = await db.ticketMessage.findUnique({ where: { id: params.id }, include: { ticket: true } });
  if (!m || !m.attachData || !m.attachMime) return new NextResponse('Not found', { status: 404 });
  const staff = can(s.user, 'tickets.handle');
  if (!staff && (s.user.tenantId !== m.ticket.tenantId || m.internal)) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(Buffer.from(m.attachData, 'base64'), {
    headers: {
      'Content-Type': m.attachMime,
      'Content-Disposition': `attachment; filename="${(m.attachName ?? 'file').replace(/"/g, '')}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
