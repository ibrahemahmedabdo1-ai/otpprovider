import { z } from 'zod';
import { withApi, jsonOk, jsonErr } from '@/lib/apiAuth';
import { readJson } from '@/lib/apiHelpers';
import { gateService, getServiceConfig } from '@/lib/services';
import { sendWhatsappOtp, publicMessage } from '@/lib/messaging';
import { normalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
const schema = z.object({ to: z.string().min(8).max(20), idempotency_key: z.string().min(8).max(100).optional() });

export const POST = withApi('WHATSAPP_OTP', async (req, { key, tenant, requestId }) => {
  const body = await readJson(req, schema);
  const phone = normalizePhone(body.to);
  if (!phone) return jsonErr(requestId, 422, 'INVALID_PHONE', 'Phone must be in international format, e.g. +201234567890');
  const gate = await gateService(tenant, 'WHATSAPP_OTP');
  if (!gate.ok) return jsonErr(requestId, gate.status, gate.code, gate.message);
  const cfg = await getServiceConfig('WHATSAPP_OTP');
  const idem = body.idempotency_key ?? req.headers.get('idempotency-key') ?? undefined;
  const m = await sendWhatsappOtp(tenant, key.id, gate.price, cfg.ttlSeconds, phone, idem);
  // 202: queued. Delivery is reported asynchronously by the device; poll GET /account/messages.
  return jsonOk(requestId, publicMessage(m), 202);
});
