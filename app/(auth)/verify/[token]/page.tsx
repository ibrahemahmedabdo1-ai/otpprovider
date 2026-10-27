import Link from 'next/link';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { getT } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Verify email' };

export default async function Verify({ params }: { params: { token: string } }) {
  const { t } = getT();
  const tok = await db.authToken.findUnique({ where: { tokenHash: sha256(params.token) } });
  const ok = !!tok && tok.kind === 'VERIFY_EMAIL' && !tok.usedAt && tok.expiresAt > new Date();
  if (ok) {
    const u = await db.user.update({ where: { id: tok!.userId }, data: { emailVerified: true, status: 'ACTIVE' } });
    if (u.tenantId) await db.tenant.updateMany({ where: { id: u.tenantId, status: 'PENDING' }, data: { status: 'ACTIVE' } });
    await db.authToken.update({ where: { id: tok!.id }, data: { usedAt: new Date() } });
  }
  return (
    <div className="text-center">
      <div className="text-4xl mb-3">{ok ? '✅' : '⚠️'}</div>
      <h1 className="text-xl font-bold mb-2">{ok ? t('Email verified') : t('Link invalid or expired')}</h1>
      <Link href="/login" className="btn btn-primary mt-4">{t('Sign in')}</Link>
    </div>
  );
}
