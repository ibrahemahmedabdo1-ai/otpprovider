"use client";

import { useTransition } from "react";
import { updateFooterSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function FooterSettingsForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateFooterSettings(formData);
      if (result?.success) {
        toast.success("تم حفظ إعدادات الفوتر");
      } else {
        toast.error("فشل الحفظ");
      }
    });
  }

  const fields = [
    { name: "companyName", label: "اسم الشركة", default: initial.companyName || "OTPProvider Enterprise" },
    { name: "tagline", label: "الوصف المختصر", default: initial.tagline || "منصة OTP احترافية للمؤسسات" },
    { name: "email", label: "البريد الإلكتروني", default: initial.email || "support@otpprovider.com" },
    { name: "phone", label: "رقم الهاتف", default: initial.phone || "+20 100 000 0000" },
    { name: "address", label: "العنوان", default: initial.address || "القاهرة، مصر" },
    { name: "website", label: "الموقع", default: initial.website || "https://otpprovider.com" },
    { name: "copyrightAr", label: "نص الحقوق (عربي)", default: initial.copyrightAr || "جميع الحقوق محفوظة." },
    { name: "copyrightEn", label: "نص الحقوق (English)", default: initial.copyrightEn || "All rights reserved." },
  ];

  return (
    <form action={handleSubmit} className="space-y-4 max-w-xl">
      {fields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} name={f.name} defaultValue={f.default} disabled={isPending} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        سطر الحقوق يظهر بهذا الشكل: © {new Date().getFullYear()} [اسم الشركة]. [نص الحقوق]
      </p>
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            جاري الحفظ...
          </>
        ) : (
          "حفظ الإعدادات"
        )}
      </Button>
    </form>
  );
}
