"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

export async function updateFooterSettings(formData: FormData) {
  await requireAdmin();

  const value = {
    companyName: (formData.get("companyName") as string) || "",
    tagline: (formData.get("tagline") as string) || "",
    email: (formData.get("email") as string) || "",
    phone: (formData.get("phone") as string) || "",
    address: (formData.get("address") as string) || "",
    website: (formData.get("website") as string) || "",
    copyrightAr: (formData.get("copyrightAr") as string) || "",
    copyrightEn: (formData.get("copyrightEn") as string) || "",
  };

  await prisma.setting.upsert({
    where: { key: "footer" },
    create: { key: "footer", value },
    update: { value },
  });

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATE_SETTINGS",
        entity: "Setting",
        entityId: "footer",
        metadata: value,
      },
    })
    .catch(() => {});

  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { success: true };
}
