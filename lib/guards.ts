import { redirect } from 'next/navigation';
import { requireUser } from './auth';
import { db } from './db';

/** Customer pages/actions: always scoped to the signed-in user's own tenant. */
export async function requireClient() {
  const { user, session } = await requireUser({ roles: ['CLIENT'] });
  if (!user.tenantId) redirect('/login');
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: user.tenantId }, include: { package: true } });
  return { user, session, tenant };
}
