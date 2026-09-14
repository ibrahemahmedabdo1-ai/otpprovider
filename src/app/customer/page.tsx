import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Key, MessageSquare, Ticket } from "lucide-react";

export default async function CustomerDashboard() {
  const session = await requireAuth();
  const userId = session.user.id;

  const [user, otpCount, keyCount, ticketCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, testCredits: true, name: true, email: true },
    }),
    prisma.otpLog.count({ where: { userId } }),
    prisma.apiKey.count({ where: { userId, status: "ACTIVE" } }),
    prisma.ticket.count({ where: { customerId: userId, status: { not: "CLOSED" } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.name || user?.email}</h1>
        <p className="text-muted-foreground">Your OTPProvider customer dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Production Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.credits ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Test Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.testCredits ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">OTP Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{otpCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Open Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{ticketCount}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Go to Tickets to create or view support requests.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
