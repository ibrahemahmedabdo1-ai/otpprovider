import Link from 'next/link';
import { forgotAction } from '@/app/actions/auth';
import { Field, Flash } from '@/components/ui';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Reset password' };

export default function Forgot({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { t } = getT();
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">{t('Reset your password')}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>{t('We will email you a reset link')}</p>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <form action={forgotAction} className="space-y-4">
        <Field label={t('Email')}><input className="input" name="email" type="email" required /></Field>
        <button className="btn btn-primary w-full">{t('Send reset link')}</button>
      </form>
      <p className="text-sm mt-5 text-center" style={{ color: 'var(--muted)' }}><Link href="/login">{t('Back to sign in')}</Link></p>
    </>
  );
}
