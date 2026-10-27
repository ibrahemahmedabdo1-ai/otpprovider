import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Acceptable use' };

const SECTIONS: [string, string][] = [
  ['Allowed use', 'Sending verification codes to people who requested them, and validating addresses you are entitled to process.'],
  ['Prohibited', 'Spam, phishing, fraud, harassment, unlawful content, or sending to recipients without a legitimate verification purpose.'],
  ['Enforcement', 'We may throttle, suspend or close accounts that violate this policy, without refund of misused balance where the law allows.'],
];

export default function Page() {
  const { t } = getT();
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">{t('Acceptable use')}</h1>
      <p className="text-sm mt-2 p-3 rounded-xl" style={{ background: 'var(--border)', color: 'var(--muted)' }}>{t('Template text provided with the software. Have it reviewed by a lawyer and add your company details before going live.')}</p>
      <div className="space-y-5 mt-6">{SECTIONS.map(([h, b]) => (<section key={h}><h2 className="font-semibold text-lg">{t(h)}</h2><p className="mt-1" style={{ color: 'var(--muted)' }}>{t(b)}</p></section>))}</div>
    </div>
  );
}
