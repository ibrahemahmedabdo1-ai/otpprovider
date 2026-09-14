import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      forcePasswordReset?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    forcePasswordReset?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    forcePasswordReset?: boolean;
  }
}
