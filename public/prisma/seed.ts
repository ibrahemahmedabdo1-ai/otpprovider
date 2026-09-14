import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminEmail = "admin@otpprovider.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await hash("Admin@123456", 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        passwordHash,
        role: "SUPER_ADMIN" as Role,
        status: "ACTIVE",
        credits: 10000,
        testCredits: 100,
        passwordChangedAt: new Date(),
      },
    });
    await prisma.passwordEvent.create({
      data: { userId: admin.id, action: "INITIAL_PASSWORD_SET" },
    });
    console.log("Created SUPER_ADMIN:", adminEmail, "password: Admin@123456");
  } else {
    console.log("Admin already exists");
  }

  const customerEmail = "customer@example.com";
  const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
  if (!existingCustomer) {
    const passwordHash = await hash("Customer@123", 12);
    const customer = await prisma.user.create({
      data: {
        email: customerEmail,
        name: "Demo Customer",
        passwordHash,
        role: "CUSTOMER",
        status: "ACTIVE",
        credits: 500,
        testCredits: 50,
        passwordChangedAt: new Date(),
      },
    });
    await prisma.passwordEvent.create({
      data: { userId: customer.id, action: "INITIAL_PASSWORD_SET" },
    });
    console.log("Created CUSTOMER:", customerEmail, "password: Customer@123");
  }

  const packages = [
    { name: "Starter", description: "For small projects", credits: 1000, bonusCredits: 0, price: 19, currency: "USD", isPopular: false, sortOrder: 1 },
    { name: "Business", description: "For growing teams", credits: 10000, bonusCredits: 500, price: 99, currency: "USD", isPopular: true, sortOrder: 2 },
    { name: "Enterprise", description: "Unlimited scale", credits: 100000, bonusCredits: 10000, price: 799, currency: "USD", isPopular: false, sortOrder: 3 },
  ];

  for (const pkg of packages) {
    const exists = await prisma.package.findFirst({ where: { name: pkg.name } });
    if (!exists) {
      await prisma.package.create({ data: { ...pkg, status: "ACTIVE" } });
      console.log("Created package:", pkg.name);
    }
  }

  const newsExists = await prisma.newsItem.count();
  if (newsExists === 0) {
    await prisma.newsItem.createMany({
      data: [
        {
          titleAr: "إطلاق منصة OTPProvider Enterprise",
          titleEn: "OTPProvider Enterprise Launch",
          contentAr: "نرحب بكم في النسخة الاحترافية",
          contentEn: "Welcome to the professional edition",
          isActive: true,
          sortOrder: 1,
        },
        {
          titleAr: "دعم WhatsApp Cloud API",
          titleEn: "WhatsApp Cloud API Support",
          isActive: true,
          sortOrder: 2,
        },
      ],
    });
    console.log("Created news items");
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
