import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card p-5', className)}>{children}</div>;
}

export function Badge({ children, tone = 'mute' }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'mute' }) {
  return <span className={clsx('badge', `b-${tone}`)}>{children}</span>;
}

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'mute'> = {
  ACTIVE: 'ok', ENABLED: 'ok', CONNECTED: 'ok', DELIVERED: 'ok', READ: 'ok', SENT: 'ok', SUBMITTED: 'ok', APPROVED: 'ok', RESOLVED: 'ok', DELIVERABLE_LIKELY: 'ok',
  PENDING: 'warn', PAIRING: 'warn', DEGRADED: 'warn', PROCESSING: 'warn', QUEUED: 'warn', RESTRICTED: 'warn', RISKY: 'warn', OPEN: 'warn', WAITING: 'warn', UNKNOWN: 'warn', UNKNOWN_OUTCOME: 'warn', ESCALATED: 'bad', PAUSED: 'warn',
  SUSPENDED: 'bad', DISABLED: 'bad', DISCONNECTED: 'bad', FAILED: 'bad', REJECTED: 'bad', EXPIRED: 'bad', INVALID: 'bad', CLOSED: 'mute', CANCELLED: 'mute',
};
export const StatusBadge = ({ s }: { s: string }) => <Badge tone={TONE[s] ?? 'mute'}>{s.replace(/_/g, ' ')}</Badge>;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>{text}</div>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-2xl font-bold mt-1" style={tone ? { color: `var(--${tone === 'ok' ? 'ok' : tone === 'warn' ? 'warn' : 'bad'})` } : undefined}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </Card>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div className={clsx('card px-4 py-3 mb-4 text-sm font-medium')} style={{ borderColor: err ? 'var(--bad)' : 'var(--ok)', color: err ? 'var(--bad)' : 'var(--ok)' }} role="status">
      {err ?? ok}
    </div>
  );
}

export const dt = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—');
