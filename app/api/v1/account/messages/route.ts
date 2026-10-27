import { withApi, jsonOk } from '@/lib/apiAuth';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export const GET = withApi(null, async (req, { tenant, requestId }) => {
  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  const limit = Math.min(Number(u.searchParams.get('limit') ?? 50) || 50, 200);
  const rows = await db.messageRequest.findMany({
    where: { tenantId: tenant.id, ...(id ? { id } : {}) }, orderBy: { createdAt: 'desc' }, take: limit,
  });
  return jsonOk(requestId, {
    messages: rows.map((m) => ({
      id: m.id, service: m.service, status: m.status, sender: m.senderLabel, recipient: m.recipient,
      provider_message_id: m.providerMessageId, error_code: m.errorCode, charge: m.charge.toString(),
      created_at: m.createdAt, submitted_at: m.submittedAt, delivered_at: m.deliveredAt, duration_ms: m.durationMs,
    })),
  });
});
