import { withApi, jsonOk } from '@/lib/apiAuth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = withApi(null, async (_req, { tenant, requestId }) => {
  const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
  const rows = await db.messageRequest.groupBy({ by: ['service', 'status'], where: { tenantId: tenant.id, createdAt: { gte: since } }, _count: { _all: true } });
  const val = await db.emailValidation.count({ where: { tenantId: tenant.id, createdAt: { gte: since } } });
  return jsonOk(requestId, { period_start: since, messages: rows.map((r) => ({ service: r.service, status: r.status, count: r._count._all })), email_validations: val });
});
