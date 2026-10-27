import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { Field, Flash } from '@/components/ui';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Sign in' };

export default function Login({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { t } = getT();
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">{t('Welcome back')}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>{t('Sign in to your account')}</p>
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <form action={loginAction} className="space-y-4">
        <Field label={t('Email')}><input className="input" name="email" type="email" required autoComplete="email" /></Field>
        <Field label={t('Password')}><input className="input" name="password" type="password" required autoComplete="current-password" /></Field>
        <button className="btn btn-primary w-full">{t('Sign in')}</button>
      </form>
      <div className="flex justify-between text-sm mt-5" style={{ color: 'var(--muted)' }}>
        <Link href="/forgot">{t('Forgot password?')}</Link><Link href="/register">{t('Create account')}</Link>
      </div>
    </>
  );
}
