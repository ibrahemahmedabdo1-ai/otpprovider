import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Empty, StatusBadge, Stat, dt } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Support desk' };

export default async function SupportDesk({ searchParams }: { searchParams: { view?: string; q?: string; status?: string } }) {
  const { user } = await requireUser({ perm: 'tickets.handle' });
  const { t } = getT();
  // Support agents see unassigned tickets and their own. Admins see everything.
  const scope: any = user.role === 'SUPPORT' ? { OR: [{ assignedId: null }, { assignedId: user.id }] } : {};
  const where: any = { AND: [scope] };
  if (searchParams.view === 'mine') where.AND.push({ assignedId: user.id });
  if (searchParams.view === 'unassigned') where.AND.push({ assignedId: null });
  if (searchParams.view === 'escalated') where.AND.push({ status: 'ESCALATED' });
  if (searchParams.status) where.AND.push({ status: searchParams.status });
  if (searchParams.q) where.AND.push({ OR: [{ subject: { contains: searchParams.q, mode: 'insensitive' } }, { tenant: { name: { contains: searchParams.q, mode: 'insensitive' } } }] });
  const [tickets, counts] = await Promise.all([
    db.ticket.findMany({ where, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }], take: 60, include: { tenant: { select: { name: true, status: true } } } }),
    db.ticket.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
  const views = [['', t('All')], ['mine', t('Mine')], ['unassigned', t('Unassigned')], ['escalated', t('Escalated')]];
  return (
    <>
      <PageHead title={t('Support desk')} />
      <div className="grid gap-4 sm:grid-cols-3 mb-4"><Stat label={t('Open')} value={c('OPEN')} tone={c('OPEN') ? 'warn' : undefined} /><Stat label={t('Waiting on customer')} value={c('WAITING')} /><Stat label={t('Escalated')} value={c('ESCALATED')} tone={c('ESCALATED') ? 'bad' : undefined} /></div>
      <div className="flex gap-2 mb-3 flex-wrap">{views.map(([v, l]) => <Link key={v} className={`btn btn-sm ${(searchParams.view ?? '') === v ? 'btn-primary' : 'btn-ghost'}`} href={v ? `?view=${v}` : '?'}>{l}</Link>)}</div>
      <Card className="mb-4"><form className="flex gap-3"><input className="input" name="q" placeholder={t('Search subject or customer')} defaultValue={searchParams.q} /><button className="btn btn-primary">{t('Search')}</button></form></Card>
      <Card>
        {tickets.length === 0 ? <Empty text={t('No tickets in this view.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Subject')}</th><th>{t('Customer')}</th><th>{t('Priority')}</th><th>{t('Status')}</th><th>{t('Assigned')}</th><th>{t('Updated')}</th></tr></thead><tbody>
            {tickets.map((x) => <tr key={x.id}><td><Link className="underline" href={`/support/${x.id}`}>{x.subject}</Link><div className="text-xs" style={{ color: 'var(--muted)' }}>{x.category}</div></td><td>{x.tenant.name} <StatusBadge s={x.tenant.status} /></td><td>{x.priority}</td><td><StatusBadge s={x.status} /></td><td>{x.assignedId ? (x.assignedId === user.id ? t('Me') : '•') : '—'}</td><td>{dt(x.updatedAt)}</td></tr>)}
          </tbody></table></div>)}
      </Card>
    </>
  );
}
