import { NextRequest, NextResponse } from 'next/server';
import type { ApiKey, Tenant } from '@prisma/client';
import { db } from './db';
import { sha256, randomToken } from './crypto';
import { hit } from './ratelimit';
import { ApiError } from './messaging';

export type ApiCtx = { key: ApiKey; tenant: Tenant; requestId: string };

export function newRequestId() { return 'req_' + randomToken(8); }

export function jsonErr(requestId: string, status: number, code: string, message: string, extra?: object) {
  return NextResponse.json({ success: false, request_id: requestId, error: { code, message, ...extra } }, { status, headers: { 'X-Request-Id': requestId } });
}
export function jsonOk(requestId: string, data: object, status = 200) {
  return NextResponse.json({ success: true, request_id: requestId, data }, { status, headers: { 'X-Request-Id': requestId } });
}

export function generateApiKey() {
  const secret = randomToken(24);
  const full = `otp_live_${secret}`;
  return { full, prefix: full.slice(0, 13), hash: sha256(full) };
}

type Handler = (req: NextRequest, ctx: ApiCtx) => Promise<NextResponse>;

/** Wraps an API route: bearer auth, revoked/suspended checks, per-key rate limit, safe errors. */
export function withApi(service: string | null, handler: Handler) {
  return async (req: NextRequest) => {
    const requestId = newRequestId();
    try {
      const auth = req.headers.get('authorization') || '';
      const m = /^Bearer\s+(otp_live_[a-f0-9]{48})$/.exec(auth);
      if (!m) return jsonErr(requestId, 401, 'UNAUTHENTICATED', 'Missing or malformed API key');
      const key = await db.apiKey.findUnique({ where: { hash: sha256(m[1]) }, include: { tenant: true } });
      if (!key || key.revokedAt) return jsonErr(requestId, 401, 'INVALID_API_KEY', 'API key is invalid or revoked');
      if (service && key.services.length && !key.services.includes(service))
        return jsonErr(requestId, 403, 'KEY_SCOPE', 'This API key is not allowed to use this service');
      if (!(await hit(`key:${key.id}`, key.rateLimit)))
        return jsonErr(requestId, 429, 'RATE_LIMITED', 'Too many requests');
      db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      const { tenant, ...k } = key;
      return await handler(req, { key: k as ApiKey, tenant, requestId });
    } catch (e) {
      if (e instanceof ApiError) return jsonErr(requestId, e.status, e.code, e.message);
      console.error(requestId, e instanceof Error ? e.message : 'error');
      return jsonErr(requestId, 500, 'INTERNAL', 'Unexpected error');
    }
  };
}
