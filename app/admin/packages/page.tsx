import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash, StatusBadge } from '@/components/ui';
import { savePackageAction, togglePackageAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Packages' };

export default async function Packages({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  await requireUser({ perm: 'packages.manage' });
  const { t } = getT();
  const pkgs = await db.package.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { tenants: true } } } });
  const form = (p?: (typeof pkgs)[number]) => (
    <form action={savePackageAction} className="grid gap-3 sm:grid-cols-3 items-end">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label={t('Name')}><input className="input" name="name" defaultValue={p?.name} required /></Field>
      <Field label={t('Price (USD)')}><input className="input" name="priceUsd" type="number" step="0.01" min={0} defaultValue={p?.priceUsd.toString() ?? '2.99'} required /></Field>
      <Field label={t('Sort order')}><input className="input" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} /></Field>
      <Field label={t('Email OTP quota')}><input className="input" name="emailQuota" type="number" min={0} defaultValue={p?.emailQuota ?? 0} /></Field>
      <Field label={t('WhatsApp OTP quota')}><input className="input" name="whatsappQuota" type="number" min={0} defaultValue={p?.whatsappQuota ?? 0} /></Field>
      <Field label={t('Validation quota')}><input className="input" name="validationQuota" type="number" min={0} defaultValue={p?.validationQuota ?? 0} /></Field>
      <label className="flex gap-2 text-sm pb-2"><input type="checkbox" name="custom" defaultChecked={p?.custom} />{t('Custom / enterprise (hidden from public)')}</label>
      <button className="btn btn-primary">{t('Save')}</button>
    </form>);
  return (
    <>
      <PageHead title={t('Packages')} sub={t('Quotas shown here are descriptive until you assign them to customers; usage is always billed from the wallet.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="space-y-3 mb-6">
        {pkgs.map((p) => (
          <Card key={p.id}>
            <div className="flex justify-between items-center mb-3"><div className="font-semibold">{p.name} · ${p.priceUsd.toString()} <span className="text-xs" style={{ color: 'var(--muted)' }}>({p._count.tenants} {t('customers')})</span></div>
              <div className="flex gap-2 items-center"><StatusBadge s={p.active ? 'ACTIVE' : 'DISABLED'} /><form action={togglePackageAction}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm">{p.active ? t('Hide') : t('Show')}</button></form></div></div>
            <details><summary className="cursor-pointer text-sm">{t('Edit')}</summary><div className="mt-3">{form(p)}</div></details>
          </Card>))}
      </div>
      <Card><h2 className="font-semibold mb-3">{t('New package')}</h2>{form()}</Card>
    </>
  );
}
