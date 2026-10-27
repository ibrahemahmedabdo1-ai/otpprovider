import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getT } from '@/lib/i18n';

export const metadata: Metadata = {
  title: { default: 'OTPProvider — Verification infrastructure', template: '%s · OTPProvider' },
  description: 'Email OTP, WhatsApp OTP and email validation through one API.',
};

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const { lang, dir } = getT();
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <div className="mesh" aria-hidden />
        {children}
      </body>
    </html>
  );
}
