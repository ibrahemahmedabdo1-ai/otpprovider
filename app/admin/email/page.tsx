import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash, StatusBadge, Badge, Empty, dt } from '@/components/ui';
import { ConfirmButton } from '@/components/Client';
import { addProviderAction, toggleProviderAction, deleteProviderAction, checkProviderAction, addSenderAction, senderToggleAction, deleteSenderAction, testEmailAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Email providers' };

export default async function EmailAdmin({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  await requireUser({ perm: 'email.manage' });
  const { t } = getT();
  const providers = await db.emailProvider.findMany({ orderBy: { priority: 'asc' }, include: { senders: { orderBy: { createdAt: 'asc' } } } });
  const envKey = !!process.env.RESEND_API_KEY;
  return (
    <>
      <PageHead title={t('Email providers')} sub={t('Providers are tried in priority order. A provider is only skipped for the next one when it definitely rejected the message, never after a timeout.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      {envKey && <Card className="mb-4"><p className="text-sm">{t('A fallback provider from the RESEND_API_KEY environment variable is active (used after the providers below).')}</p></Card>}
      {providers.length === 0 && <Card className="mb-4"><Empty text={t('No providers yet. Add your Resend API key below.')} /></Card>}
      <div className="space-y-4 mb-6">
        {providers.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div><div className="font-semibold">{p.name} <span className="text-xs" style={{ color: 'var(--muted)' }}>({p.kind}, {t('priority')} {p.priority})</span></div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{p.lastStatus ?? t('Not checked')} {p.lastCheck ? `· ${dt(p.lastCheck)}` : ''}</div></div>
              <div className="flex gap-2 items-center"><StatusBadge s={p.enabled ? 'ENABLED' : 'DISABLED'} />
                <form action={checkProviderAction}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm">{t('Check domains')}</button></form>
                <form action={toggleProviderAction}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm">{p.enabled ? t('Disable') : t('Enable')}</button></form>
                <form action={deleteProviderAction}><input type="hidden" name="id" value={p.id} /><ConfirmButton className="btn btn-danger btn-sm" message={t('Delete provider and its senders?')}>{t('Delete')}</ConfirmButton></form></div>
            </div>
            <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Sender')}</th><th>{t('Services')}</th><th>{t('Verified')}</th><th>{t('Active')}</th><th>{t('Last used')}</th><th /></tr></thead><tbody>
              {p.senders.map((s) => (
                <tr key={s.id}><td className="break-all">{s.displayName} &lt;{s.address}&gt;</td><td>{s.services.join(', ')}</td>
                  <td>{s.verified ? <Badge tone="ok">{t('verified')}</Badge> : <Badge tone="warn">{t('unverified')}</Badge>}</td>
                  <td>{s.active ? <Badge tone="ok">{t('on')}</Badge> : <Badge tone="bad">{t('off')}</Badge>}</td><td>{dt(s.lastUsedAt)}</td>
                  <td className="flex gap-1 flex-wrap">
                    <form action={senderToggleAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="field" value="active" /><button className="btn btn-ghost btn-sm">{s.active ? t('Pause') : t('Resume')}</button></form>
                    <form action={senderToggleAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="field" value="verified" /><ConfirmButton className="btn btn-ghost btn-sm" message={t('Only mark manually if you confirmed the domain as verified in the provider dashboard. Continue?')}>{s.verified ? t('Unmark') : t('Mark verified (manual)')}</ConfirmButton></form>
                    <form action={deleteSenderAction}><input type="hidden" name="id" value={s.id} /><ConfirmButton className="btn btn-danger btn-sm" message="Delete?">✕</ConfirmButton></form></td></tr>))}
            </tbody></table></div>
            <form action={addSenderAction} className="grid gap-3 md:grid-cols-5 items-end mt-4"><input type="hidden" name="providerId" value={p.id} />
              <Field label={t('Sender address')}><input className="input" name="address" type="email" placeholder="no-reply@yourdomain.com" required /></Field>
              <Field label={t('Display name')}><input className="input" name="displayName" placeholder="OTPProvider" /></Field>
              <div className="flex gap-3 text-sm pb-2 md:col-span-2"><label className="flex gap-1"><input type="checkbox" name="services" value="EMAIL_OTP" defaultChecked />Email OTP</label><label className="flex gap-1"><input type="checkbox" name="services" value="SYSTEM" />{t('System emails')}</label></div>
              <button className="btn btn-primary">{t('Add sender')}</button>
            </form>
          </Card>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="font-semibold mb-3">{t('Add a provider')}</h2>
          <form action={addProviderAction} className="space-y-3">
            <Field label={t('Name')}><input className="input" name="name" defaultValue="Resend" /></Field>
            <Field label="Resend API key" hint={t('Stored encrypted. Never shown again.')}><input className="input" name="apiKey" type="password" placeholder="re_..." required autoComplete="off" /></Field>
            <Field label={t('Priority (1 = first)')}><input className="input" name="priority" type="number" min={1} defaultValue={providers.length + 1} /></Field>
            <button className="btn btn-primary">{t('Add')}</button></form></Card>
        <Card><h2 className="font-semibold mb-3">{t('Send a real test email')}</h2>
          <form action={testEmailAction} className="space-y-3"><Field label={t('Recipient')}><input className="input" name="to" type="email" required /></Field>
            <button className="btn btn-primary">{t('Send test')}</button></form>
          <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>{t('Uses the first usable provider. "Accepted" means the provider took it, not that it reached the inbox.')}</p></Card>
      </div>
    </>
  );
}
