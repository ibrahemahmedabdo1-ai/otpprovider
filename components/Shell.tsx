import Link from 'next/link';
import type { ReactNode } from 'react';
import { LANGS } from '@/lib/i18n';
import { getT } from '@/lib/i18n';
import { LangSwitcher, ThemeToggle } from './Client';
import { logoutAction } from '@/app/actions/auth';

export type NavItem = { href: string; label: string; icon: string };

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-extrabold text-lg">
      <span className="grid place-items-center w-8 h-8 rounded-xl text-white" style={{ background: 'linear-gradient(135deg,var(--accent),#7c3aed)' }}>◈</span>
      <span>OTP<span className="grad-text">Provider</span></span>
    </Link>
  );
}

export function Shell({ nav, user, area, children }: { nav: NavItem[]; user: { name: string; email: string; role: string }; area: string; children: ReactNode }) {
  const { lang, t } = getT();
  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-64 md:min-h-screen md:sticky md:top-0 md:h-screen p-3 md:p-4 md:overflow-y-auto">
        <div className="card p-3 md:p-4 md:h-full flex md:flex-col gap-3">
          <div className="hidden md:block px-1 pb-2"><Brand href="/" /><div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{t(area)}</div></div>
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible flex-1" aria-label="Main">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap hover:bg-[var(--border)] transition-colors">
                <span aria-hidden>{n.icon}</span><span>{t(n.label)}</span>
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs px-1"><div className="font-semibold truncate">{user.name}</div><div className="truncate" style={{ color: 'var(--muted)' }}>{user.email} · {user.role}</div></div>
            <div className="flex gap-2 items-center"><ThemeToggle /><LangSwitcher current={lang} langs={[...LANGS]} /></div>
            <form action={logoutAction}><button className="btn btn-ghost btn-sm w-full">{t('Sign out')}</button></form>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto min-w-0">
        <div className="md:hidden flex items-center gap-2 mb-4 justify-between"><ThemeToggle /><LangSwitcher current={lang} langs={[...LANGS]} />
          <form action={logoutAction}><button className="btn btn-ghost btn-sm">{t('Sign out')}</button></form></div>
        {children}
      </main>
    </div>
  );
}

export function PublicNav() {
  const { lang, t } = getT();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Brand />
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Public">
          <Link href="/#services">{t('Services')}</Link>
          <Link href="/pricing">{t('Pricing')}</Link>
          <Link href="/docs">{t('API Docs')}</Link>
          <Link href="/status">{t('Status')}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle /><LangSwitcher current={lang} langs={[...LANGS]} />
          <Link href="/login" className="btn btn-ghost btn-sm">{t('Sign in')}</Link>
          <Link href="/register" className="btn btn-primary btn-sm hidden sm:inline-flex">{t('Get started')}</Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const { t } = getT();
  return (
    <footer className="border-t mt-20" style={{ borderColor: 'var(--border)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap gap-4 justify-between text-sm" style={{ color: 'var(--muted)' }}>
        <div>© {new Date().getUTCFullYear()} OTPProvider</div>
        <div className="flex gap-4 flex-wrap">
          <Link href="/terms">{t('Terms')}</Link><Link href="/privacy">{t('Privacy')}</Link><Link href="/acceptable-use">{t('Acceptable use')}</Link>
          <Link href="/security">{t('Security')}</Link><Link href="/contact">{t('Contact')}</Link>
        </div>
      </div>
    </footer>
  );
}
