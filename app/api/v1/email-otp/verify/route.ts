import { z } from 'zod';
import { withApi, jsonOk } from '@/lib/apiAuth';
import { readJson } from '@/lib/apiHelpers';
import { verifyOtp } from '@/lib/messaging';

export const dynamic = 'force-dynamic';
const schema = z.object({ request_id: z.string().min(5).max(64), code: z.string().regex(/^\d{4,8}$/) });

export const POST = withApi('EMAIL_OTP', async (req, { tenant, requestId }) => {
  const b = await readJson(req, schema);
  const r = await verifyOtp(tenant.id, 'EMAIL_OTP', b.request_id, b.code);
  return jsonOk(requestId, { valid: r.valid, reason: r.reason ?? null });
});
