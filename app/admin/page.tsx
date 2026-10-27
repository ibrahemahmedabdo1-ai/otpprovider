import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Stat, StatusBadge, Empty, dt, Flash } from '@/components/ui';
import { FadeIn } from '@/components/Client';
import { fmtMoney } from '@/lib/ledger';
import { isOnline } from '@/lib/whatsapp';
import { ensureServiceConfigs, maintenanceMode, SERVICE_LABEL } from '@/lib/services';
import { emailConfigured } from '@/lib/email';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin overview' };

export default async function AdminHome({ searchParams }: { searchParams: { denied?: string } }) {
  await requireUser();
  const { t } = getT();
  await ensureServiceConfigs();
  const since = new Date(Date.now() - 30 * 864e5);
  const [tenants, msgs, wallet, pendingTop, services, devices, openTickets, audits, vals, usage, maint, mailOk, providers] = await Promise.all([
    db.tenant.groupBy({ by: ['status'], _count: { _all: true } }),
    db.messageRequest.groupBy({ by: ['service', 'status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    db.tenant.aggregate({ _sum: { balance: true } }),
    db.topupRequest.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: { _all: true } }),
    db.serviceConfig.findMany(),
    db.whatsAppDevice.findMany({ orderBy: { priority: 'asc' } }),
    db.ticket.count({ where: { status: { in: ['OPEN', 'WAITING', 'ESCALATED'] } } }),
    db.auditLog.findMany({ where: { category: { in: ['security', 'system'] } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    db.emailValidation.count({ where: { createdAt: { gte: since } } }),
    db.ledgerEntry.aggregate({ where: { type: 'USAGE', createdAt: { gte: since } }, _sum: { amount: true } }),
    maintenanceMode(), emailConfigured(),
    db.emailProvider.findMany({ select: { name: true, enabled: true, lastStatus: true } }),
  ]);
  const tc = (s: string) => tenants.find((x) => x.status === s)?._count._all ?? 0;
  const mc = (svc: string, sts?: string[]) => msgs.filter((m) => m.service === svc && (!sts || sts.includes(m.status))).reduce((a, m) => a + m._count._all, 0);
  const online = devices.filter((d) => isOnline(d)).length;
  const revenue = new Prisma.Decimal(usage._sum.amount ?? 0).abs();
  return (
    <>
      <PageHead title={t('Overview')} sub={t('Last 30 days. Every figure is computed from real records.')} />
      {searchParams.denied && <Flash err={t('You do not have permission for that page.')} />}
      {maint && <Flash err={t('Maintenance mode is ON: customer API requests are blocked.')} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          <Stat key="1" label={t('Customers')} value={tenants.reduce((a, x) => a + x._count._all, 0)} sub={`${tc('ACTIVE')} ${t('active')} · ${tc('SUSPENDED')} ${t('suspended')} · ${tc('PENDING')} ${t('pending')} · ${tc('RESTRICTED')} ${t('restricted')}`} />,
          <Stat key="2" label={t('Wallet balances (total)')} value={fmtMoney(wallet._sum.balance ?? 0)} sub={`${t('Usage revenue')}: ${fmtMoney(revenue)}`} />,
          <Stat key="3" label={t('Pending payments')} value={pendingTop._count._all} sub={fmtMoney(pendingTop._sum.amount ?? 0, 2)} tone={pendingTop._count._all ? 'warn' : undefined} />,
          <Stat key="4" label={t('Open tickets')} value={openTickets} tone={openTickets ? 'warn' : undefined} />,
        ].map((c, i) => <FadeIn key={i} delay={i * 0.05}>{c}</FadeIn>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3 mt-4">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold mb-3">{t('Requests by service (30 days)')}</h2>
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Service')}</th><th>{t('Total')}</th><th>{t('Delivered')}</th><th>{t('Submitted/sent')}</th><th>{t('Pending')}</th><th>{t('Failed')}</th><th>{t('Uncertain')}</th></tr></thead><tbody>
            {(['EMAIL_OTP', 'WHATSAPP_OTP'] as const).map((s) => <tr key={s}><td>{SERVICE_LABEL[s]}</td><td>{mc(s)}</td><td>{mc(s, ['DELIVERED', 'READ'])}</td><td>{mc(s, ['SUBMITTED', 'SENT'])}</td><td>{mc(s, ['QUEUED', 'PROCESSING'])}</td><td>{mc(s, ['FAILED', 'REJECTED', 'EXPIRED'])}</td><td>{mc(s, ['UNKNOWN_OUTCOME'])}</td></tr>)}
            <tr><td>{SERVICE_LABEL.EMAIL_VALIDATION}</td><td>{vals}</td><td colSpan={5} style={{ color: 'var(--muted)' }}>{t('Per-record billing')}</td></tr>
          </tbody></table></div>
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">{t('Service state')}</h2>
          <ul className="space-y-2 text-sm">{services.map((s) => <li key={s.key} className="flex justify-between"><span>{SERVICE_LABEL[s.key]}</span><StatusBadge s={s.state} /></li>)}</ul>
          <h2 className="font-semibold mt-5 mb-3">{t('Health')}</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>{t('Database')}</span><StatusBadge s="ACTIVE" /></li>
            <li className="flex justify-between"><span>{t('Email provider')}</span><StatusBadge s={mailOk ? 'ENABLED' : 'DISABLED'} /></li>
            {providers.map((p) => <li key={p.name} className="text-xs" style={{ color: 'var(--muted)' }}>{p.name}: {p.lastStatus ?? t('not checked')}</li>)}
            <li className="flex justify-between"><span>WhatsApp</span><span>{online}/{devices.length} {t('online')}</span></li>
          </ul>
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="font-semibold mb-3">{t('Recent security & system events')}</h2>
        {audits.length === 0 ? <Empty text={t('Nothing recorded yet.')} /> : <ul className="space-y-1 text-sm">{audits.map((a) => <li key={a.id} className="flex justify-between gap-3"><span>{a.action} <span style={{ color: 'var(--muted)' }}>{a.target ?? ''}</span></span><span style={{ color: 'var(--muted)' }}>{dt(a.createdAt)}</span></li>)}</ul>}
      </Card>
    </>
  );
}
