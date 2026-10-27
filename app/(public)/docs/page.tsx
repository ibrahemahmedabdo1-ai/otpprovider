import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { Card } from '@/components/ui';
import { CopyButton } from '@/components/Client';

export const metadata: Metadata = { title: 'API Docs' };

const BASE = process.env.APP_URL || 'https://otpprovider.com';

function Code({ children }: { children: string }) {
  return (<div className="relative"><div className="absolute top-2 end-2"><CopyButton text={children} /></div><pre dir="ltr" className="card p-4 pe-20 text-xs overflow-x-auto whitespace-pre font-mono">{children}</pre></div>);
}

export default function Docs() {
  const { t } = getT();
  const eps: [string, string, string][] = [
    ['POST', '/api/v1/email-otp/send', 'Body: { "to": "user@example.com", "idempotency_key"?: string }'],
    ['POST', '/api/v1/email-otp/verify', 'Body: { "request_id": "<id from send>", "code": "123456" }'],
    ['POST', '/api/v1/whatsapp-otp/send', 'Body: { "to": "+201234567890", "idempotency_key"?: string }. Returns 202 (queued).'],
    ['POST', '/api/v1/whatsapp-otp/verify', 'Body: { "request_id": "<id>", "code": "123456" }'],
    ['POST', '/api/v1/email-validation/check', 'Body: { "email": "user@example.com" }'],
    ['POST', '/api/v1/email-validation/batch', 'Body: { "emails": [ ... up to the configured batch limit ] }'],
    ['GET', '/api/v1/account', 'Account summary.'],
    ['GET', '/api/v1/account/balance', 'Wallet balance.'],
    ['GET', '/api/v1/account/usage', 'Usage counts per service.'],
    ['GET', '/api/v1/account/transactions', 'Ledger entries.'],
    ['GET', '/api/v1/account/messages', 'Message history. Query: id, limit (max 200).'],
  ];
  return (
    <div className="space-y-8 max-w-3xl">
      <div><h1 className="text-3xl font-bold">{t('API Docs')}</h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>{t('Create an API key in your dashboard and send it as a Bearer token. Keys are shown once.')}</p></div>

      <section><h2 className="text-xl font-semibold mb-2">{t('Authentication')}</h2>
        <Code>{`Authorization: Bearer otp_live_<48 hex characters>`}</Code></section>

      <section><h2 className="text-xl font-semibold mb-2">{t('Send an email OTP')}</h2>
        <Code>{`curl -X POST ${BASE}/api/v1/email-otp/send \\
  -H "Authorization: Bearer $OTP_KEY" -H "Content-Type: application/json" \\
  -d '{"to":"user@example.com","idempotency_key":"signup-8841"}'`}</Code>
        <Code>{`// Node.js
const r = await fetch('${BASE}/api/v1/email-otp/send', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + process.env.OTP_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: 'user@example.com' }),
});
const { data } = await r.json();   // data.id is the request_id used to verify`}</Code>
        <Code>{`# Python
import os, requests
r = requests.post("${BASE}/api/v1/email-otp/send",
    headers={"Authorization": "Bearer " + os.environ["OTP_KEY"]},
    json={"to": "user@example.com"})
print(r.json()["data"]["id"])`}</Code></section>

      <section><h2 className="text-xl font-semibold mb-2">{t('Endpoints')}</h2>
        <Card className="overflow-x-auto"><table className="table"><tbody>
          {eps.map(([m, p, d]) => (<tr key={p}><td><span className="badge b-mute">{m}</span></td><td dir="ltr" className="font-mono text-xs">{p}</td><td style={{ color: 'var(--muted)' }}>{d}</td></tr>))}
        </tbody></table></Card></section>

      <section><h2 className="text-xl font-semibold mb-2">{t('Responses')}</h2>
        <Code>{`// success
{ "success": true, "request_id": "req_…", "data": { … } }
// error
{ "success": false, "request_id": "req_…", "error": { "code": "INSUFFICIENT_BALANCE", "message": "…" } }`}</Code>
        <Card className="overflow-x-auto"><table className="table"><tbody>
          {[['401','UNAUTHENTICATED / INVALID_API_KEY'],['402','INSUFFICIENT_BALANCE'],['403','ACCOUNT_NOT_ACTIVE / SERVICE_NOT_ALLOWED / KEY_SCOPE'],['422','VALIDATION_ERROR / INVALID_PHONE'],['429','RATE_LIMITED'],['502','Provider rejected or the outcome is uncertain: check status before retrying'],['503','SERVICE_DISABLED / MAINTENANCE / NO_PROVIDER']].map(([c, d]) => (<tr key={c}><td className="font-mono">{c}</td><td style={{ color: 'var(--muted)' }}>{d}</td></tr>))}
        </tbody></table></Card></section>

      <section><h2 className="text-xl font-semibold mb-2">{t('Statuses')}</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('QUEUED, PROCESSING, SUBMITTED, SENT, DELIVERED, READ, REJECTED, FAILED, EXPIRED, UNKNOWN_OUTCOME. SUBMITTED means the provider accepted the request, not that it reached the inbox. Only states actually reported by the provider or device are shown.')}</p>
        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{t('Use idempotency_key so a retried request never sends or charges twice. If a request ends in UNKNOWN_OUTCOME, check GET /account/messages before sending again.')}</p></section>
    </div>
  );
}
