import type { ReactNode } from 'react';
import { Shell, type NavItem } from '@/components/Shell';
import { requireClient } from '@/lib/guards';

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/keys', label: 'API keys', icon: '🔑' },
  { href: '/dashboard/messages', label: 'Message history', icon: '✉️' },
  { href: '/dashboard/validation', label: 'Email validation', icon: '✅' },
  { href: '/dashboard/wallet', label: 'Wallet & billing', icon: '💳' },
  { href: '/dashboard/senders', label: 'Senders', icon: '📡' },
  { href: '/dashboard/support', label: 'Support', icon: '💬' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default async function DashLayout({ children }: { children: ReactNode }) {
  const { user } = await requireClient();
  return <Shell nav={NAV} user={user} area="Customer dashboard">{children}</Shell>;
}
