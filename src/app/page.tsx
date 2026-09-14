import { LandingPage } from "@/components/landing/landing-page";
import type { FooterSettings } from "@/components/landing/footer";
import type { NewsItem } from "@/components/landing/news-ticker";
import prisma from "@/lib/prisma";

async function getFooterSettings(): Promise<FooterSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "footer" } });
    if (row?.value && typeof row.value === "object") {
      return row.value as FooterSettings;
    }
  } catch {}
  return {};
}

async function getNews(): Promise<NewsItem[]> {
  try {
    const items = await prisma.newsItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 20,
      select: { id: true, titleAr: true, titleEn: true, link: true },
    });
    return items;
  } catch {
    return [
      {
        id: "1",
        titleAr: "تحديث مباشر: دعم WhatsApp Business API الآن",
        titleEn: "Live update: WhatsApp Business API support now available",
      },
      {
        id: "2",
        titleAr: "خدمة جديدة: تحقق عبر البريد الإلكتروني متاح",
        titleEn: "New service: Email verification is available",
      },
    ];
  }
}

export default async function HomePage() {
  const [footerSettings, news] = await Promise.all([
    getFooterSettings(),
    getNews(),
  ]);

  return <LandingPage footerSettings={footerSettings} news={news} />;
}
