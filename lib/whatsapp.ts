import { db } from './db';
import { sha256, randomToken } from './crypto';

export const HEARTBEAT_STALE_MS = 60_000;
const today = () => new Date().toISOString().slice(0, 10);

export function isOnline(d: { status: string; lastHeartbeat: Date | null }, now = Date.now()): boolean {
  return d.status === 'CONNECTED' && !!d.lastHeartbeat && now - d.lastHeartbeat.getTime() < HEARTBEAT_STALE_MS;
}

/** Pure selection (unit-tested): pinned device first (if usable), else lowest priority number with headroom. */
export function pickDevice<T extends { id: string; enabled: boolean; status: string; lastHeartbeat: Date | null; dailyLimit: number; sentToday: number; sentTodayDate: string | null; priority: number }>(
  devices: T[], pinnedId?: string | null, now = Date.now(),
): T | null {
  const t = new Date(now).toISOString().slice(0, 10);
  const usable = devices.filter((d) => {
    if (!d.enabled || !isOnline(d, now)) return false;
    const sent = d.sentTodayDate === t ? d.sentToday : 0;
    return sent < d.dailyLimit;
  });
  if (pinnedId) { const p = usable.find((d) => d.id === pinnedId); if (p) return p; }
  return usable.sort((a, b) => a.priority - b.priority)[0] ?? null;
}

export async function chooseDevice(pinnedId?: string | null) {
  const devices = await db.whatsAppDevice.findMany();
  return pickDevice(devices, pinnedId);
}

export async function createDevice(label: string, priority = 1, dailyLimit = 500) {
  const token = 'gw_' + randomToken(24);
  const d = await db.whatsAppDevice.create({
    data: { label, priority, dailyLimit, tokenHash: sha256(token), status: 'PAIRING' },
  });
  return { device: d, token };
}

export async function authDevice(authHeader: string | null) {
  const m = /^Bearer\s+(gw_[a-f0-9]{48})$/.exec(authHeader || '');
  if (!m) return null;
  return db.whatsAppDevice.findUnique({ where: { tokenHash: sha256(m[1]) } });
}

export async function bumpSent(deviceId: string) {
  const t = today();
  await db.$executeRaw`UPDATE "WhatsAppDevice" SET
    "sentToday" = CASE WHEN "sentTodayDate" = ${t} THEN "sentToday" + 1 ELSE 1 END,
    "sentTodayDate" = ${t} WHERE "id" = ${deviceId}`;
}

/**
 * Moves QUEUED messages off a device that is no longer usable onto another online device.
 * Only QUEUED is moved: PROCESSING means the gateway may already have sent it, so it is never re-routed.
 */
export async function rerouteQueued(fromDeviceId: string) {
  const devices = (await db.whatsAppDevice.findMany()).filter((d) => d.id !== fromDeviceId);
  const target = pickDevice(devices);
  if (!target) return 0;
  const r = await db.messageRequest.updateMany({
    where: { deviceId: fromDeviceId, status: 'QUEUED' }, data: { deviceId: target.id },
  });
  return r.count;
}
