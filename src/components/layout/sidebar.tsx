"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Key,
  Server,
  MessageSquare,
  Mail,
  FileText,
  CreditCard,
  Package,
  Ticket,
  Calendar,
  BarChart3,
  Activity,
  AlertTriangle,
  ScrollText,
  Bell,
  Newspaper,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
  { href: "/admin/providers", label: "Providers", icon: Server },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/admin/email", label: "Email", icon: Mail },
  { href: "/admin/otp-logs", label: "OTP Logs", icon: FileText },
  { href: "/admin/credits", label: "Credits", icon: CreditCard },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/meetings", label: "Meetings", icon: Calendar },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/health", label: "Health Center", icon: Activity },
  { href: "/admin/errors", label: "Error Center", icon: AlertTriangle },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
      <div className="flex h-16 items-center gap-2 border-b px-4 font-bold">
        <Shield className="h-5 w-5 text-primary" />
        <span>OTPProvider</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {adminLinks.map((link) => {
          const active = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 flex items-center justify-between">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-muted-foreground"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
