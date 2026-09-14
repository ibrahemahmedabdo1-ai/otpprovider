import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { getOtpStatus } from "@/lib/otp";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateApiKey(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "MISSING_REQUEST_ID" },
        { status: 400 }
      );
    }

    const status = await getOtpStatus(requestId);
    if (!status) {
      return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    console.error("OTP status error:", err);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
