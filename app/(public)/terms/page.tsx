import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Terms' };

const SECTIONS: [string, string][] = [
  ['Service', 'The platform provides Email OTP, WhatsApp OTP and email validation through an API and dashboards. Availability depends on third-party providers and linked devices and is not guaranteed.'],
  ['Accounts', 'You are responsible for activity under your account and for keeping API keys and passwords secret.'],
  ['Payments', 'Services are prepaid. Charges follow the billing rule shown on the pricing page. Corrections are made by ledger reversal.'],
  ['Suspension', 'We may suspend accounts that breach these terms or the acceptable-use policy.'],
  ['Liability', 'The service is provided as is. Delivery of messages depends on providers and recipients and cannot be guaranteed.'],
];

export default function Page() {
  const { t } = getT();
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">{t('Terms')}</h1>
      <p className="text-sm mt-2 p-3 rounded-xl" style={{ background: 'var(--border)', color: 'var(--muted)' }}>{t('Template text provided with the software. Have it reviewed by a lawyer and add your company details before going live.')}</p>
      <div className="space-y-5 mt-6">{SECTIONS.map(([h, b]) => (<section key={h}><h2 className="font-semibold text-lg">{t(h)}</h2><p className="mt-1" style={{ color: 'var(--muted)' }}>{t(b)}</p></section>))}</div>
    </div>
  );
}
