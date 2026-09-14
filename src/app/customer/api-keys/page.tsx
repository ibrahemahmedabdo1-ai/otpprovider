import { requireAuth } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateApiKeyForm } from "./create-form";

export default async function CustomerApiKeysPage() {
  const session = await requireAuth();
  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for OTP sending</p>
        </div>
      </div>

      <CreateApiKeyForm />

      <Card>
        <CardHeader>
          <CardTitle>Your Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-muted-foreground">No API keys yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{k.keyPrefix}_••••••••</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={k.status === "ACTIVE" ? "success" : "secondary"}>
                      {k.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
