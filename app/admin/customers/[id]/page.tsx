import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash, StatusBadge, Empty, Stat, dt } from '@/components/ui';
import { Reveal } from '@/components/Reveal';
import { ConfirmButton } from '@/components/Client';
import { fmtMoney } from '@/lib/ledger';
import { SERVICE_LABEL } from '@/lib/services';
import { updateCustomerAction, setUserStatusAction, resetPasswordAction, adjustWalletAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function CustomerDetail({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const { user: me } = await requireUser({ perm: 'customers.read' });
  const { t } = getT();
  const c = await db.tenant.findUnique({ where: { id: params.id }, include: { users: true, package: true } });
  if (!c) notFound();
  const owner = c.users[0];
  const [pkgs, devices, senders, support, msgs, ledger, keys, tickets, audits] = await Promise.all([
    db.package.findMany({ orderBy: { sortOrder: 'asc' } }), db.whatsAppDevice.findMany(), db.emailSender.findMany({ where: { active: true } }),
    db.user.findMany({ where: { role: { in: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' }, select: { id: true, name: true, role: true } }),
    db.messageRequest.findMany({ where: { tenantId: c.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    db.ledgerEntry.findMany({ where: { tenantId: c.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    db.apiKey.findMany({ where: { tenantId: c.id }, orderBy: { createdAt: 'desc' } }),
    db.ticket.findMany({ where: { tenantId: c.id }, orderBy: { updatedAt: 'desc' }, take: 5 }),
    can(me, 'audit.read') ? db.auditLog.findMany({ where: { OR: [{ target: c.id }, ...(owner ? [{ target: owner.id }] : [])] }, orderBy: { createdAt: 'desc' }, take: 10 }) : Promise.resolve([]),
  ]);
  const ov = (c.serviceOverrides ?? {}) as Record<string, boolean>;
  const po = (c.priceOverrides ?? {}) as Record<string, string>;
  const fin = can(me, 'finance.write');
  const write = can(me, 'customers.write');
  const sel = (k: string) => (ov[k] === true ? 'on' : ov[k] === false ? 'off' : '');
  return (
    <>
      <PageHead title={c.name} sub={`${owner?.email ?? ''} · ID ${c.id}`} actions={<StatusBadge s={c.status} />} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Reveal />
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Stat label={t('Balance')} value={fmtMoney(c.balance)} />
        <Stat label={t('Email verified')} value={owner?.emailVerified ? t('Yes') : t('No')} />
        <Stat label="2FA" value={owner?.mfaEnabled ? t('On') : t('Off')} />
      </div>
      {write && owner && (
        <Card className="mb-4">
          <h2 className="font-semibold mb-3">{t('Account control')}</h2>
          <div className="flex flex-wrap gap-2">
            {(['ACTIVE', 'RESTRICTED', 'SUSPENDED', 'CLOSED'] as const).filter((s) => s !== c.status).map((s) => (
              <form key={s} action={setUserStatusAction}><input type="hidden" name="userId" value={owner.id} /><input type="hidden" name="status" value={s} />
                <ConfirmButton className={`btn btn-sm ${s === 'ACTIVE' ? 'btn-ok' : s === 'RESTRICTED' ? 'btn-ghost' : 'btn-danger'}`} message={`${s}?`}>{s === 'ACTIVE' ? t('Activate') : s === 'RESTRICTED' ? t('Restrict') : s === 'SUSPENDED' ? t('Suspend') : t('Close')}</ConfirmButton></form>))}
            <form action={resetPasswordAction}><input type="hidden" name="userId" value={owner.id} /><ConfirmButton className="btn btn-ghost btn-sm" message={t('Generate a new temporary password and sign the user out everywhere?')}>{t('Reset password')}</ConfirmButton></form>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{t('Suspension signs the customer out and blocks API requests immediately.')}</p>
        </Card>)}
      {write && (
        <Card className="mb-4">
          <h2 className="font-semibold mb-3">{t('Configuration & overrides')}</h2>
          <form action={updateCustomerAction} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="tenantId" value={c.id} />
            <Field label={t('Customer name')}><input className="input" name="name" defaultValue={c.name} /></Field>
            <Field label={t('Package')}><select className="input" name="packageId" defaultValue={c.packageId ?? ''}><option value="">—</option>{pkgs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label={t('Assigned support')}><select className="input" name="assignedSupportId" defaultValue={c.assignedSupportId ?? ''}><option value="">—</option>{support.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}</select></Field>
            <Field label={t('Pinned WhatsApp device')}><select className="input" name="pinnedDeviceId" defaultValue={c.pinnedDeviceId ?? ''}><option value="">{t('Shared pool')}</option>{devices.map((d) => <option key={d.id} value={d.id}>{d.label} {d.phone ?? ''}</option>)}</select></Field>
            <Field label={t('Pinned email sender')}><select className="input" name="senderId" defaultValue={c.senderId ?? ''}><option value="">{t('Shared pool')}</option>{senders.map((s) => <option key={s.id} value={s.id}>{s.address}</option>)}</select></Field>
            {fin && <label className="flex gap-2 items-end pb-2 text-sm"><input type="checkbox" name="allowNegative" defaultChecked={c.allowNegative} /> {t('Allow negative balance (credit)')}</label>}
            {(['EMAIL_OTP', 'WHATSAPP_OTP', 'EMAIL_VALIDATION'] as const).map((k) => (
              <Field key={k} label={`${SERVICE_LABEL[k]}`}>
                <select className="input" name={`svc_${k}`} defaultValue={sel(k)}><option value="">{t('Follow global')}</option><option value="on">{t('Force enabled')}</option><option value="off">{t('Force disabled')}</option></select>
                {fin && <input className="input mt-2" name={`price_${k}`} placeholder={t('Custom unit price (USD)')} defaultValue={po[k] ?? ''} />}
              </Field>))}
            <div className="md:col-span-3"><Field label={t('Internal note (staff only)')}><textarea className="input" name="adminNote" rows={2} defaultValue={c.adminNote ?? ''} /></Field></div>
            <div><button className="btn btn-primary">{t('Save')}</button></div>
          </form>
        </Card>)}
      {fin && (
        <Card className="mb-4">
          <h2 className="font-semibold mb-3">{t('Wallet adjustment')}</h2>
          <form action={adjustWalletAction} className="grid gap-3 md:grid-cols-4 items-end">
            <input type="hidden" name="tenantId" value={c.id} />
            <Field label={t('Amount (+ credit / − debit)')}><input className="input" name="amount" type="number" step="0.01" required /></Field>
            <div className="md:col-span-2"><Field label={t('Reason (required)')}><input className="input" name="reason" required minLength={5} /></Field></div>
            <ConfirmButton className="btn btn-primary" message={t('Create this ledger entry?')}>{t('Apply')}</ConfirmButton>
          </form>
        </Card>)}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="font-semibold mb-3">{t('Recent requests')}</h2>
          {msgs.length === 0 ? <Empty text="—" /> : <ul className="space-y-1 text-sm">{msgs.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="break-all">{SERVICE_LABEL[m.service]} → {m.recipient}</span><StatusBadge s={m.status} /></li>)}</ul>}</Card>
        <Card><h2 className="font-semibold mb-3">{t('Ledger')}</h2>
          {ledger.length === 0 ? <Empty text="—" /> : <ul className="space-y-1 text-sm">{ledger.map((l) => <li key={l.id} className="flex justify-between"><span>{l.type} <span style={{ color: 'var(--muted)' }}>{dt(l.createdAt)}</span></span><span>{fmtMoney(l.amount, 6)}</span></li>)}</ul>}</Card>
        <Card><h2 className="font-semibold mb-3">{t('API keys')} ({t('secrets are never shown')})</h2>
          {keys.length === 0 ? <Empty text="—" /> : <ul className="space-y-1 text-sm">{keys.map((k) => <li key={k.id} className="flex justify-between"><span>{k.label} <code>{k.prefix}…</code></span><span>{k.revokedAt ? t('Revoked') : dt(k.lastUsedAt)}</span></li>)}</ul>}</Card>
        <Card><h2 className="font-semibold mb-3">{t('Tickets')}</h2>
          {tickets.length === 0 ? <Empty text="—" /> : <ul className="space-y-1 text-sm">{tickets.map((x) => <li key={x.id} className="flex justify-between"><a className="underline" href={`/support/${x.id}`}>{x.subject}</a><StatusBadge s={x.status} /></li>)}</ul>}</Card>
        {audits.length > 0 && <Card className="lg:col-span-2"><h2 className="font-semibold mb-3">{t('Audit history')}</h2><ul className="space-y-1 text-sm">{audits.map((a) => <li key={a.id} className="flex justify-between"><span>{a.action}</span><span style={{ color: 'var(--muted)' }}>{dt(a.createdAt)}</span></li>)}</ul></Card>}
      </div>
    </>
  );
}
