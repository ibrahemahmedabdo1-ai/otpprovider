"use client";

import { useState, useTransition } from "react";
import { createApiKey } from "@/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

export function CreateApiKeyForm() {
  const [isPending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(formData: FormData) {
    setNewKey(null);
    startTransition(async () => {
      const result = await createApiKey(formData);
      if (result.success && result.key) {
        setNewKey(result.key);
        toast.success("API Key created — copy it now, it won't be shown again");
      } else {
        toast.error("Failed to create key");
      }
    });
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New API Key</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-2 w-full">
            <Label htmlFor="name">Key Name</Label>
            <Input id="name" name="name" placeholder="Production Key" disabled={isPending} />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Key"}
          </Button>
        </form>

        {newKey && (
          <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
            <p className="text-sm font-medium text-warning">
              Copy this key now. It will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs break-all font-mono bg-background p-2 rounded">
                {newKey}
              </code>
              <Button size="icon" variant="outline" onClick={copyKey}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
