import { db } from './db';

/** Fixed-window limiter stored in Postgres (works across serverless instances). */
export async function hit(key: string, limit: number, windowSec = 60): Promise<boolean> {
  const now = new Date();
  const start = new Date(Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key","windowStart","count") VALUES (${key}, ${start}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" = ${start} THEN "RateLimit"."count" + 1 ELSE 1 END,
      "windowStart" = ${start}
    RETURNING "count"`;
  return Number(rows[0].count) <= limit;
}
