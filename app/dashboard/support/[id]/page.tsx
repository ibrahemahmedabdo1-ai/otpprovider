import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash, StatusBadge } from '@/components/ui';
import { Thread } from '@/components/Thread';
import { customerReplyAction } from '@/app/actions/customer';

export const dynamic = 'force-dynamic';

export default async function TicketPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; err?: string } }) {
  const { tenant } = await requireClient();
  const { t } = getT();
  const tk = await db.ticket.findFirst({ where: { id: params.id, tenantId: tenant.id }, include: { messages: { where: { internal: false }, orderBy: { createdAt: 'asc' } } } });
  if (!tk) notFound();
  return (
    <>
      <PageHead title={tk.subject} sub={`${tk.category} · #${tk.id.slice(-6)}`} actions={<StatusBadge s={tk.status} />} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Thread messages={tk.messages} staffView={false} />
      {tk.status !== 'CLOSED' && (
        <Card className="mt-6">
          <form action={customerReplyAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={tk.id} />
            <Field label={t('Reply')}><textarea className="input" name="body" rows={3} maxLength={5000} /></Field>
            <input className="input" type="file" name="file" accept=".png,.jpg,.jpeg,.pdf,.txt" />
            <button className="btn btn-primary">{t('Send')}</button>
          </form>
        </Card>)}
    </>
  );
}
