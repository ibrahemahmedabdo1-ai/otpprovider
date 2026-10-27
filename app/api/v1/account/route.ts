import { withApi, jsonOk } from '@/lib/apiAuth';
export const dynamic = 'force-dynamic';

export const GET = withApi(null, async (_req, { tenant, key, requestId }) =>
  jsonOk(requestId, { account_id: tenant.id, name: tenant.name, status: tenant.status, balance: tenant.balance.toString(), api_key: { id: key.id, label: key.label, prefix: key.prefix } }));
