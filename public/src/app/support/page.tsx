import { requireRoles } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SupportPage() {
  await requireRoles(["SUPPORT", "ADMIN", "SUPER_ADMIN"]);

  const openTickets = await prisma.ticket.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] } },
    include: { customer: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">Manage customer tickets</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Open Tickets ({openTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTickets.length === 0 ? (
            <p className="text-muted-foreground">No open tickets currently.</p>
          ) : (
            <div className="space-y-3">
              {openTickets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div>
                    <p className="font-medium">{t.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.customer.name || t.customer.email} · {t.priority} · {t.status}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
