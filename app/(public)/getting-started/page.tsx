import Link from 'next/link';
import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Getting started' };

export default function GettingStarted() {
  const { t } = getT();
  const steps = [
    ['Create an account', 'Register, then sign in. Your account is activated by the platform according to its policy.'],
    ['Top up your wallet', 'Open Wallet and submit a top-up request. Credit appears after a team member confirms the payment.'],
    ['Create an API key', 'In API keys, create a key. Copy it immediately: it is shown only once.'],
    ['Send your first code', 'Call the send endpoint, then verify the code with the request id you received.'],
  ];
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">{t('Getting started')}</h1>
      {steps.map(([h, d], i) => (<Card key={h}><div className="flex gap-4"><div className="w-8 h-8 rounded-full grid place-items-center font-bold btn-primary shrink-0">{i + 1}</div><div><h2 className="font-semibold">{t(h)}</h2><p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t(d)}</p></div></div></Card>))}
      <div className="flex gap-3"><Link href="/register" className="btn btn-primary">{t('Create account')}</Link><Link href="/docs" className="btn btn-ghost">{t('API Docs')}</Link></div>
    </div>
  );
}
