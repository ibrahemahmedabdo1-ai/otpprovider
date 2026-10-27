/* Run once after `prisma db push`:  npm run db:seed
 * Creates the first Super Admin (from SEED_ADMIN_*), the three service rows (all DISABLED) and starter packages.
 * Safe to re-run: existing rows are left untouched. */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD first');
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))
    throw new Error('SEED_ADMIN_PASSWORD needs 10+ chars with upper case, lower case and a digit');

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) console.log('Super Admin already exists, left unchanged:', email);
  else {
    await db.user.create({
      data: {
        email, name: 'Super Admin', role: 'SUPER_ADMIN', status: 'ACTIVE', emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true,
      },
    });
    console.log('Created Super Admin:', email, '(password change + 2FA setup are forced at first sign-in)');
  }

  const services = [
    { key: 'EMAIL_OTP', unitPrice: '0.004', billOn: 'SUBMITTED' },
    { key: 'WHATSAPP_OTP', unitPrice: '0.02', billOn: 'DELIVERED' },
    { key: 'EMAIL_VALIDATION', unitPrice: '0.002', billOn: 'SUBMITTED' },
  ] as const;
  for (const s of services) {
    await db.serviceConfig.upsert({ where: { key: s.key }, update: {}, create: { key: s.key, state: 'DISABLED', unitPrice: s.unitPrice, billOn: s.billOn } });
  }

  if ((await db.package.count()) === 0) {
    await db.package.createMany({
      data: [
        { name: 'Starter', priceUsd: '2.99', emailQuota: 600, whatsappQuota: 100, validationQuota: 1000, sortOrder: 1 },
        { name: 'Growth', priceUsd: '9.99', emailQuota: 2500, whatsappQuota: 400, validationQuota: 5000, sortOrder: 2 },
        { name: 'Business', priceUsd: '29.99', emailQuota: 9000, whatsappQuota: 1500, validationQuota: 20000, sortOrder: 3 },
      ],
    });
    console.log('Created starter packages (edit them in Admin > Packages)');
  }
  console.log('Done. Services start DISABLED: enable them in Admin > Services after configuring an email provider / WhatsApp device.');
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());
