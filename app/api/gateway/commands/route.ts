import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authDevice } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const dev = await authDevice(req.headers.get('authorization'));
  if (!dev) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const cmds = await db.deviceCommand.findMany({ where: { deviceId: dev.id, done: false }, orderBy: { createdAt: 'asc' }, take: 10 });
  return NextResponse.json({ commands: cmds.map((c) => ({ id: c.id, type: c.type, payload: c.payload })) });
}

const ack = z.object({ id: z.string(), result: z.string().max(300).optional(), ok: z.boolean().optional() });
export async function POST(req: NextRequest) {
  const dev = await authDevice(req.headers.get('authorization'));
  if (!dev) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = ack.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'invalid' }, { status: 422 });
  const c = await db.deviceCommand.findFirst({ where: { id: p.data.id, deviceId: dev.id } });
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await db.deviceCommand.update({ where: { id: c.id }, data: { done: true, result: p.data.result ?? (p.data.ok === false ? 'failed' : 'ok') } });
  if (c.type === 'TEST_MESSAGE') await db.whatsAppDevice.update({ where: { id: dev.id }, data: { lastTestAt: p.data.ok === false ? undefined : new Date() } });
  return NextResponse.json({ ok: true });
}
