import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Empty, Flash, dt, Badge } from '@/components/ui';
import { Reveal } from '@/components/Reveal';
import { createKeyAction, revokeKeyAction, rotateKeyAction } from '@/app/actions/customer';
import { ConfirmButton } from '@/components/Client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'API keys' };

export default async function Keys({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { tenant } = await requireClient();
  const { t } = getT();
  const keys = await db.apiKey.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' } });
  return (
    <>
      <PageHead title={t('API keys')} sub={t('Use a key as a Bearer token. Keys are stored hashed and shown only once.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Reveal />
      <Card className="mb-4">
        <h2 className="font-semibold mb-3">{t('Create a key')}</h2>
        <form action={createKeyAction} className="grid gap-4 md:grid-cols-4 items-end">
          <Field label={t('Label')}><input className="input" name="label" placeholder="Production" maxLength={60} /></Field>
          <Field label={t('Requests per minute')}><input className="input" name="rate" type="number" min={1} max={1000} defaultValue={60} /></Field>
          <div className="md:col-span-2 flex flex-wrap gap-3 text-sm pb-2">
            <label className="flex gap-1"><input type="checkbox" name="services" value="EMAIL_OTP" /> Email OTP</label>
            <label className="flex gap-1"><input type="checkbox" name="services" value="WHATSAPP_OTP" /> WhatsApp OTP</label>
            <label className="flex gap-1"><input type="checkbox" name="services" value="EMAIL_VALIDATION" /> Validation</label>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{t('None selected = all services')}</span>
          </div>
          <button className="btn btn-primary md:col-span-4 md:w-fit">{t('Create key')}</button>
        </form>
      </Card>
      <Card>
        {keys.length === 0 ? <Empty text={t('No keys yet.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Label')}</th><th>{t('Key')}</th><th>{t('Scope')}</th><th>{t('Rate')}</th><th>{t('Created')}</th><th>{t('Last used')}</th><th /></tr></thead><tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.label}</td><td><code>{k.prefix}••••••••</code></td>
                <td>{k.services.length ? k.services.join(', ') : t('All')}</td><td>{k.rateLimit}/min</td>
                <td>{dt(k.createdAt)}</td><td>{dt(k.lastUsedAt)}</td>
                <td className="flex gap-2">
                  {k.revokedAt ? <Badge tone="bad">{t('Revoked')}</Badge> : (<>
                    <form action={rotateKeyAction}><input type="hidden" name="id" value={k.id} /><ConfirmButton className="btn btn-ghost btn-sm" message={t('Rotate this key? The old one stops working immediately.')}>{t('Rotate')}</ConfirmButton></form>
                    <form action={revokeKeyAction}><input type="hidden" name="id" value={k.id} /><ConfirmButton className="btn btn-danger btn-sm" message={t('Revoke this key?')}>{t('Revoke')}</ConfirmButton></form>
                  </>)}
                </td>
              </tr>))}
          </tbody></table></div>)}
      </Card>
    </>
  );
}
