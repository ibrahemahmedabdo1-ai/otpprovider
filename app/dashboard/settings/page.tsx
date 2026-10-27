import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash, dt, Badge } from '@/components/ui';
import { updateProfileAction, } from '@/app/actions/customer';
import { disableMfaAction, revokeOtherSessionsAction } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function Settings({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { user, session } = await requireClient();
  const { t } = getT();
  const sessions = await db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 10 });
  return (
    <>
      <PageHead title={t('Settings')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold mb-3">{t('Profile')}</h2>
          <form action={updateProfileAction} className="space-y-3">
            <Field label={t('Full name')}><input className="input" name="name" defaultValue={user.name} required minLength={2} /></Field>
            <Field label={t('Email')}><input className="input" value={user.email} disabled /></Field>
            <button className="btn btn-primary">{t('Save')}</button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">{t('Security')}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span>{t('Two-factor authentication')}</span>{user.mfaEnabled ? <Badge tone="ok">{t('Enabled')}</Badge> : <Link className="btn btn-primary btn-sm" href="/mfa/setup">{t('Enable')}</Link>}</div>
            {user.mfaEnabled && (<form action={disableMfaAction} className="flex gap-2"><input className="input" type="password" name="password" placeholder={t('Password')} required /><button className="btn btn-ghost btn-sm">{t('Disable 2FA')}</button></form>)}
            <div><Link className="btn btn-ghost btn-sm" href="/change-password">{t('Change password')}</Link></div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex justify-between mb-3"><h2 className="font-semibold">{t('Active sessions')}</h2>
            <form action={revokeOtherSessionsAction}><button className="btn btn-ghost btn-sm">{t('Sign out other sessions')}</button></form></div>
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Started')}</th><th>IP</th><th>{t('Device')}</th><th /></tr></thead><tbody>
            {sessions.map((s) => <tr key={s.id}><td>{dt(s.createdAt)}</td><td>{s.ip ?? '—'}</td><td className="break-all">{(s.userAgent ?? '').slice(0, 60)}</td><td>{s.id === session.id && <Badge tone="ok">{t('This session')}</Badge>}</td></tr>)}
          </tbody></table></div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-semibold mb-1">{t('Close account')}</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{t('Account closure is handled by our team so any remaining balance can be settled.')}</p>
          <Link className="btn btn-ghost btn-sm" href="/dashboard/support/new?category=account-closure">{t('Request closure')}</Link>
        </Card>
      </div>
    </>
  );
}
