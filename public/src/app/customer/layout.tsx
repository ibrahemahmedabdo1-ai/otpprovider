import { requireRoles } from "@/lib/auth-helpers";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles(["CUSTOMER", "SUPER_ADMIN", "ADMIN"]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/customer" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" />
            OTPProvider
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/customer" className="hover:text-primary">Overview</Link>
            <Link href="/customer/api-keys" className="hover:text-primary">API Keys</Link>
            <Link href="/customer/otp" className="hover:text-primary">OTP Logs</Link>
            <Link href="/customer/credits" className="hover:text-primary">Credits</Link>
            <Link href="/customer/tickets" className="hover:text-primary">Tickets</Link>
            <Link href="/customer/settings" className="hover:text-primary">Settings</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/api/auth/signout">Logout</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  );
}
