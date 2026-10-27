import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Empty, StatusBadge, dt } from '@/components/ui';
import { fmtMoney } from '@/lib/ledger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customers' };

export default async function Customers({ searchParams }: { searchParams: { q?: string; status?: string; page?: string } }) {
  await requireUser({ perm: 'customers.read' });
  const { t } = getT();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q?.trim();
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (q) where.OR = [{ id: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }, { users: { some: { email: { contains: q, mode: 'insensitive' } } } }];
  const [rows, total] = await Promise.all([
    db.tenant.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30, skip: (page - 1) * 30, include: { users: { select: { email: true, name: true }, take: 1 }, package: true } }),
    db.tenant.count({ where }),
  ]);
  return (
    <>
      <PageHead title={t('Customers')} sub={`${total} ${t('records')}`} />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-4">
          <input className="input sm:col-span-2" name="q" placeholder={t('Search by ID, name or email')} defaultValue={q} />
          <select className="input" name="status" defaultValue={searchParams.status ?? ''}><option value="">{t('All statuses')}</option>{['ACTIVE', 'PENDING', 'SUSPENDED', 'RESTRICTED', 'CLOSED'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-primary">{t('Search')}</button>
        </form>
      </Card>
      <Card>
        {rows.length === 0 ? <Empty text={t('No customers found.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Customer')}</th><th>{t('Email')}</th><th>{t('Plan')}</th><th>{t('Balance')}</th><th>{t('Status')}</th><th>{t('Joined')}</th></tr></thead><tbody>
            {rows.map((c) => <tr key={c.id}><td><Link className="underline" href={`/admin/customers/${c.id}`}>{c.name}</Link></td><td className="break-all">{c.users[0]?.email}</td><td>{c.package?.name ?? '—'}</td><td>{fmtMoney(c.balance)}</td><td><StatusBadge s={c.status} /></td><td>{dt(c.createdAt)}</td></tr>)}
          </tbody></table></div>)}
        <div className="flex gap-2 mt-4 text-sm">
          {page > 1 && <Link className="btn btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page - 1) })}`}>←</Link>}
          {page * 30 < total && <Link className="btn btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page + 1) })}`}>→</Link>}
        </div>
      </Card>
    </>
  );
}
