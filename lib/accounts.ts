import type { Role } from '@prisma/client';
import { db } from './db';
import { hashPassword } from './auth';
import { generatePassword } from './crypto';
import { audit } from './audit';

type Input = {
  email: string; name: string; role: Role; password?: string;
  tenantName?: string; packageId?: string | null; initialCredit?: number;
  status?: 'ACTIVE' | 'PENDING'; createdBy?: { id: string; role: string } | null; forceChange?: boolean;
};

export class DuplicateEmail extends Error {}

/** One path for every account type (public registration and Admin-created accounts of any role). */
export async function createAccount(i: Input) {
  const email = i.email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw new DuplicateEmail();
  const plain = i.password ?? generatePassword(16);
  const passwordHash = await hashPassword(plain);
  const user = await db.$transaction(async (tx) => {
    let tenantId: string | null = null;
    if (i.role === 'CLIENT') {
      const t = await tx.tenant.create({ data: { name: i.tenantName?.trim() || i.name, packageId: i.packageId || null, status: i.status === 'PENDING' ? 'PENDING' : 'ACTIVE' } });
      tenantId = t.id;
    }
    return tx.user.create({
      data: {
        email, name: i.name.trim(), role: i.role, passwordHash, tenantId, status: i.status ?? 'ACTIVE',
        emailVerified: false, mustChangePassword: i.forceChange ?? !i.password, createdById: i.createdBy?.id,
      },
    });
  });
  if (i.initialCredit && i.initialCredit > 0 && user.tenantId && i.createdBy) {
    const { applyLedger } = await import('./ledger');
    await applyLedger({ tenantId: user.tenantId, type: 'ADJUSTMENT', amount: i.initialCredit, reason: 'Initial credit granted at account creation', createdById: i.createdBy.id, ref: `init:${user.id}` });
  }
  await audit(i.createdBy ?? null, 'account.create', user.id, { role: i.role, email }, i.createdBy ? 'admin' : 'security');
  return { user, password: i.password ? null : plain };
}
