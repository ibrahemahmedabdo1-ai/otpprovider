import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash, StatusBadge, dt } from '@/components/ui';
import { Thread } from '@/components/Thread';
import { staffReplyAction, ticketMetaAction } from '@/app/actions/admin';
import { fmtMoney } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

export default async function StaffTicket({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const { user } = await requireUser({ perm: 'tickets.handle' });
  const { t } = getT();
  const tk = await db.ticket.findUnique({ where: { id: params.id }, include: { messages: { orderBy: { createdAt: 'asc' } }, tenant: { include: { users: { select: { email: true, name: true }, take: 1 } } } } });
  if (!tk) notFound();
  if (user.role === 'SUPPORT' && tk.assignedId && tk.assignedId !== user.id) notFound(); // support only sees unassigned or own tickets
  const [pendingTop, recentMsgs] = await Promise.all([
    db.topupRequest.count({ where: { tenantId: tk.tenantId, status: 'PENDING' } }),
    db.messageRequest.findMany({ where: { tenantId: tk.tenantId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, service: true, status: true, recipient: true, createdAt: true } }),
  ]);
  const op = (name: string, label: string, cls = 'btn-ghost') => (
    <form action={ticketMetaAction}><input type="hidden" name="ticketId" value={tk.id} /><input type="hidden" name="op" value={name} /><button className={`btn btn-sm ${cls}`}>{label}</button></form>);
  return (
    <>
      <PageHead title={tk.subject} sub={`${tk.category} · #${tk.id.slice(-6)} · ${tk.tenant.name}`} actions={<StatusBadge s={tk.status} />} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Thread messages={tk.messages} staffView />
          <Card className="mt-6">
            <form action={staffReplyAction} className="space-y-3"><input type="hidden" name="ticketId" value={tk.id} />
              <Field label={t('Reply')}><textarea className="input" name="body" rows={4} maxLength={5000} /></Field>
              <input className="input" type="file" name="file" accept=".png,.jpg,.jpeg,.pdf,.txt" />
              <label className="flex gap-2 text-sm"><input type="checkbox" name="internal" />{t('Internal note (hidden from the customer)')}</label>
              <button className="btn btn-primary">{t('Send')}</button></form>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold mb-3">{t('Actions')}</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {tk.assignedId === user.id ? op('unassign', t('Unassign')) : op('assign', t('Assign to me'))}
              {op('escalate', t('Escalate'), 'btn-danger')}
              {tk.status === 'RESOLVED' || tk.status === 'CLOSED' ? op('reopen', t('Reopen')) : <>{op('resolve', t('Resolve'), 'btn-ok')}{op('close', t('Close'))}</>}
            </div>
            <form action={ticketMetaAction} className="flex gap-2"><input type="hidden" name="ticketId" value={tk.id} /><input type="hidden" name="op" value="priority" />
              <select className="input" name="priority" defaultValue={tk.priority}>{['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => <option key={p}>{p}</option>)}</select><button className="btn btn-ghost btn-sm">{t('Set')}</button></form>
          </Card>
          <Card>
            <h2 className="font-semibold mb-2">{t('Customer')}</h2>
            <div className="text-sm space-y-1"><div>{tk.tenant.name}</div><div style={{ color: 'var(--muted)' }}>{tk.tenant.users[0]?.email}</div>
              <div><StatusBadge s={tk.tenant.status} /></div>
              {can(user, 'finance.read') && <div>{t('Balance')}: {fmtMoney(tk.tenant.balance)}</div>}
              <div>{t('Pending payment requests')}: {pendingTop}</div>
              {can(user, 'customers.read') && user.role !== 'SUPPORT' && <Link className="underline" href={`/admin/customers/${tk.tenantId}`}>{t('Open customer')}</Link>}</div>
          </Card>
          <Card>
            <h2 className="font-semibold mb-2">{t('Recent activity')}</h2>
            <ul className="space-y-1 text-xs">{recentMsgs.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="break-all">{m.service === 'EMAIL_OTP' ? 'Email' : 'WA'} → {m.recipient}</span><StatusBadge s={m.status} /></li>)}</ul>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{dt(tk.createdAt)}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
