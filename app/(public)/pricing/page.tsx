import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getT } from '@/lib/i18n';
import { Card, Empty } from '@/components/ui';
import { FadeIn } from '@/components/Client';
import { SERVICE_LABEL, ensureServiceConfigs } from '@/lib/services';
import { fmtMoney } from '@/lib/ledger';

export const metadata: Metadata = { title: 'Pricing' };
export const dynamic = 'force-dynamic';

export default async function Pricing() {
  const { t } = getT();
  await ensureServiceConfigs();
  const [pkgs, cfgs] = await Promise.all([
    db.package.findMany({ where: { active: true, custom: false }, orderBy: { sortOrder: 'asc' } }),
    db.serviceConfig.findMany(),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('Pricing')}</h1>
      <p className="mt-2" style={{ color: 'var(--muted)' }}>{t('Prepaid wallet. You pay per request; paid balance does not expire.')}</p>
      <h2 className="text-lg font-semibold mt-8 mb-3">{t('Packages')}</h2>
      {pkgs.length === 0 ? <Card><Empty text={t('Nothing here yet.')} /></Card> : (
        <div className="grid md:grid-cols-3 gap-4">
          {pkgs.map((p, i) => (
            <FadeIn key={p.id} delay={i * 0.07}>
              <Card className="h-full">
                <h3 className="font-bold text-lg">{p.name}</h3>
                <div className="text-3xl font-extrabold mt-2">${Number(p.priceUsd).toFixed(2)}</div>
                <ul className="text-sm mt-4 space-y-1.5" style={{ color: 'var(--muted)' }}>
                  <li>{p.emailQuota.toLocaleString('en-US')} {t('Email OTP')}</li>
                  <li>{p.whatsappQuota.toLocaleString('en-US')} {t('WhatsApp OTP')}</li>
                  <li>{p.validationQuota.toLocaleString('en-US')} {t('Email validation')}</li>
                </ul>
                <Link href="/register" className="btn btn-primary w-full mt-5">{t('Get started')}</Link>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}
      <h2 className="text-lg font-semibold mt-10 mb-3">{t('Pay as you go')}</h2>
      <Card className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Service')}</th><th>{t('Price per request')}</th><th>{t('Charged when')}</th></tr></thead><tbody>
        {cfgs.map((c) => (<tr key={c.key}><td>{t(SERVICE_LABEL[c.key])}</td><td>{fmtMoney(c.unitPrice, 4)}</td><td>{c.billOn === 'DELIVERED' ? t('Delivery is confirmed') : t('Accepted by the provider')}</td></tr>))}
      </tbody></table></Card>
      <p className="text-sm mt-4" style={{ color: 'var(--muted)' }}>{t('Need volume or custom rates? Open a ticket after signing up and we will set up a custom plan.')}</p>
    </div>
  );
}
