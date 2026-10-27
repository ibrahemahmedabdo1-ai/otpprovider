'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}

export function Float({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>{children}</motion.div>;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  return (
    <button className="btn btn-ghost btn-sm" aria-label="Toggle theme" onClick={() => {
      const n = !dark; setDark(n);
      document.documentElement.classList.toggle('dark', n);
      try { localStorage.setItem('theme', n ? 'dark' : 'light'); } catch {}
    }}>{dark ? '☀️' : '🌙'}</button>
  );
}

export function LangSwitcher({ current, langs }: { current: string; langs: { code: string; name: string }[] }) {
  const router = useRouter();
  return (
    <select aria-label="Language" className="input" style={{ width: 'auto', padding: '.3rem .6rem', fontSize: '.75rem' }} value={current}
      onChange={(e) => { document.cookie = `lang=${e.target.value}; path=/; max-age=31536000; samesite=lax`; router.refresh(); }}>
      {langs.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
    </select>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>{done ? '✓' : label}</button>;
}

export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => { const i = setInterval(() => router.refresh(), seconds * 1000); return () => clearInterval(i); }, [router, seconds]);
  return null;
}

/** Renders a QR from the string produced by the real gateway. Nothing is drawn when there is no value. */
export function QrView({ value }: { value: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(value, { margin: 1, width: 280 }).then(setSrc).catch(() => setSrc('')); }, [value]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="WhatsApp pairing QR code" width={280} height={280} className="rounded-xl bg-white p-2" />;
}

export function ConfirmButton({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  return <button className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [a, setA] = useState(tabs[0].id);
  return (
    <div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map((t) => <button key={t.id} onClick={() => setA(t.id)} className={`btn btn-sm ${a === t.id ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>)}
      </div>
      {tabs.find((t) => t.id === a)?.content}
    </div>
  );
}

export function RevealBox({ title, value, note, clear }: { title: string; value: string; note?: string; clear: () => Promise<void> }) {
  useEffect(() => { clear(); }, [clear]);
  return (
    <div className="card p-4 mb-4" style={{ borderColor: 'var(--warn)' }} role="alert">
      <div className="text-sm font-semibold mb-1">{title}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-sm break-all px-2 py-1 rounded-lg" style={{ background: 'var(--border)' }}>{value}</code>
        <CopyButton text={value} />
      </div>
      <div className="text-xs mt-2" style={{ color: 'var(--warn)' }}>{note ?? 'This is shown only once. Copy it now.'}</div>
    </div>
  );
}
