import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const metadata = {
  title: "API Documentation",
  description: "OTPProvider Enterprise API reference",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" />
            OTPProvider API
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-10 space-y-10">
        <div>
          <h1 className="text-4xl font-bold mb-2">API Documentation</h1>
          <p className="text-muted-foreground">
            Authenticate with your API key and send / verify OTPs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Include your API key in every request:</p>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`x-api-key: otp_xxxxxx_your_secret_key

# or
Authorization: Bearer otp_xxxxxx_your_secret_key`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POST /api/v1/otp/send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Send an OTP via WhatsApp or Email.</p>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`curl -X POST https://your-domain.com/api/v1/otp/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "channel": "whatsapp",
    "recipient": "+201xxxxxxxxx",
    "metadata": { "service": "login" }
  }'`}
            </pre>
            <p className="font-medium mt-2">Response:</p>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`{
  "success": true,
  "requestId": "otp_17xxxxx_abc",
  "status": "SENT",
  "expiresAt": "2026-09-14T10:30:00.000Z"
}`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POST /api/v1/otp/verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`curl -X POST https://your-domain.com/api/v1/otp/verify \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "requestId": "otp_17xxxxx_abc",
    "otp": "123456"
  }'`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GET /api/v1/otp/status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`curl "https://your-domain.com/api/v1/otp/status?requestId=otp_17xxxxx_abc" \\
  -H "x-api-key: YOUR_API_KEY"`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Codes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><code>MISSING_API_KEY</code> / <code>INVALID_API_KEY</code> — 401</p>
            <p><code>INSUFFICIENT_CREDITS</code> — 402</p>
            <p><code>RATE_LIMIT_EXCEEDED</code> — 429</p>
            <p><code>VALIDATION_ERROR</code> — 400</p>
            <p><code>EXPIRED</code> / <code>INVALID_OTP</code> / <code>MAX_ATTEMPTS</code> — 400</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>JavaScript Example</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
{`const res = await fetch("/api/v1/otp/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.OTP_API_KEY,
  },
  body: JSON.stringify({
    channel: "email",
    recipient: "user@example.com",
  }),
});
const data = await res.json();`}
            </pre>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
