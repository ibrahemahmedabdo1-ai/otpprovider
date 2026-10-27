import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash } from '@/components/ui';
import { saveSettingAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function AdminSettings({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  await requireUser({ perm: 'settings.manage' });
  const { t } = getT();
  const rows = await db.setting.findMany();
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  return (
    <>
      <PageHead title={t('Settings')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold mb-2">{t('Maintenance mode')}</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{t('Blocks all customer API requests with a 503. Dashboards stay available.')}</p>
          <form action={saveSettingAction} className="flex gap-3 items-center"><input type="hidden" name="key" value="maintenance" />
            <label className="flex gap-2 text-sm"><input type="checkbox" name="value" defaultChecked={get('maintenance') === true} />{t('Enable maintenance mode')}</label><button className="btn btn-primary btn-sm">{t('Save')}</button></form>
        </Card>
        <Card>
          <h2 className="font-semibold mb-2">{t('Payment instructions')}</h2>
          <form action={saveSettingAction} className="space-y-3"><input type="hidden" name="key" value="payment_instructions" />
            <Field label={t('Shown to customers on the wallet page')} hint={t('Add your real USDT address / bank details here.')}><textarea className="input" name="value" rows={4} defaultValue={typeof get('payment_instructions') === 'string' ? (get('payment_instructions') as string) : ''} /></Field>
            <button className="btn btn-primary btn-sm">{t('Save')}</button></form>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-semibold mb-2">{t('Extra disposable-email domains')}</h2>
          <form action={saveSettingAction} className="space-y-3"><input type="hidden" name="key" value="disposable_domains" />
            <Field label={t('One domain per line (added to the built-in list)')}><textarea className="input" name="value" rows={5} defaultValue={Array.isArray(get('disposable_domains')) ? (get('disposable_domains') as string[]).join('\n') : ''} /></Field>
            <button className="btn btn-primary btn-sm">{t('Save')}</button></form>
        </Card>
      </div>
    </>
  );
}
