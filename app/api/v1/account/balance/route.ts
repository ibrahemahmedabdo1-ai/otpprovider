import { withApi, jsonOk } from '@/lib/apiAuth';
export const dynamic = 'force-dynamic';

export const GET = withApi(null, async (_req, { tenant, requestId }) =>
  jsonOk(requestId, { balance: tenant.balance.toString(), currency: 'USD' }));
