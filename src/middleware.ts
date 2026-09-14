import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
const publicPaths = ["/", "/login", "/register", "/docs", "/api/auth", "/api/v1/otp"];
const rolePaths: Record<string, string[]> = {
  SUPER_ADMIN: ["/admin"],
  ADMIN: ["/admin"],
  SUPPORT: ["/support"],
  SALES: ["/sales"],
  MARKETING: ["/marketing"],
  CUSTOMER: ["/customer", "/dashboard"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isPublic =
    publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    const redirectMap: Record<string, string> = {
      SUPER_ADMIN: "/admin",
      ADMIN: "/admin",
      SUPPORT: "/support",
      SALES: "/sales",
      MARKETING: "/marketing",
      CUSTOMER: "/customer",
    };
    return NextResponse.redirect(new URL(redirectMap[role || "CUSTOMER"] || "/customer", req.url));
  }

  if (isLoggedIn && role) {
    const allowed = rolePaths[role] || [];
    const isRolePath = Object.values(rolePaths).flat().some((p) => pathname.startsWith(p));
    if (isRolePath && !allowed.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL(allowed[0] || "/customer", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};




