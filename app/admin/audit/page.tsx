import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Empty, dt, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit log' };

export default async function Audit({ searchParams }: { searchParams: { category?: string; page?: string } }) {
  await requireUser({ perm: 'audit.read' });
  const { t } = getT();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = searchParams.category ? { category: searchParams.category } : {};
  const [rows, total] = await Promise.all([db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, skip: (page - 1) * 50 }), db.auditLog.count({ where })]);
  return (
    <>
      <PageHead title={t('Audit log')} sub={`${total} ${t('records')}. ${t('Append-only: the application never edits or deletes these rows.')}`} />
      <div className="flex gap-2 mb-4 flex-wrap">{['', 'admin', 'security', 'finance', 'support', 'system'].map((c) => <Link key={c} className={`btn btn-sm ${(searchParams.category ?? '') === c ? 'btn-primary' : 'btn-ghost'}`} href={c ? `?category=${c}` : '?'}>{c || t('All')}</Link>)}</div>
      <Card>
        {rows.length === 0 ? <Empty text="—" /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Time')}</th><th>{t('Actor')}</th><th>{t('Action')}</th><th>{t('Target')}</th><th>{t('Details')}</th><th>IP</th></tr></thead><tbody>
            {rows.map((a) => <tr key={a.id}><td>{dt(a.createdAt)}</td><td className="text-xs">{a.actorRole ?? 'system'}<div style={{ color: 'var(--muted)' }}>{a.actorId?.slice(-8)}</div></td><td><Badge>{a.category}</Badge> {a.action}</td><td className="break-all text-xs">{a.target ?? '—'}</td><td className="text-xs break-all">{a.detail ? JSON.stringify(a.detail).slice(0, 140) : ''}</td><td className="text-xs">{a.ip ?? ''}</td></tr>)}
          </tbody></table></div>)}
        <div className="flex gap-2 mt-4">
          {page > 1 && <Link className="btn btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page - 1) })}`}>←</Link>}
          {page * 50 < total && <Link className="btn btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page + 1) })}`}>→</Link>}
        </div>
      </Card>
    </>
  );
}
