import Link from 'next/link';
import { db } from '@/lib/db';
import { requireClient } from '@/lib/guards';
import { getT } from '@/lib/i18n';
import { Card, PageHead, Empty, StatusBadge, Flash, dt } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Support' };

export default async function SupportList({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const { tenant } = await requireClient();
  const { t } = getT();
  const tickets = await db.ticket.findMany({ where: { tenantId: tenant.id }, orderBy: { updatedAt: 'desc' }, take: 50 });
  return (
    <>
      <PageHead title={t('Support')} sub={t('Your conversations with our team are saved here.')} actions={<Link className="btn btn-primary btn-sm" href="/dashboard/support/new">{t('New ticket')}</Link>} />
      <Flash ok={searchParams.ok} err={searchParams.err} />
      <Card>
        {tickets.length === 0 ? <Empty text={t('No tickets yet.')} /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>{t('Subject')}</th><th>{t('Category')}</th><th>{t('Status')}</th><th>{t('Updated')}</th></tr></thead><tbody>
            {tickets.map((x) => <tr key={x.id}><td><Link className="underline" href={`/dashboard/support/${x.id}`}>{x.subject}</Link></td><td>{x.category}</td><td><StatusBadge s={x.status} /></td><td>{dt(x.updatedAt)}</td></tr>)}
          </tbody></table></div>)}
      </Card>
    </>
  );
}
