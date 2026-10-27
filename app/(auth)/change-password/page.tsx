import { changePasswordAction } from '@/app/actions/auth';
import { requireSessionOnly } from '@/lib/auth';
import { Field, Flash } from '@/components/ui';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Change password' };

export default async function ChangePassword({ searchParams }: { searchParams: { err?: string } }) {
  const s = await requireSessionOnly();
  const { t } = getT();
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">{t('Change your password')}</h1>
      {s.user.mustChangePassword && <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{t('Your account was created by an administrator. Choose your own password to continue.')}</p>}
      <Flash err={searchParams.err} />
      <form action={changePasswordAction} className="space-y-4">
        <Field label={t('Current password')}><input className="input" name="current" type="password" required autoComplete="current-password" /></Field>
        <Field label={t('New password')}><input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
        <button className="btn btn-primary w-full">{t('Update password')}</button>
      </form>
    </>
  );
}
