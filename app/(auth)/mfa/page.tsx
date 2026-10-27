import { mfaVerifyAction } from '@/app/actions/auth';
import { requireSessionOnly } from '@/lib/auth';
import { Field, Flash } from '@/components/ui';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Two-factor' };

export default async function Mfa({ searchParams }: { searchParams: { err?: string } }) {
  await requireSessionOnly();
  const { t } = getT();
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">{t('Two-factor authentication')}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>{t('Enter the 6-digit code from your authenticator app')}</p>
      <Flash err={searchParams.err} />
      <form action={mfaVerifyAction} className="space-y-4">
        <Field label={t('Code')}><input className="input text-center tracking-[.4em] text-lg" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus autoComplete="one-time-code" /></Field>
        <button className="btn btn-primary w-full">{t('Verify')}</button>
      </form>
    </>
  );
}
