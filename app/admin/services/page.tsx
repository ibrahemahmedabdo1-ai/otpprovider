import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash, StatusBadge } from '@/components/ui';
import { ensureServiceConfigs, SERVICE_LABEL } from '@/lib/services';
import { updateServiceAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Services' };

export default async function Services({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  await requireUser({ perm: 'services.manage' });
  const { t } = getT();
  await ensureServiceConfigs();
  const cfgs = await db.serviceConfig.findMany({ orderBy: { key: 'asc' } });
  return (
    <>
      <PageHead title={t('Services')} sub={t('Turn each service on or off, set its price and billing rule. Disabled services reject new requests immediately.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="grid gap-4 lg:grid-cols-3">
        {cfgs.map((c) => (
          <Card key={c.key}>
            <div className="flex justify-between mb-3"><h2 className="font-semibold">{SERVICE_LABEL[c.key]}</h2><StatusBadge s={c.state} /></div>
            <form action={updateServiceAction} className="space-y-3"><input type="hidden" name="key" value={c.key} />
              <Field label={t('State')}><select className="input" name="state" defaultValue={c.state}><option value="ENABLED">ENABLED</option><option value="DEGRADED">DEGRADED ({t('still accepts requests')})</option><option value="DISABLED">DISABLED</option></select></Field>
              <Field label={t('Unit price (USD)')}><input className="input" name="unitPrice" type="number" step="0.000001" min={0} defaultValue={c.unitPrice.toString()} /></Field>
              <Field label={t('Bill when')} hint={t('"Delivered" charges only after a delivery confirmation.')}><select className="input" name="billOn" defaultValue={c.billOn}><option value="SUBMITTED">{t('Accepted by provider')}</option><option value="DELIVERED">{t('Delivered')}</option></select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('Daily limit')}><input className="input" name="dailyLimit" type="number" min={1} defaultValue={c.dailyLimit} /></Field>
                <Field label={t('Code validity (s)')}><input className="input" name="ttlSeconds" type="number" min={60} max={1800} defaultValue={c.ttlSeconds} /></Field>
              </div>
              <Field label={t('Max batch size')}><input className="input" name="maxBatch" type="number" min={1} max={500} defaultValue={String((c.settings as any)?.maxBatch ?? 100)} /></Field>
              <button className="btn btn-primary w-full">{t('Save')}</button>
            </form>
          </Card>))}
      </div>
    </>
  );
}
