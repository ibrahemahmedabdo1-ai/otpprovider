import type { ReactNode } from 'react';
import { Shell, type NavItem } from '@/components/Shell';
import { requireUser } from '@/lib/auth';

export default async function SupportLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser({ perm: 'tickets.handle' });
  const nav: NavItem[] = [{ href: '/support', label: 'Support desk', icon: '💬' }];
  if (user.role !== 'SUPPORT') nav.push({ href: '/admin', label: 'Admin', icon: '🛡️' });
  return <Shell nav={nav} user={user} area="Support workspace">{children}</Shell>;
}
