import { requireAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FooterSettingsForm } from "./footer-form";

export default async function AdminSettingsPage() {
  await requireAdmin();

  let footer: Record<string, string> = {};
  try {
    const row = await prisma.setting.findUnique({ where: { key: "footer" } });
    if (row?.value && typeof row.value === "object") {
      footer = row.value as Record<string, string>;
    }
  } catch {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">إعدادات الموقع والفوتر وبيانات التواصل</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بيانات الفوتر والتواصل</CardTitle>
          <CardDescription>
            تظهر في فوتر الصفحة الرئيسية. يمكن تعديلها في أي وقت.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FooterSettingsForm initial={footer} />
        </CardContent>
      </Card>
    </div>
  );
}
