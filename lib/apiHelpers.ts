import { z } from 'zod';
import { NextRequest } from 'next/server';
import { ApiError } from './messaging';

export async function readJson<T extends z.ZodTypeAny>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try { body = await req.json(); } catch { throw new ApiError(400, 'INVALID_JSON', 'Body must be valid JSON'); }
  const r = schema.safeParse(body);
  if (!r.success) throw new ApiError(422, 'VALIDATION_ERROR', r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 300));
  return r.data;
}
