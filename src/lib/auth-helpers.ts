import { auth } from "./auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRoles(allowedRoles: Role[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/unauthorized");
  }
  return session;
}

export async function requireAdmin() {
  return requireRoles(["SUPER_ADMIN", "ADMIN"]);
}

export async function requireSuperAdmin() {
  return requireRoles(["SUPER_ADMIN"]);
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
