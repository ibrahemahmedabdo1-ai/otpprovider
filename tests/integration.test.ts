/**
 * Database integration tests. They WRITE to the database in DATABASE_URL, so point it at a throwaway
 * Neon branch and run:  INTEGRATION=1 npm test
 */
import { describe, it, expect } from 'vitest';

describe.skipIf(!process.env.INTEGRATION)('ledger (real database)', () => {
  it('concurrent debits can never overspend and each ref is applied once', async () => {
    process.env.ENCRYPTION_KEY ||= 'integration-key-0123456789abcdef0123';
    const { db } = await import('@/lib/db');
    const { applyLedger, InsufficientFunds } = await import('@/lib/ledger');
    const t = await db.tenant.create({ data: { name: 'itest-' + Date.now() } });
    try {
      await applyLedger({ tenantId: t.id, type: 'TOPUP', amount: 1, ref: `it-top-${t.id}` });
      const results = await Promise.allSettled(
        Array.from({ length: 20 }, (_, i) => applyLedger({ tenantId: t.id, type: 'USAGE', amount: -0.1, ref: `it-${t.id}-${i}` })),
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const denied = results.filter((r) => r.status === 'rejected' && (r as any).reason instanceof InsufficientFunds).length;
      expect(ok).toBe(10);
      expect(denied).toBe(10);
      const fresh = await db.tenant.findUniqueOrThrow({ where: { id: t.id } });
      expect(Number(fresh.balance)).toBeCloseTo(0, 6);
      // idempotent replay
      const again = await applyLedger({ tenantId: t.id, type: 'TOPUP', amount: 1, ref: `it-top-${t.id}` });
      expect(again.duplicate).toBe(true);
    } finally {
      await db.ledgerEntry.deleteMany({ where: { tenantId: t.id } });
      await db.tenant.delete({ where: { id: t.id } });
    }
  }, 60000);
});
