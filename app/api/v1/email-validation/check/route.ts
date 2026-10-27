import { z } from 'zod';
import { withApi, jsonOk, jsonErr } from '@/lib/apiAuth';
import { readJson } from '@/lib/apiHelpers';
import { gateService } from '@/lib/services';
import { validateAndBill, extraDisposable } from '@/lib/validationService';

export const dynamic = 'force-dynamic';
const schema = z.object({ email: z.string().min(3).max(254) });

export const POST = withApi('EMAIL_VALIDATION', async (req, { tenant, requestId }) => {
  const b = await readJson(req, schema);
  const gate = await gateService(tenant, 'EMAIL_VALIDATION');
  if (!gate.ok) return jsonErr(requestId, gate.status, gate.code, gate.message);
  return jsonOk(requestId, await validateAndBill(tenant, gate.price, b.email, await extraDisposable()));
});
