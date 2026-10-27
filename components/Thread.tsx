import { getT } from '@/lib/i18n';
import { StatusBadge, dt } from './ui';
import { AutoRefresh } from './Client';

type Msg = { id: string; authorName: string; authorRole: string; body: string; internal: boolean; attachName: string | null; createdAt: Date };

export function Thread({ messages, staffView }: { messages: Msg[]; staffView: boolean }) {
  const { t } = getT();
  return (
    <div className="space-y-3">
      <AutoRefresh seconds={8} />
      {messages.map((m) => {
        const mine = staffView ? m.authorRole !== 'CLIENT' : m.authorRole === 'CLIENT';
        return (
          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className="card p-3 max-w-[85%]" style={m.internal ? { borderColor: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 10%, var(--card))' } : undefined}>
              <div className="text-xs mb-1 flex gap-2 items-center" style={{ color: 'var(--muted)' }}>
                <b>{m.authorName}</b>{m.authorRole !== 'CLIENT' && <StatusBadge s={m.authorRole === 'SUPPORT' ? 'OPEN' : 'ACTIVE'} />}
                {m.internal && <span className="badge b-warn">{t('Internal note')}</span>}<span>{dt(m.createdAt)}</span>
              </div>
              <div className="whitespace-pre-wrap break-words text-sm">{m.body}</div>
              {m.attachName && <a className="text-xs underline mt-2 inline-block" href={`/api/attachments/${m.id}`}>📎 {m.attachName}</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
