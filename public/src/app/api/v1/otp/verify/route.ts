import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { verifyOtp } from "@/lib/otp";
import prisma from "@/lib/prisma";

const schema = z.object({
  requestId: z.string().min(1),
  otp: z.string().length(6),
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

    const result = await verifyOtp(parsed.data.requestId, parsed.data.otp);

    if (result.success) {
      await prisma.auditLog.create({
        data: {
          userId: authResult.user.id,
          actorId: authResult.user.id,
          action: "VERIFY_OTP",
          entity: "OtpLog",
          entityId: parsed.data.requestId,
        },
      }).catch(() => {});
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
