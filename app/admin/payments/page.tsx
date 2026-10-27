import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Flash, StatusBadge, Empty, dt } from '@/components/ui';
import { ConfirmButton } from '@/components/Client';
import { approveTopupAction, rejectTopupAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payments' };

export default async function Payments({ searchParams }: { searchParams: { ok?: string; err?: string; status?: string } }) {
  const { user } = await requireUser({ perm: 'finance.read' });
  const { t } = getT();
  const status = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(searchParams.status ?? '') ? searchParams.status : undefined;
  const rows = await db.topupRequest.findMany({ where: status ? { status: status as any } : {}, orderBy: { createdAt: 'desc' }, take: 100, include: { tenant: { select: { id: true, name: true } } } });
  const fin = can(user, 'finance.write');
  return (
    <>
      <PageHead title={t('Payments')} sub={t('Approve only after you have verified the transfer or USDT transaction yourself. Approval credits the wallet once, through the ledger.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="flex gap-2 mb-4 flex-wrap">{['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => <a key={s} className={`btn btn-sm ${(status ?? '') === s ? 'btn-primary' : 'btn-ghost'}`} href={s ? `?status=${s}` : '?'}>{s || t('All')}</a>)}</div>
      <Card>
        {rows.length === 0 ? <Empty text="—" /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Date')}</th><th>{t('Customer')}</th><th>{t('Amount')}</th><th>{t('Method')}</th><th>{t('Reference')}</th><th>{t('Status')}</th><th /></tr></thead><tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{dt(r.createdAt)}</td><td><a className="underline" href={`/admin/customers/${r.tenant.id}`}>{r.tenant.name}</a></td><td>${r.amount.toString()}</td><td>{r.method}</td><td className="break-all">{r.reference ?? '—'}{r.note ? <div className="text-xs" style={{ color: 'var(--muted)' }}>{r.note}</div> : null}</td><td><StatusBadge s={r.status} /></td>
                <td className="flex gap-1">{fin && r.status === 'PENDING' && (<>
                  <form action={approveTopupAction}><input type="hidden" name="id" value={r.id} /><ConfirmButton className="btn btn-ok btn-sm" message={`Credit $${r.amount.toString()}?`}>{t('Approve')}</ConfirmButton></form>
                  <form action={rejectTopupAction}><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger btn-sm">{t('Reject')}</button></form></>)}</td></tr>))}
          </tbody></table></div>)}
      </Card>
    </>
  );
}
