import type { ReactNode } from 'react';
import { Brand } from '@/components/Shell';
import { ThemeToggle, LangSwitcher } from '@/components/Client';
import { LANGS, getT } from '@/lib/i18n';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { lang } = getT();
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6"><Brand /><div className="flex gap-2"><ThemeToggle /><LangSwitcher current={lang} langs={[...LANGS]} /></div></div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
