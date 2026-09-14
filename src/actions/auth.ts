"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function registerUser(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "VALIDATION_ERROR", details: parsed.error.flatten() };
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return { error: "EMAIL_EXISTS" };
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "CUSTOMER",
      status: "ACTIVE",
      credits: 0,
      testCredits: 20,
      passwordChangedAt: new Date(),
    },
  });

  await prisma.passwordEvent.create({
    data: {
      userId: user.id,
      action: "INITIAL_PASSWORD_SET",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      actorId: user.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      metadata: { role: "CUSTOMER", source: "register" },
    },
  });

  redirect("/login?registered=1");
}
