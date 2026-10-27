import Link from 'next/link';
import { registerAction } from '@/app/actions/auth';
import { Field, Flash } from '@/components/ui';
import { getT } from '@/lib/i18n';

export const metadata = { title: 'Create account' };

export default function Register({ searchParams }: { searchParams: { err?: string } }) {
  const { t } = getT();
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">{t('Create your account')}</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>{t('Start sending verification codes in minutes')}</p>
      <Flash err={searchParams.err} />
      <form action={registerAction} className="space-y-4">
        <Field label={t('Full name')}><input className="input" name="name" required minLength={2} autoComplete="name" /></Field>
        <Field label={t('Company (optional)')}><input className="input" name="company" autoComplete="organization" /></Field>
        <Field label={t('Email')}><input className="input" name="email" type="email" required autoComplete="email" /></Field>
        <Field label={t('Password')} hint={t('At least 10 characters with upper case, lower case and a digit')}><input className="input" name="password" type="password" required minLength={10} autoComplete="new-password" /></Field>
        <label className="flex gap-2 text-sm items-start"><input type="checkbox" name="accept" required className="mt-1" />
          <span>{t('I agree to the')} <Link className="underline" href="/terms">{t('Terms')}</Link>, <Link className="underline" href="/privacy">{t('Privacy')}</Link> & <Link className="underline" href="/acceptable-use">{t('Acceptable use')}</Link></span></label>
        <button className="btn btn-primary w-full">{t('Create account')}</button>
      </form>
      <p className="text-sm mt-5 text-center" style={{ color: 'var(--muted)' }}><Link href="/login">{t('Already have an account? Sign in')}</Link></p>
    </>
  );
}
