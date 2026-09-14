import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import prisma from "./prisma";
import type { Role } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || user.status === "DISABLED" || user.status === "LOCKED") {
          await prisma.auditLog.create({
            data: {
              action: "LOGIN_FAILED",
              metadata: { email, reason: "invalid_or_disabled" },
            },
          }).catch(() => {});
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const update: Record<string, unknown> = { failedLoginAttempts: attempts };
          if (attempts >= 5) {
            update.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
            update.status = "LOCKED";
          }
          await prisma.user.update({ where: { id: user.id }, data: update });
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "LOGIN_FAILED",
              metadata: { attempts },
            },
          }).catch(() => {});
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            status: "ACTIVE",
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            actorId: user.id,
            action: "LOGIN",
          },
        }).catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          forcePasswordReset: user.forcePasswordReset,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.forcePasswordReset = (user as { forcePasswordReset?: boolean }).forcePasswordReset;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        (session.user as { forcePasswordReset?: boolean }).forcePasswordReset =
          token.forcePasswordReset as boolean;
      }
      return session;
    },
  },
  trustHost: true,
});

export function getRedirectByRole(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/admin";
    case "SUPPORT":
      return "/support";
    case "SALES":
      return "/sales";
    case "MARKETING":
      return "/marketing";
    case "CUSTOMER":
    default:
      return "/customer";
  }
}
