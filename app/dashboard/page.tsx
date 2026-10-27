import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Stat, StatusBadge, Empty, dt, Flash } from '@/components/ui';
import { FadeIn } from '@/components/Client';
import { fmtMoney } from '@/lib/ledger';
import { SERVICE_LABEL, ensureServiceConfigs } from '@/lib/services';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Overview' };

export default async function Overview({ searchParams }: { searchParams: { denied?: string } }) {
  const { tenant } = await requireClient();
  const { t } = getT();
  await ensureServiceConfigs();
  const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
  const [byService, recent, tx, services, openTickets, vals] = await Promise.all([
    db.messageRequest.groupBy({ by: ['service', 'status'], where: { tenantId: tenant.id, createdAt: { gte: since } }, _count: { _all: true } }),
    db.messageRequest.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 6 }),
    db.ledgerEntry.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
    db.serviceConfig.findMany(),
    db.ticket.count({ where: { tenantId: tenant.id, status: { in: ['OPEN', 'WAITING', 'ESCALATED'] } } }),
    db.emailValidation.count({ where: { tenantId: tenant.id, createdAt: { gte: since } } }),
  ]);
  const count = (svc: string, ok?: boolean) => byService.filter((r) => r.service === svc && (ok === undefined || (['DELIVERED', 'READ', 'SENT', 'SUBMITTED'].includes(r.status) === ok))).reduce((a, r) => a + r._count._all, 0);
  const ov = (tenant.serviceOverrides ?? {}) as Record<string, boolean>;
  return (
    <>
      <PageHead title={t('Overview')} sub={tenant.name} />
      {searchParams.denied && <Flash err={t('You do not have access to that page.')} />}
      {tenant.status !== 'ACTIVE' && <Flash err={`${t('Your account is')} ${tenant.status}. ${t('New requests are blocked.')}`} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          <Stat key="b" label={t('Available balance')} value={fmtMoney(tenant.balance)} sub={tenant.package?.name ?? t('No plan')} tone={tenant.balance.lte(0) ? 'bad' : undefined} />,
          <Stat key="e" label={t('Email OTP this month')} value={count('EMAIL_OTP')} sub={`${count('EMAIL_OTP', false)} ${t('failed or pending')}`} />,
          <Stat key="w" label={t('WhatsApp OTP this month')} value={count('WHATSAPP_OTP')} sub={`${count('WHATSAPP_OTP', false)} ${t('failed or pending')}`} />,
          <Stat key="v" label={t('Validations this month')} value={vals} sub={`${openTickets} ${t('open tickets')}`} />,
        ].map((c, i) => <FadeIn key={i} delay={i * 0.06}>{c}</FadeIn>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3 mt-4">
        <Card className="lg:col-span-2">
          <div className="flex justify-between mb-3"><h2 className="font-semibold">{t('Recent API activity')}</h2><Link className="text-sm underline" href="/dashboard/messages">{t('View all')}</Link></div>
          {recent.length === 0 ? <Empty text={t('No requests yet. Create an API key to get started.')} /> : (
            <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Service')}</th><th>{t('Recipient')}</th><th>{t('Status')}</th><th>{t('Time')}</th></tr></thead><tbody>
              {recent.map((m) => <tr key={m.id}><td>{SERVICE_LABEL[m.service]}</td><td className="break-all">{m.recipient}</td><td><StatusBadge s={m.status} /></td><td>{dt(m.createdAt)}</td></tr>)}
            </tbody></table></div>)}
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">{t('Service availability')}</h2>
          <ul className="space-y-2 text-sm">
            {services.map((s) => {
              const effective = ov[s.key] === false ? 'DISABLED' : ov[s.key] === true ? 'ENABLED' : s.state;
              return <li key={s.key} className="flex justify-between items-center"><span>{SERVICE_LABEL[s.key]}</span><StatusBadge s={effective} /></li>;
            })}
          </ul>
          <h2 className="font-semibold mt-5 mb-3">{t('Recent transactions')}</h2>
          {tx.length === 0 ? <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('No transactions yet.')}</p> : (
            <ul className="space-y-2 text-sm">{tx.map((x) => <li key={x.id} className="flex justify-between"><span>{x.type}</span><span style={{ color: x.amount.isNegative() ? 'var(--bad)' : 'var(--ok)' }}>{fmtMoney(x.amount)}</span></li>)}</ul>)}
        </Card>
      </div>
    </>
  );
}
