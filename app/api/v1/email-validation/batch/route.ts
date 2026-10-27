import { z } from 'zod';
import { withApi, jsonOk, jsonErr } from '@/lib/apiAuth';
import { readJson } from '@/lib/apiHelpers';
import { gateService, getServiceConfig } from '@/lib/services';
import { validateAndBill, extraDisposable } from '@/lib/validationService';
import { ApiError } from '@/lib/messaging';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const schema = z.object({ emails: z.array(z.string().min(3).max(254)).min(1).max(500) });

export const POST = withApi('EMAIL_VALIDATION', async (req, { tenant, requestId }) => {
  const b = await readJson(req, schema);
  const gate = await gateService(tenant, 'EMAIL_VALIDATION');
  if (!gate.ok) return jsonErr(requestId, gate.status, gate.code, gate.message);
  const cfg = await getServiceConfig('EMAIL_VALIDATION');
  const maxBatch = Number((cfg.settings as any)?.maxBatch ?? 100);
  if (b.emails.length > maxBatch) return jsonErr(requestId, 422, 'BATCH_TOO_LARGE', `Batch limit is ${maxBatch}`);
  const extra = await extraDisposable();
  const results: object[] = [];
  let stoppedBy: string | null = null;
  for (const e of [...new Set(b.emails.map((x) => x.trim().toLowerCase()))]) {
    try { results.push(await validateAndBill(tenant, gate.price, e, extra)); }
    catch (err) { if (err instanceof ApiError) { stoppedBy = err.code; break; } throw err; }
  }
  return jsonOk(requestId, { processed: results.length, requested: b.emails.length, stopped_by: stoppedBy, results });
});
