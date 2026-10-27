import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Field, Flash } from '@/components/ui';
import { createTicketAction } from '@/app/actions/customer';

export const metadata = { title: 'New ticket' };

export default async function NewTicket({ searchParams }: { searchParams: { err?: string; category?: string } }) {
  await requireClient();
  const { t } = getT();
  const cat = ['general', 'billing', 'technical', 'whatsapp', 'account-closure'].includes(searchParams.category ?? '') ? searchParams.category : 'general';
  return (
    <>
      <PageHead title={t('New ticket')} />
      <Flash err={searchParams.err} />
      <Card className="max-w-2xl">
        <form action={createTicketAction} className="space-y-4">
          <Field label={t('Subject')}><input className="input" name="subject" required minLength={3} maxLength={120} /></Field>
          <Field label={t('Category')}><select className="input" name="category" defaultValue={cat}>{['general', 'billing', 'technical', 'whatsapp', 'account-closure'].map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label={t('Message')}><textarea className="input" name="body" rows={6} required maxLength={5000} /></Field>
          <Field label={t('Attachment (PNG, JPG, PDF, TXT up to 1 MB)')}><input className="input" type="file" name="file" accept=".png,.jpg,.jpeg,.pdf,.txt" /></Field>
          <button className="btn btn-primary">{t('Send')}</button>
        </form>
      </Card>
    </>
  );
}
