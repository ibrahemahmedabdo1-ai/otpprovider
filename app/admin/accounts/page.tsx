import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { can, creatableRoles } from '@/lib/rbac';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash } from '@/components/ui';
import { Reveal } from '@/components/Reveal';
import { createAccountAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create accounts' };

const DESC: Record<string, string> = {
  SUPER_ADMIN: 'Full control, including staff and platform settings',
  ADMIN: 'Operations: customers, services, WhatsApp, email, packages',
  FINANCE: 'Payments, wallet adjustments and refunds',
  SUPPORT: 'Tickets and customer assistance (no financial or secret access)',
  CLIENT: 'A customer with a wallet, API keys and dashboard',
};

export default async function Accounts({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { user } = await requireUser({ perm: 'accounts.create' });
  const { t } = getT();
  const pkgs = await db.package.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
  const roles = creatableRoles(user.role);
  return (
    <>
      <PageHead title={t('Create accounts')} sub={t('Create any account type. A one-time temporary password is generated and must be changed at first sign-in.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Reveal />
      <Card className="max-w-2xl">
        <form action={createAccountAction} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Full name')}><input className="input" name="name" required minLength={2} /></Field>
          <Field label={t('Email')}><input className="input" name="email" type="email" required /></Field>
          <Field label={t('Account type')} hint={t('Pick a type to see what it can do')}>
            <select className="input" name="role" defaultValue="CLIENT">{roles.map((r) => <option key={r} value={r}>{r} — {DESC[r]}</option>)}</select>
          </Field>
          <Field label={t('Company (customers only)')}><input className="input" name="company" /></Field>
          <Field label={t('Package (customers only)')}><select className="input" name="packageId"><option value="">—</option>{pkgs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          {can(user, 'finance.write') && <Field label={t('Initial credit USD (customers only)')}><input className="input" name="credit" type="number" min={0} step="0.01" defaultValue={0} /></Field>}
          <div className="sm:col-span-2"><button className="btn btn-primary">{t('Create account')}</button></div>
        </form>
      </Card>
    </>
  );
}
