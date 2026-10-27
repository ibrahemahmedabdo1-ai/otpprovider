import Link from 'next/link';
import { getT } from '@/lib/i18n';
import { FadeIn, Float } from '@/components/Client';
import { Card } from '@/components/ui';

export default function Home() {
  const { t } = getT();
  const services = [
    { k: 'Email OTP', d: 'Send one-time codes by email through your verified sender, with per-request tracking of the sender, recipient and status.' },
    { k: 'WhatsApp OTP', d: 'Deliver codes over WhatsApp from linked devices managed by our team, with automatic switching between devices.' },
    { k: 'Email validation', d: 'Check syntax, domain, MX records, disposable and role-based addresses before you send. It never claims a mailbox exists.' },
  ];
  const points = [
    ['Server-side security', 'Hashed API keys, encrypted secrets, mandatory 2FA for staff and strict tenant isolation.'],
    ['Honest billing', 'A prepaid wallet with an append-only ledger. A message is charged once, and refunds are new ledger entries.'],
    ['Real delivery states', 'Accepted is not delivered. We show exactly what the provider confirmed, including uncertain outcomes.'],
    ['Built for the world', 'Seven languages with true right-to-left layout, light and dark themes.'],
  ];
  return (
    <div>
      <section className="grid lg:grid-cols-2 gap-10 items-center py-10">
        <div>
          <FadeIn><span className="badge b-ok"><span className="pulse-dot me-2" />{t('Verification infrastructure')}</span></FadeIn>
          <FadeIn delay={0.08}><h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-4 leading-tight"><span className="grad-text">{t('Start sending verification codes in minutes')}</span></h1></FadeIn>
          <FadeIn delay={0.16}><p className="mt-4 text-lg" style={{ color: 'var(--muted)' }}>{t('One API for Email OTP, WhatsApp OTP and email validation, with a wallet, dashboards and live support built in.')}</p></FadeIn>
          <FadeIn delay={0.24}><div className="mt-7 flex gap-3 flex-wrap"><Link href="/register" className="btn btn-primary">{t('Get started')}</Link><Link href="/docs" className="btn btn-ghost">{t('API Docs')}</Link></div></FadeIn>
        </div>
        <Float>
          <Card className="font-mono text-xs sm:text-sm overflow-x-auto" >
            <div className="flex gap-1.5 mb-3"><i className="w-3 h-3 rounded-full bg-red-400" /><i className="w-3 h-3 rounded-full bg-amber-400" /><i className="w-3 h-3 rounded-full bg-emerald-400" /></div>
            <pre dir="ltr" className="whitespace-pre">{`curl -X POST https://otpprovider.com/api/v1/email-otp/send \\
  -H "Authorization: Bearer otp_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"user@example.com"}'

{ "success": true,
  "request_id": "req_9f2c…",
  "data": { "status": "SUBMITTED" } }`}</pre>
          </Card>
        </Float>
      </section>

      <section id="services" className="py-12">
        <FadeIn><h2 className="text-2xl font-bold mb-6">{t('Services')}</h2></FadeIn>
        <div className="grid md:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <FadeIn key={s.k} delay={i * 0.08}><Card className="h-full hover:-translate-y-1 transition-transform"><h3 className="font-bold text-lg">{t(s.k)}</h3><p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t(s.d)}</p></Card></FadeIn>
          ))}
        </div>
      </section>

      <section className="py-8 grid sm:grid-cols-2 gap-4">
        {points.map(([h, d], i) => (<FadeIn key={h} delay={i * 0.06}><Card><h3 className="font-semibold">{t(h)}</h3><p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t(d)}</p></Card></FadeIn>))}
      </section>
    </div>
  );
}
