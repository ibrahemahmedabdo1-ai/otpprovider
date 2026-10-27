import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Empty, StatusBadge, dt } from '@/components/ui';
import { SERVICE_LABEL } from '@/lib/services';
import { fmtMoney } from '@/lib/ledger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Message history' };
const PAGE = 25;

export default async function Messages({ searchParams }: { searchParams: { service?: string; status?: string; q?: string; page?: string } }) {
  const { tenant } = await requireClient();
  const { t } = getT();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where: any = { tenantId: tenant.id };
  if (['EMAIL_OTP', 'WHATSAPP_OTP'].includes(searchParams.service ?? '')) where.service = searchParams.service;
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) where.OR = [{ recipient: { contains: searchParams.q, mode: 'insensitive' } }, { id: { contains: searchParams.q } }];
  const [rows, total] = await Promise.all([db.messageRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE, skip: (page - 1) * PAGE }), db.messageRequest.count({ where })]);
  const qs = (p: number) => new URLSearchParams({ ...(searchParams as Record<string, string>), page: String(p) }).toString();
  return (
    <>
      <PageHead title={t('Message history')} sub={t('Only your own requests are shown. OTP codes are never stored in readable form.')}
        actions={<a className="btn btn-ghost btn-sm" href="/dashboard/messages/export">{t('Export CSV')}</a>} />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-4 items-end">
          <input className="input" name="q" placeholder={t('Search recipient or request ID')} defaultValue={searchParams.q} />
          <select className="input" name="service" defaultValue={searchParams.service ?? ''}><option value="">{t('All services')}</option><option value="EMAIL_OTP">Email OTP</option><option value="WHATSAPP_OTP">WhatsApp OTP</option></select>
          <select className="input" name="status" defaultValue={searchParams.status ?? ''}><option value="">{t('All statuses')}</option>{['QUEUED', 'PROCESSING', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'REJECTED', 'FAILED', 'EXPIRED', 'UNKNOWN_OUTCOME'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-primary">{t('Filter')}</button>
        </form>
      </Card>
      <Card>
        {rows.length === 0 ? <Empty text={t('Nothing here yet.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>ID</th><th>{t('Time')}</th><th>{t('Service')}</th><th>{t('Sender')}</th><th>{t('Recipient')}</th><th>{t('Status')}</th><th>{t('Error')}</th><th>{t('Charge')}</th></tr></thead><tbody>
            {rows.map((m) => (
              <tr key={m.id}><td><code className="text-xs">{m.id}</code></td><td>{dt(m.createdAt)}</td><td>{SERVICE_LABEL[m.service]}</td>
                <td className="break-all">{m.senderLabel ?? '—'}</td><td className="break-all">{m.recipient}</td><td><StatusBadge s={m.status} /></td>
                <td>{m.errorCode ?? '—'}</td><td>{fmtMoney(m.charge)}</td></tr>))}
          </tbody></table></div>)}
        <div className="flex justify-between items-center mt-4 text-sm">
          <span style={{ color: 'var(--muted)' }}>{total} {t('records')}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn btn-ghost btn-sm" href={`?${qs(page - 1)}`}>←</Link>}
            {page * PAGE < total && <Link className="btn btn-ghost btn-sm" href={`?${qs(page + 1)}`}>→</Link>}
          </div>
        </div>
      </Card>
    </>
  );
}
