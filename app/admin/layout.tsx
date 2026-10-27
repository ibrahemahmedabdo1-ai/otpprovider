import type { ReactNode } from 'react';
import { Shell, type NavItem } from '@/components/Shell';
import { requireUser } from '@/lib/auth';
import { can, isStaff } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();
  if (!isStaff(user.role)) redirect('/dashboard');
  if (user.role === 'SUPPORT') redirect('/support');
  const all: (NavItem & { perm?: any })[] = [
    { href: '/admin', label: 'Overview', icon: '📊' },
    { href: '/admin/customers', label: 'Customers', icon: '👥', perm: 'customers.read' },
    { href: '/admin/accounts', label: 'Create accounts', icon: '➕', perm: 'accounts.create' },
    { href: '/admin/staff', label: 'Staff', icon: '🛡️', perm: 'staff.manage' },
    { href: '/admin/services', label: 'Services', icon: '🎛️', perm: 'services.manage' },
    { href: '/admin/whatsapp', label: 'WhatsApp devices', icon: '📱', perm: 'whatsapp.manage' },
    { href: '/admin/email', label: 'Email providers', icon: '📧', perm: 'email.manage' },
    { href: '/admin/packages', label: 'Packages', icon: '📦', perm: 'packages.manage' },
    { href: '/admin/payments', label: 'Payments', icon: '💰', perm: 'finance.read' },
    { href: '/admin/messages', label: 'Messages', icon: '✉️', perm: 'customers.read' },
    { href: '/support', label: 'Support desk', icon: '💬', perm: 'tickets.handle' },
    { href: '/admin/audit', label: 'Audit log', icon: '📜', perm: 'audit.read' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️', perm: 'settings.manage' },
  ];
  return <Shell nav={all.filter((n) => !n.perm || can(user, n.perm))} user={user} area="Admin control center">{children}</Shell>;
}
