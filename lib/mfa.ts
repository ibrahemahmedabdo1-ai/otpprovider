import { authenticator } from 'otplib';
import { db } from './db';
import { encrypt, decrypt } from './crypto';

/** Returns the user's pending/active TOTP secret, creating it on first use. Never exposed as a server action. */
export async function getOrCreateMfaSecret(userId: string): Promise<string> {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.mfaSecretEnc) return decrypt(u.mfaSecretEnc);
  const secret = authenticator.generateSecret();
  await db.user.update({ where: { id: userId }, data: { mfaSecretEnc: encrypt(secret) } });
  return secret;
}
