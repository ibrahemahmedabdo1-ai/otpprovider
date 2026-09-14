import { createHash } from "crypto";
import prisma from "./prisma";
import { compare } from "bcryptjs";

export async function authenticateApiKey(request: Request) {
  const apiKey =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!apiKey) {
    return { error: "MISSING_API_KEY", status: 401 };
  }

  const prefix = apiKey.split("_").slice(0, 2).join("_"); // otp_xxxxxx

  const keys = await prisma.apiKey.findMany({
    where: { keyPrefix: prefix, status: "ACTIVE" },
    include: { user: true },
  });

  for (const key of keys) {
    // Support both hashed and direct comparison for flexibility
    const match =
      (await compare(apiKey, key.keyHash).catch(() => false)) ||
      key.keyHash === createHash("sha256").update(apiKey).digest("hex");

    if (match) {
      if (key.user.status !== "ACTIVE") {
        return { error: "USER_DISABLED", status: 403 };
      }
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
      return { user: key.user, apiKey: key };
    }
  }

  return { error: "INVALID_API_KEY", status: 401 };
}
