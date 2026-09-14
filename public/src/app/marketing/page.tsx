import { requireRoles } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MarketingPage() {
  await requireRoles(["MARKETING", "ADMIN", "SUPER_ADMIN"]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <h1 className="text-3xl font-bold">Marketing Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>News & Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Manage news ticker, announcements, and marketing campaigns.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
