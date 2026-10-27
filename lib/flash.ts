import { redirect } from 'next/navigation';

export function back(path: string, kind: 'ok' | 'err', msg: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}
