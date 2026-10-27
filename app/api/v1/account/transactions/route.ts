import { withApi, jsonOk } from '@/lib/apiAuth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = withApi(null, async (req, { tenant, requestId }) => {
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? 50) || 50, 200);
  const rows = await db.ledgerEntry.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: limit });
  return jsonOk(requestId, { transactions: rows.map((r) => ({ id: r.id, type: r.type, amount: r.amount.toString(), balance_after: r.balanceAfter.toString(), reason: r.reason, created_at: r.createdAt })) });
});
