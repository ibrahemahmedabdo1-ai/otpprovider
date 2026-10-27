import Link from 'next/link';
import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Contact' };

export default function Contact() {
  const { t } = getT();
  const email = process.env.CONTACT_EMAIL; // shown only when the operator sets a real address
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold">{t('Contact')}</h1>
      <Card>
        <p>{t('Customers get live support from the Support section of their dashboard: every conversation is saved and tracked.')}</p>
        <div className="mt-4 flex gap-3 flex-wrap"><Link href="/login" className="btn btn-primary">{t('Sign in')}</Link><Link href="/register" className="btn btn-ghost">{t('Create account')}</Link></div>
      </Card>
      {email && <Card><div className="label">{t('Email')}</div><a className="underline" href={`mailto:${email}`}>{email}</a></Card>}
    </div>
  );
}
