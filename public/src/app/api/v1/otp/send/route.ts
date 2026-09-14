import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { createOtpRequest } from "@/lib/otp";
import prisma from "@/lib/prisma";

const schema = z.object({
  channel: z.enum(["whatsapp", "email"]),
  recipient: z.string().min(3).max(100),
  metadata: z.record(z.unknown()).optional(),
  isTest: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const authResult = await authenticateApiKey(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { channel, recipient, metadata, isTest } = parsed.data;
    const useTest = isTest === true || (authResult.user.testCredits > 0 && isTest !== false && authResult.user.credits <= 0);

    if (!useTest && authResult.user.credits <= 0) {
      return NextResponse.json(
        { success: false, error: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    const result = await createOtpRequest({
      channel: channel.toUpperCase() as "WHATSAPP" | "EMAIL",
      recipient,
      userId: authResult.user.id,
      apiKeyId: authResult.apiKey.id,
      isTest: useTest,
      metadata,
    });

    await prisma.auditLog.create({
      data: {
        userId: authResult.user.id,
        actorId: authResult.user.id,
        action: "SEND_OTP",
        entity: "OtpLog",
        entityId: result.requestId,
        metadata: { channel, recipient: recipient.slice(0, 4) + "***", isTest: useTest },
      },
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "INTERNAL_ERROR";
    if (message === "RATE_LIMIT_EXCEEDED") {
      return NextResponse.json({ success: false, error: message }, { status: 429 });
    }
    if (message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ success: false, error: message }, { status: 402 });
    }
    console.error("OTP send error:", message);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
