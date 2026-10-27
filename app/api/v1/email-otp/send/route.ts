import { z } from 'zod';
import { withApi, jsonOk, jsonErr } from '@/lib/apiAuth';
import { readJson } from '@/lib/apiHelpers';
import { gateService } from '@/lib/services';
import { getServiceConfig } from '@/lib/services';
import { sendEmailOtp, publicMessage } from '@/lib/messaging';
import { maskEmail } from '@/lib/phone';

export const dynamic = 'force-dynamic';
const schema = z.object({ to: z.string().email().max(254), idempotency_key: z.string().min(8).max(100).optional() });

export const POST = withApi('EMAIL_OTP', async (req, { key, tenant, requestId }) => {
  const body = await readJson(req, schema);
  const gate = await gateService(tenant, 'EMAIL_OTP');
  if (!gate.ok) return jsonErr(requestId, gate.status, gate.code, gate.message);
  const cfg = await getServiceConfig('EMAIL_OTP');
  const idem = body.idempotency_key ?? req.headers.get('idempotency-key') ?? undefined;
  const m = await sendEmailOtp(tenant, key.id, gate.price, cfg.ttlSeconds, body.to.toLowerCase(), idem);
  const failed = ['REJECTED', 'FAILED', 'UNKNOWN_OUTCOME'].includes(m.status);
  return jsonOk(requestId, { ...publicMessage(m), recipient: body.to, masked_recipient: maskEmail(body.to) }, failed ? 502 : 200);
});
