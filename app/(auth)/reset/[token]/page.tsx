import { resetAction } from '@/app/actions/auth';
import { Field, Flash } from '@/components/ui';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'New password' };

export default function Reset({ params, searchParams }: { params: { token: string }; searchParams: { err?: string } }) {
  const { t } = getT();
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{t('Choose a new password')}</h1>
      <Flash err={searchParams.err} />
      <form action={resetAction} className="space-y-4">
        <input type="hidden" name="token" value={params.token} />
        <Field label={t('New password')}><input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
        <button className="btn btn-primary w-full">{t('Update password')}</button>
      </form>
    </>
  );
}
