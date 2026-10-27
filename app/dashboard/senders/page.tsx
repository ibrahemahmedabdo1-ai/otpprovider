import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Empty, StatusBadge } from '@/components/ui';
import { isOnline } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Senders' };

export default async function Senders() {
  const { tenant } = await requireClient();
  const { t } = getT();
  const [senders, devices] = await Promise.all([
    db.emailSender.findMany({ where: { active: true, verified: true, services: { has: 'EMAIL_OTP' } }, include: { provider: { select: { enabled: true } } } }),
    db.whatsAppDevice.findMany({ where: { enabled: true } }),
  ]);
  const pinned = devices.find((d) => d.id === tenant.pinnedDeviceId);
  return (
    <>
      <PageHead title={t('Senders')} sub={t('The sender identities your messages can be sent from. The sender actually used is recorded on every request.')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold mb-3">Email</h2>
          {senders.length === 0 ? <Empty text={t('No verified email sender is available yet.')} /> : (
            <ul className="space-y-2 text-sm">{senders.map((s) => <li key={s.id} className="flex justify-between gap-2"><span className="break-all">{s.displayName} &lt;{s.address}&gt;</span>{tenant.senderId === s.id ? <StatusBadge s="ACTIVE" /> : <span style={{ color: 'var(--muted)' }}>{t('Shared pool')}</span>}</li>)}</ul>)}
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">WhatsApp</h2>
          {pinned ? <p className="text-sm">{t('Assigned device')}: <b>{pinned.label}</b> {pinned.phone ? `(${pinned.phone})` : ''} <StatusBadge s={isOnline(pinned) ? 'CONNECTED' : 'DISCONNECTED'} /></p>
            : <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('Your messages use the shared pool of connected devices. The sender number is recorded on each request.')}</p>}
          <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>{t('Sender selection is controlled by the platform administrators.')}</p>
        </Card>
      </div>
    </>
  );
}
