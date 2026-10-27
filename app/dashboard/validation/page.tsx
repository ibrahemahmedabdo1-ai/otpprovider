import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Empty, Flash, StatusBadge, dt } from '@/components/ui';
import { validateEmailsAction } from '@/app/actions/customer';
import { getServiceConfig } from '@/lib/services';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Email validation' };

export default async function Validation({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { tenant } = await requireClient();
  const { t } = getT();
  const cfg = await getServiceConfig('EMAIL_VALIDATION');
  const rows = await db.emailValidation.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  return (
    <>
      <PageHead title={t('Email validation')} sub={t('Checks syntax, domain, MX records, disposable and role-based addresses. It does not prove that a mailbox exists.')}
        actions={<a className="btn btn-ghost btn-sm" href="/dashboard/validation/export">{t('Export CSV')}</a>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Card className="mb-4">
        <form action={validateEmailsAction} className="space-y-3">
          <label className="label">{t('Email addresses (one per line)')}</label>
          <textarea className="input" name="emails" rows={5} placeholder="name@example.com" required />
          <div className="flex items-center gap-4"><button className="btn btn-primary" disabled={cfg.state === 'DISABLED'}>{t('Validate')}</button>
            {cfg.state === 'DISABLED' && <span className="text-sm" style={{ color: 'var(--bad)' }}>{t('Service is currently disabled')}</span>}
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{t('Each address is billed once.')}</span></div>
        </form>
      </Card>
      <Card>
        {rows.length === 0 ? <Empty text={t('No validations yet.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Time')}</th><th>{t('Email')}</th><th>{t('Result')}</th><th>Syntax</th><th>Domain</th><th>MX</th><th>Disposable</th><th>Role</th><th>{t('Charge')}</th></tr></thead><tbody>
            {rows.map((r) => { const c = r.checks as any; const y = (v: any) => (v === null ? '?' : v ? '✓' : '✗'); return (
              <tr key={r.id}><td>{dt(r.createdAt)}</td><td className="break-all">{r.email}</td><td><StatusBadge s={r.verdict} /></td><td>{y(c.syntax)}</td><td>{y(c.domainResolves)}</td><td>{y(c.mx)}</td><td>{c.disposable ? '⚠' : '—'}</td><td>{c.roleBased ? '⚠' : '—'}</td><td>${r.charge.toString()}</td></tr>); })}
          </tbody></table></div>)}
      </Card>
    </>
  );
}
