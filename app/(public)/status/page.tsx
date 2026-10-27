import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getT } from '@/lib/i18n';
import { Card, StatusBadge } from '@/components/ui';
import { SERVICE_LABEL, ensureServiceConfigs, maintenanceMode } from '@/lib/services';
import { isOnline } from '@/lib/whatsapp';
import { getRoutes } from '@/lib/email';

export const metadata: Metadata = { title: 'Service status' };
export const dynamic = 'force-dynamic';

export default async function Status() {
  const { t } = getT();
  let dbUp = true;
  try { await db.$queryRaw`SELECT 1`; } catch { dbUp = false; }
  if (!dbUp) return (<div><h1 className="text-3xl font-bold">{t('Service status')}</h1><Card className="mt-6"><StatusBadge s="DISCONNECTED" /> {t('Database unreachable')}</Card></div>);
  await ensureServiceConfigs();
  const [cfgs, devices, maint, routes] = await Promise.all([db.serviceConfig.findMany(), db.whatsAppDevice.findMany(), maintenanceMode(), getRoutes('EMAIL_OTP')]);
  const waOnline = devices.filter((d) => d.enabled && isOnline(d)).length;
  const rows = cfgs.map((c) => {
    let state: string = c.state;
    if (c.state !== 'DISABLED') {
      if (c.key === 'WHATSAPP_OTP' && waOnline === 0) state = 'UNAVAILABLE';
      if (c.key === 'EMAIL_OTP' && routes.length === 0) state = 'UNAVAILABLE';
    }
    return { key: c.key, state };
  });
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('Service status')}</h1>
      {maint && <Card className="mt-4"><StatusBadge s="DEGRADED" /> {t('Maintenance mode is ON: customer API requests are blocked.')}</Card>}
      <Card className="mt-6"><table className="table"><tbody>
        <tr><td>{t('Database')}</td><td><StatusBadge s="ACTIVE" /></td></tr>
        {rows.map((r) => (<tr key={r.key}><td>{t(SERVICE_LABEL[r.key])}</td><td><StatusBadge s={r.state === 'UNAVAILABLE' ? 'DISCONNECTED' : r.state} />{r.state === 'UNAVAILABLE' && <span className="text-xs ms-2" style={{ color: 'var(--muted)' }}>{t('no usable sender right now')}</span>}</td></tr>))}
      </tbody></table></Card>
      <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>{t('Computed live from real service state and gateway heartbeats.')}</p>
    </div>
  );
}
