import { requireAdmin } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Ticket, Server, CreditCard, Activity } from "lucide-react";

async function getStats() {
  const [
    totalUsers,
    activeUsers,
    customers,
    otpTotal,
    otpSuccess,
    otpFailed,
    openTickets,
    activeProviders,
    creditsUsed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.otpLog.count(),
    prisma.otpLog.count({ where: { status: "VERIFIED" } }),
    prisma.otpLog.count({ where: { status: "FAILED" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.provider.count({ where: { status: "ACTIVE" } }),
    prisma.creditsTransaction.aggregate({
      where: { reason: "USAGE" },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    customers,
    otpTotal,
    otpSuccess,
    otpFailed,
    openTickets,
    activeProviders,
    creditsUsed: Math.abs(creditsUsed._sum.amount || 0),
  };
}

export default async function AdminDashboard() {
  const session = await requireAdmin();
  const stats = await getStats();

  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users },
    { title: "Active Users", value: stats.activeUsers, icon: Users },
    { title: "Customers", value: stats.customers, icon: Users },
    { title: "OTP Requests", value: stats.otpTotal, icon: MessageSquare },
    { title: "Successful OTP", value: stats.otpSuccess, icon: MessageSquare },
    { title: "Failed OTP", value: stats.otpFailed, icon: MessageSquare },
    { title: "Open Tickets", value: stats.openTickets, icon: Ticket },
    { title: "Active Providers", value: stats.activeProviders, icon: Server },
    { title: "Credits Used", value: stats.creditsUsed, icon: CreditCard },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All core services operational. Connect Neon database and Redis for full health checks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
