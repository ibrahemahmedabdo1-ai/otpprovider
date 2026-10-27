import type { ReactNode } from 'react';
import { PublicNav, PublicFooter } from '@/components/Shell';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (<><PublicNav /><main className="max-w-6xl mx-auto px-4 py-10">{children}</main><PublicFooter /></>);
}
