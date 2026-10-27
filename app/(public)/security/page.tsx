import type { Metadata } from 'next';
import { getT } from '@/lib/i18n';
import { Card } from '@/components/ui';

export const metadata: Metadata = { title: 'Security' };

export default function Security() {
  const { t } = getT();
  const items = [
    ['API keys', 'Stored only as SHA-256 hashes and shown once at creation. Revocation takes effect immediately.'],
    ['OTP codes', 'Stored only as keyed hashes, never in readable form, with attempt limits and expiry.'],
    ['Secrets', 'Provider keys and gateway sessions are encrypted at rest (AES-256-GCM) and never sent to the browser.'],
    ['Staff access', 'Role-based permissions enforced on the server. Admin, Finance and Super Admin accounts require two-factor authentication.'],
    ['Tenant isolation', 'Every query is scoped to the authenticated tenant. Support staff cannot change balances or read secrets.'],
    ['Financial integrity', 'Wallet changes are ledger entries written atomically under a row lock, idempotent per message. Corrections are reversals, never edits.'],
    ['Auditability', 'Sensitive actions and security events are recorded in an append-only audit log.'],
    ['Transport', 'HTTPS only with HSTS, frame denial and strict content-type headers.'],
  ];
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">{t('Security')}</h1>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">{items.map(([h, d]) => (<Card key={h}><h2 className="font-semibold">{t(h)}</h2><p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t(d)}</p></Card>))}</div>
    </div>
  );
}
