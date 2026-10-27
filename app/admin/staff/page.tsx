import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Flash, StatusBadge, Badge, dt } from '@/components/ui';
import { Reveal } from '@/components/Reveal';
import { ConfirmButton } from '@/components/Client';
import { setUserStatusAction, resetPasswordAction, resetMfaAction, setExtraPermsAction } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff' };
const EXTRA = ['finance.read', 'customers.write', 'tickets.handle', 'audit.read'];

export default async function Staff({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { user: me } = await requireUser({ perm: 'staff.manage' });
  const { t } = getT();
  const staff = await db.user.findMany({ where: { role: { not: 'CLIENT' } }, orderBy: { createdAt: 'asc' } });
  return (
    <>
      <PageHead title={t('Staff')} sub={t('Create staff from "Create accounts". Admins, Finance and Super Admins must use 2FA.')} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Reveal />
      <div className="space-y-3">
        {staff.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div><div className="font-semibold">{s.name} <Badge>{s.role}</Badge></div><div className="text-sm" style={{ color: 'var(--muted)' }}>{s.email} · {t('created')} {dt(s.createdAt)}</div></div>
              <div className="flex items-center gap-2"><StatusBadge s={s.status} />{s.mfaEnabled ? <Badge tone="ok">2FA</Badge> : <Badge tone="warn">no 2FA</Badge>}</div>
            </div>
            {s.id !== me.id && (
              <div className="flex flex-wrap gap-2 items-center">
                <form action={setUserStatusAction}><input type="hidden" name="userId" value={s.id} /><input type="hidden" name="status" value={s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'} /><ConfirmButton className="btn btn-ghost btn-sm" message="OK?">{s.status === 'ACTIVE' ? t('Suspend') : t('Activate')}</ConfirmButton></form>
                <form action={resetPasswordAction}><input type="hidden" name="userId" value={s.id} /><ConfirmButton className="btn btn-ghost btn-sm" message={t('Reset password?')}>{t('Reset password')}</ConfirmButton></form>
                <form action={resetMfaAction}><input type="hidden" name="userId" value={s.id} /><ConfirmButton className="btn btn-ghost btn-sm" message={t('Reset 2FA?')}>{t('Reset 2FA')}</ConfirmButton></form>
                {s.role !== 'SUPER_ADMIN' && (
                  <form action={setExtraPermsAction} className="flex flex-wrap gap-3 items-center text-xs"><input type="hidden" name="userId" value={s.id} />
                    {EXTRA.map((p) => <label key={p} className="flex gap-1"><input type="checkbox" name="perms" value={p} defaultChecked={s.extraPerms.includes(p)} />{p}</label>)}
                    <button className="btn btn-ghost btn-sm">{t('Save extra permissions')}</button></form>)}
              </div>)}
          </Card>))}
      </div>
    </>
  );
}
