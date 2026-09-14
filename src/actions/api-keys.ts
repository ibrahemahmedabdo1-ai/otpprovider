@'
"use server";

import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";

export async function createApiKey(formData: FormData) {
  const session = await requireAuth();
  const name = (formData.get("name") as string)?.trim() || "Default Key";

  const prefix = otp_${randomBytes(4).toString("hex")};
  const secret = randomBytes(24).toString("hex");
  const fullKey = ${prefix}_${secret};
  const keyHash = await hash(fullKey, 10);

  await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyPrefix: prefix,
      keyHash,
      status: "ACTIVE",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      actorId: session.user.id,
      action: "CREATE_API_KEY",
      entity: "ApiKey",
      metadata: { name, prefix },
    },
  });

  revalidatePath("/customer/api-keys");

  return {
    success: true,
    key: fullKey,
    prefix,
  };
}

export async function revokeApiKey(keyId: string) {
  const session = await requireAuth();

  const key = await prisma.apiKey.findFirst({
    where: {
      id: keyId,
      userId: session.user.id,
    },
  });

  if (!key) {
    return { error: "NOT_FOUND" };
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { status: "REVOKED" },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      actorId: session.user.id,
      action: "REVOKE_API_KEY",
      entity: "ApiKey",
      entityId: keyId,
    },
  });

  revalidatePath("/customer/api-keys");

  return {
    success: true,
  };
}
'@ | Set-Content "src\actions\api-keys.ts"
