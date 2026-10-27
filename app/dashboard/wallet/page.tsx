import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Empty, Flash, StatusBadge, Stat, dt } from '@/components/ui';
import { topupRequestAction, cancelTopupAction } from '@/app/actions/customer';
import { fmtMoney } from '@/lib/ledger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wallet & billing' };

export default async function Wallet({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { tenant } = await requireClient();
  const { t } = getT();
  const [ledger, topups, pkgs, wallet] = await Promise.all([
    db.ledgerEntry.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.topupRequest.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.package.findMany({ where: { active: true, custom: false }, orderBy: { sortOrder: 'asc' } }),
    db.setting.findUnique({ where: { key: 'payment_instructions' } }),
  ]);
  const pending = topups.filter((x) => x.status === 'PENDING').reduce((a, x) => a + Number(x.amount), 0);
  return (
    <>
      <PageHead title={t('Wallet & billing')} sub={t('Prepaid balance. Every change is a ledger entry that cannot be edited.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Stat label={t('Available balance')} value={fmtMoney(tenant.balance)} />
        <Stat label={t('Pending top-ups')} value={fmtMoney(pending)} sub={t('Not usable until confirmed')} />
        <Stat label={t('Plan')} value={tenant.package?.name ?? '—'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Card>
          <h2 className="font-semibold mb-2">{t('Request a top-up')}</h2>
          {typeof wallet?.value === 'string' && wallet.value && <p className="text-sm mb-3 whitespace-pre-line" style={{ color: 'var(--muted)' }}>{wallet.value as string}</p>}
          <form action={topupRequestAction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Amount (USD)')}><input className="input" type="number" name="amount" min={1} step="0.01" required /></Field>
              <Field label={t('Method')}><select className="input" name="method"><option value="USDT">USDT</option><option value="BANK_TRANSFER">{t('Bank transfer')}</option><option value="OTHER">{t('Other')}</option></select></Field>
            </div>
            <Field label={t('Transaction reference / hash')}><input className="input" name="reference" maxLength={200} /></Field>
            <Field label={t('Note')}><input className="input" name="note" maxLength={500} /></Field>
            <button className="btn btn-primary">{t('Send request')}</button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold mb-2">{t('Available packages')}</h2>
          {pkgs.length === 0 ? <Empty text={t('Contact support for a plan.')} /> : (
            <ul className="space-y-2 text-sm">{pkgs.map((p) => <li key={p.id} className="flex justify-between"><span>{p.name}</span><span>${p.priceUsd.toString()} · {p.emailQuota} email · {p.whatsappQuota} WA · {p.validationQuota} val</span></li>)}</ul>)}
          <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>{t('To change plan, open a support ticket. Plans are assigned by our team after payment.')}</p>
        </Card>
      </div>
      <Card className="mb-4">
        <h2 className="font-semibold mb-3">{t('Top-up requests')}</h2>
        {topups.length === 0 ? <Empty text={t('No requests.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Date')}</th><th>{t('Amount')}</th><th>{t('Method')}</th><th>{t('Reference')}</th><th>{t('Status')}</th><th /></tr></thead><tbody>
            {topups.map((x) => <tr key={x.id}><td>{dt(x.createdAt)}</td><td>${x.amount.toString()}</td><td>{x.method}</td><td className="break-all">{x.reference ?? '—'}</td><td><StatusBadge s={x.status} /></td>
              <td>{x.status === 'PENDING' && <form action={cancelTopupAction}><input type="hidden" name="id" value={x.id} /><button className="btn btn-ghost btn-sm">{t('Cancel')}</button></form>}</td></tr>)}
          </tbody></table></div>)}
      </Card>
      <Card>
        <h2 className="font-semibold mb-3">{t('Transaction ledger')}</h2>
        {ledger.length === 0 ? <Empty text={t('No transactions yet.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Date')}</th><th>{t('Type')}</th><th>{t('Amount')}</th><th>{t('Balance after')}</th><th>{t('Details')}</th></tr></thead><tbody>
            {ledger.map((x) => <tr key={x.id}><td>{dt(x.createdAt)}</td><td>{x.type}</td><td style={{ color: x.amount.isNegative() ? 'var(--bad)' : 'var(--ok)' }}>{fmtMoney(x.amount, 6)}</td><td>{fmtMoney(x.balanceAfter, 6)}</td><td className="break-all">{x.reason ?? x.requestId ?? '—'}</td></tr>)}
          </tbody></table></div>)}
      </Card>
    </>
  );
}
