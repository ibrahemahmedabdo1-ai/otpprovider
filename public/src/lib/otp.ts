import { hash, compare } from "bcryptjs";
import prisma from "./prisma";
import { generateOtp, generateRequestId } from "./utils";
import type { OtpChannel, OtpStatus } from "@prisma/client";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

export async function createOtpRequest(params: {
  channel: OtpChannel;
  recipient: string;
  userId?: string;
  apiKeyId?: string;
  isTest?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const { channel, recipient, userId, apiKeyId, isTest = false, metadata } = params;

  // Rate limit by recipient
  const recent = await prisma.otpLog.count({
    where: {
      recipient,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
  if (recent >= RATE_LIMIT_MAX) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  const otp = generateOtp(6);
  const otpHash = await hash(otp, 10);
  const requestId = generateRequestId();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const log = await prisma.otpLog.create({
    data: {
      userId,
      channel,
      recipient,
      otpHash,
      requestId,
      status: "QUEUED",
      isTest,
      maxAttempts: MAX_ATTEMPTS,
      metadata: metadata || {},
      expiresAt,
    },
  });

  // In production: enqueue to BullMQ / send via provider
  // For now mark as SENT (real provider integration later)
  await prisma.otpLog.update({
    where: { id: log.id },
    data: { status: "SENT", sentAt: new Date() },
  });

  // Deduct credits if production and user exists
  if (!isTest && userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.credits > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        }),
        prisma.creditsTransaction.create({
          data: {
            userId,
            amount: -1,
            type: "PRODUCTION",
            reason: "USAGE",
            reference: requestId,
            balanceAfter: user.credits - 1,
          },
        }),
      ]);
    } else if (user && user.credits <= 0) {
      await prisma.otpLog.update({
        where: { id: log.id },
        data: { status: "FAILED", error: "INSUFFICIENT_CREDITS" },
      });
      throw new Error("INSUFFICIENT_CREDITS");
    }
  }

  return {
    success: true,
    requestId,
    status: "SENT" as OtpStatus,
    expiresAt: expiresAt.toISOString(),
    // Only return OTP in development / test for debugging
    ...(process.env.NODE_ENV === "development" || isTest ? { _devOtp: otp } : {}),
  };
}

export async function verifyOtp(requestId: string, otp: string) {
  const log = await prisma.otpLog.findUnique({ where: { requestId } });

  if (!log) {
    return { success: false, error: "INVALID_REQUEST" };
  }

  if (log.status === "VERIFIED") {
    return { success: false, error: "ALREADY_VERIFIED" };
  }

  if (log.status === "EXPIRED" || log.expiresAt < new Date()) {
    await prisma.otpLog.update({
      where: { id: log.id },
      data: { status: "EXPIRED" },
    });
    return { success: false, error: "EXPIRED" };
  }

  if (log.attempts >= log.maxAttempts) {
    return { success: false, error: "MAX_ATTEMPTS" };
  }

  const valid = log.otpHash ? await compare(otp, log.otpHash) : false;

  await prisma.otpLog.update({
    where: { id: log.id },
    data: {
      attempts: { increment: 1 },
      ...(valid
        ? { status: "VERIFIED", verifiedAt: new Date(), otpHash: null }
        : {}),
    },
  });

  if (!valid) {
    return { success: false, error: "INVALID_OTP", attemptsLeft: log.maxAttempts - log.attempts - 1 };
  }

  return {
    success: true,
    requestId,
    status: "VERIFIED",
    verifiedAt: new Date().toISOString(),
  };
}

export async function getOtpStatus(requestId: string) {
  const log = await prisma.otpLog.findUnique({
    where: { requestId },
    select: {
      requestId: true,
      status: true,
      channel: true,
      recipient: true,
      expiresAt: true,
      sentAt: true,
      verifiedAt: true,
      isTest: true,
      createdAt: true,
    },
  });

  if (!log) return null;
  return log;
}
