import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Flash, StatusBadge, Empty, dt } from '@/components/ui';
import { SERVICE_LABEL } from '@/lib/services';
import { fmtMoney } from '@/lib/ledger';
import { ConfirmButton } from '@/components/Client';
import { refundMessageAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Messages' };

export default async function AdminMessages({ searchParams }: { searchParams: { ok?: string; err?: string; q?: string; status?: string; service?: string; page?: string } }) {
  const { user } = await requireUser({ perm: 'customers.read' });
  const { t } = getT();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status;
  if (['EMAIL_OTP', 'WHATSAPP_OTP'].includes(searchParams.service ?? '')) where.service = searchParams.service;
  if (searchParams.q) where.OR = [{ recipient: { contains: searchParams.q, mode: 'insensitive' } }, { id: { contains: searchParams.q } }, { senderLabel: { contains: searchParams.q, mode: 'insensitive' } }];
  const [rows, total] = await Promise.all([db.messageRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30, skip: (page - 1) * 30, include: { tenant: { select: { id: true, name: true } } } }), db.messageRequest.count({ where })]);
  const fin = can(user, 'finance.write');
  return (
    <>
      <PageHead title={t('Messages')} sub={`${total} ${t('records')}`} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Card className="mb-4"><form className="grid gap-3 sm:grid-cols-4">
        <input className="input" name="q" placeholder={t('Recipient, sender or request ID')} defaultValue={searchParams.q} />
        <select className="input" name="service" defaultValue={searchParams.service ?? ''}><option value="">{t('All services')}</option><option value="EMAIL_OTP">Email OTP</option><option value="WHATSAPP_OTP">WhatsApp OTP</option></select>
        <select className="input" name="status" defaultValue={searchParams.status ?? ''}><option value="">{t('All statuses')}</option>{['QUEUED', 'PROCESSING', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'REJECTED', 'FAILED', 'EXPIRED', 'UNKNOWN_OUTCOME'].map((s) => <option key={s}>{s}</option>)}</select>
        <button className="btn btn-primary">{t('Filter')}</button></form></Card>
      <Card>
        {rows.length === 0 ? <Empty text="—" /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Time')}</th><th>{t('Customer')}</th><th>{t('Service')}</th><th>{t('Sender')}</th><th>{t('Recipient')}</th><th>{t('Status')}</th><th>{t('Provider ref')}</th><th>{t('Charge')}</th><th /></tr></thead><tbody>
            {rows.map((m) => (
              <tr key={m.id}><td>{dt(m.createdAt)}</td><td><Link className="underline" href={`/admin/customers/${m.tenant.id}`}>{m.tenant.name}</Link></td><td>{SERVICE_LABEL[m.service]}</td><td className="break-all">{m.senderLabel ?? '—'}</td><td className="break-all">{m.recipient}</td>
                <td><StatusBadge s={m.status} />{m.errorMessage && <div className="text-xs" style={{ color: 'var(--muted)' }}>{m.errorMessage}</div>}</td><td className="break-all text-xs">{m.providerMessageId ?? '—'}</td><td>{fmtMoney(m.charge)}</td>
                <td>{fin && !m.charge.isZero() && <form action={refundMessageAction}><input type="hidden" name="messageId" value={m.id} /><ConfirmButton className="btn btn-ghost btn-sm" message={t('Refund this charge?')}>{t('Refund')}</ConfirmButton></form>}</td></tr>))}
          </tbody></table></div>)}
        <div className="flex gap-2 mt-4">
          {page > 1 && <Link className="btn btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page - 1) })}`}>←</Link>}
          {page * 30 < total && <Link className="btn btn-ghost btn-sm" href={`?${new URLSearchParams({ ...(searchParams as any), page: String(page + 1) })}`}>→</Link>}
        </div>
      </Card>
    </>
  );
}
