import { Prisma, ServiceKey, ServiceState } from '@prisma/client';
import { db } from './db';

export const SERVICE_LABEL: Record<ServiceKey, string> = {
  EMAIL_OTP: 'Email OTP',
  WHATSAPP_OTP: 'WhatsApp OTP',
  EMAIL_VALIDATION: 'Email Validation',
};

const DEFAULTS: Record<ServiceKey, { unitPrice: string; billOn: 'SUBMITTED' | 'DELIVERED' }> = {
  EMAIL_OTP: { unitPrice: '0.004', billOn: 'SUBMITTED' },
  WHATSAPP_OTP: { unitPrice: '0.02', billOn: 'DELIVERED' },
  EMAIL_VALIDATION: { unitPrice: '0.002', billOn: 'SUBMITTED' },
};

/** Creates missing rows. Services start DISABLED until an admin turns them on. */
export async function ensureServiceConfigs() {
  for (const key of Object.keys(DEFAULTS) as ServiceKey[]) {
    await db.serviceConfig.upsert({
      where: { key }, update: {},
      create: { key, state: 'DISABLED', unitPrice: DEFAULTS[key].unitPrice, billOn: DEFAULTS[key].billOn },
    });
  }
}

export async function getServiceConfig(key: ServiceKey) {
  await ensureServiceConfigs();
  return db.serviceConfig.findUniqueOrThrow({ where: { key } });
}

export async function maintenanceMode(): Promise<boolean> {
  const s = await db.setting.findUnique({ where: { key: 'maintenance' } });
  return s?.value === true;
}

export type Gate = { ok: true; price: Prisma.Decimal; state: ServiceState } | { ok: false; code: string; message: string; status: number };

/** Every API request passes through here: maintenance, account status, service state, tenant override. */
export async function gateService(
  tenant: { status: string; serviceOverrides: unknown; priceOverrides: unknown },
  key: ServiceKey,
): Promise<Gate> {
  if (await maintenanceMode()) return { ok: false, code: 'MAINTENANCE', message: 'Platform is under maintenance', status: 503 };
  if (tenant.status !== 'ACTIVE') return { ok: false, code: 'ACCOUNT_NOT_ACTIVE', message: 'Account is not active', status: 403 };
  const cfg = await getServiceConfig(key);
  const ov = (tenant.serviceOverrides ?? {}) as Record<string, boolean>;
  if (ov[key] === false) return { ok: false, code: 'SERVICE_NOT_ALLOWED', message: 'Service is not enabled for this account', status: 403 };
  if (cfg.state === 'DISABLED' && ov[key] !== true) return { ok: false, code: 'SERVICE_DISABLED', message: 'Service is currently disabled', status: 503 };
  const po = (tenant.priceOverrides ?? {}) as Record<string, string>;
  const price = new Prisma.Decimal(po[key] ?? cfg.unitPrice);
  return { ok: true, price, state: cfg.state };
}
