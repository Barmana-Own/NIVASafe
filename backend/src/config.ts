import { z } from "zod";

const weakSecretMarkers = ["development", "change-before-production", "change-in-production", "secret"];
const defaultLoginRateLimitMax = 60;
const loginRateLimitWindow = "15 minutes";

function strongSecret(name: string, value: string | undefined) {
  if (!value || value.length < 32 || weakSecretMarkers.some((marker) => value.toLowerCase().includes(marker))) {
    throw new Error(`${name} must be set to a random value of at least 32 characters in production`);
  }
}

export function getLoginRateLimit() {
  const configuredMax = process.env.LOGIN_RATE_LIMIT_MAX?.trim();
  if (!configuredMax) return { max: defaultLoginRateLimitMax, timeWindow: loginRateLimitWindow } as const;

  const max = Number(configuredMax);
  if (!Number.isSafeInteger(max) || max < 1 || max > defaultLoginRateLimitMax) {
    throw new Error(`LOGIN_RATE_LIMIT_MAX must be an integer between 1 and ${defaultLoginRateLimitMax}`);
  }
  return { max, timeWindow: loginRateLimitWindow } as const;
}

export function validateEnvironment() {
  const port = Number(process.env.PORT ?? 5044);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid PORT: ${process.env.PORT}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !/^mysql:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be a mysql:// connection string");
  }

  const appUrls = (process.env.APP_URL ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  for (const appUrl of appUrls) z.string().url().parse(appUrl);

  if (process.env.NODE_ENV === "production") {
    if (!appUrls.length) throw new Error("APP_URL is required in production");
    strongSecret("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET);
    strongSecret("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET);
    if (!process.env.SMTP_URL?.trim()) throw new Error("SMTP_URL is required in production so invitations and password reset work");
    if (process.env.S3_ENDPOINT && (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_BUCKET)) {
      throw new Error("S3_ACCESS_KEY, S3_SECRET_KEY and S3_BUCKET are required when S3_ENDPOINT is configured");
    }
  }

  return { port, databaseUrl, appUrls };
}
