import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Privacy' };

const SECTIONS: [string, string][] = [
  ['Data we process', 'Account details, API usage, message metadata (sender, recipient, status) and support conversations.'],
  ['OTP codes', 'OTP codes are stored only as keyed hashes and expire automatically.'],
  ['Retention', 'Records are kept as needed to operate the service, bill accurately and meet legal duties.'],
  ['Your rights', 'You may request access, correction or closure of your account through support.'],
];

export default function Page() {
  const { t } = getT();
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">{t('Privacy')}</h1>
      <p className="text-sm mt-2 p-3 rounded-xl" style={{ background: 'var(--border)', color: 'var(--muted)' }}>{t('Template text provided with the software. Have it reviewed by a lawyer and add your company details before going live.')}</p>
      <div className="space-y-5 mt-6">{SECTIONS.map(([h, b]) => (<section key={h}><h2 className="font-semibold text-lg">{t(h)}</h2><p className="mt-1" style={{ color: 'var(--muted)' }}>{t(b)}</p></section>))}</div>
    </div>
  );
}
