import { requireRoles } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SalesPage() {
  await requireRoles(["SALES", "ADMIN", "SUPER_ADMIN"]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <h1 className="text-3xl font-bold">Sales Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Packages & Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Track package sales, pending payments, and customer conversions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
