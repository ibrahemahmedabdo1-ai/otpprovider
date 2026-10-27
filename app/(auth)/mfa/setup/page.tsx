import { authenticator } from 'otplib';
import { mfaSetupAction } from '@/app/actions/auth';
import { getOrCreateMfaSecret } from '@/lib/mfa';
import { requireSessionOnly } from '@/lib/auth';
import { Field, Flash } from '@/components/ui';
import { QrView } from '@/components/Client';
import { getT } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up two-factor' };

export default async function MfaSetup({ searchParams }: { searchParams: { err?: string } }) {
  const s = await requireSessionOnly();
  const { t } = getT();
  const secret = await getOrCreateMfaSecret(s.userId);
  const uri = authenticator.keyuri(s.user.email, 'OTPProvider', secret);
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">{t('Set up two-factor authentication')}</h1>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{t('Required for staff accounts. Scan the QR code with Google Authenticator, Authy or similar.')}</p>
      <Flash err={searchParams.err} />
      <div className="flex justify-center mb-3"><QrView value={uri} /></div>
      <p className="text-xs text-center mb-4 break-all" style={{ color: 'var(--muted)' }}>{t('Manual key')}: <code>{secret}</code></p>
      <form action={mfaSetupAction} className="space-y-4">
        <Field label={t('Code')}><input className="input text-center tracking-[.4em] text-lg" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" /></Field>
        <button className="btn btn-primary w-full">{t('Enable')}</button>
      </form>
    </>
  );
}
