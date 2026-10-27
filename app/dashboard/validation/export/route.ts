import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { csvRow } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tenant } = await requireClient();
  const rows = await db.emailValidation.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 20000 });
  const out = [csvRow(['created_at', 'email', 'verdict', 'syntax', 'domain_resolves', 'mx', 'disposable', 'role_based', 'charge'])].concat(
    rows.map((r) => { const c = r.checks as any; return csvRow([r.createdAt.toISOString(), r.email, r.verdict, c.syntax, c.domainResolves, c.mx, c.disposable, c.roleBased, r.charge.toString()]); }));
  return new NextResponse(out.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="validations.csv"' } });
}
