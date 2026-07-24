import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, parse, prisma, safeUser, tokenHash } from "../core.js";
import { scheduleEmail } from "../mail.js";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });

export async function registerAuthRoutes(app: FastifyInstance) {
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret-change-before-production";

  app.post("/api/v1/auth/register", async (request, reply) => {
    const body = parse(credentials.extend({ displayName: z.string().min(2), locale: z.enum(["fa", "en"]).default("fa") }), request.body);
    const user = await prisma.user.create({ data: { email: body.email.toLowerCase(), displayName: body.displayName, locale: body.locale, passwordHash: await bcrypt.hash(body.password, 12) } });
    return reply.code(201).send(envelope(safeUser(user)));
  });

  app.post("/api/v1/auth/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request) => {
    const body = parse(credentials, request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() }, include: { memberships: { where: { active: true }, include: { organization: true } } } });
    if (!user?.active || !(await bcrypt.compare(body.password, user.passwordHash))) {
      await prisma.auditLog.create({ data: { action: "FAILED_LOGIN", metadata: { email: body.email.toLowerCase() }, requestId: request.id } });
      throw Object.assign(new Error("Email or password is incorrect"), { statusCode: 401, code: "INVALID_CREDENTIALS" });
    }
    const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: "15m" });
    const refreshToken = app.jwt.sign({ sub: user.id, type: "refresh" }, { key: refreshSecret, expiresIn: "7d" });
    await prisma.$transaction([
      prisma.session.create({ data: { userId: user.id, tokenHash: tokenHash(refreshToken), expiresAt: new Date(Date.now() + 7 * 86400000) } }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", requestId: request.id } }),
    ]);
    return envelope({ accessToken, refreshToken, user: safeUser(user), organizations: user.memberships.map((membership: { organization: { id: string; nameFa: string; nameEn: string }; role: string }) => ({ id: membership.organization.id, nameFa: membership.organization.nameFa, nameEn: membership.organization.nameEn, role: membership.role })) });
  });

  app.post("/api/v1/auth/refresh", async (request) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string() }), request.body);
    let payload: { sub: string; type?: string };
    try { payload = app.jwt.verify(refreshToken, { key: refreshSecret }); } catch { throw Object.assign(new Error("Invalid refresh token"), { statusCode: 401, code: "INVALID_REFRESH_TOKEN" }); }
    const session = await prisma.session.findUnique({ where: { tokenHash: tokenHash(refreshToken) }, include: { user: { select: { active: true } } } });
    if (!session || session.userId !== payload.sub || !session.user.active || session.revokedAt || session.expiresAt < new Date() || payload.type !== "refresh") throw Object.assign(new Error("Refresh token revoked"), { statusCode: 401, code: "REFRESH_REVOKED" });
    const next = app.jwt.sign({ sub: payload.sub, type: "refresh" }, { key: refreshSecret, expiresIn: "7d" });
    await prisma.$transaction([
      prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
      prisma.session.create({ data: { userId: payload.sub, tokenHash: tokenHash(next), expiresAt: new Date(Date.now() + 7 * 86400000) } }),
    ]);
    return envelope({ accessToken: app.jwt.sign({ sub: payload.sub }, { expiresIn: "15m" }), refreshToken: next });
  });

  app.post("/api/v1/auth/logout", { preHandler: authenticate }, async (request) => {
    await prisma.session.updateMany({ where: { userId: request.actor!.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(request, "LOGOUT");
    return envelope({ success: true });
  });

  app.post("/api/v1/auth/forgot-password", async (request) => {
    const { email } = parse(z.object({ email: z.string().email() }), request.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    let developmentToken: string | undefined;
    if (user) {
      const token = randomBytes(32).toString("hex");
      const [, outbox] = await prisma.$transaction([
        prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 30 * 60_000) } }),
        prisma.emailOutbox.create({ data: { recipient: user.email, subject: "NIVASafe password reset", body: `برای تنظیم رمز جدید این لینک را باز کنید: ${(process.env.APP_URL ?? "http://localhost:5043").split(",")[0]}/reset-password?token=${token}` } }),
      ]);
      await scheduleEmail(outbox.id);
      if (process.env.NODE_ENV !== "production") developmentToken = token;
    }
    return envelope({ accepted: true, ...(developmentToken ? { developmentToken } : {}) });
  });

  app.post("/api/v1/auth/reset-password", async (request) => {
    const body = parse(z.object({ token: z.string().min(32), password: z.string().min(8).max(128) }), request.body);
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: tokenHash(body.token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw Object.assign(new Error("Reset token is invalid or expired"), { statusCode: 400, code: "RESET_TOKEN_INVALID" });
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(body.password, 12) } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.auditLog.create({ data: { userId: reset.userId, action: "PASSWORD_RESET", requestId: request.id } }),
    ]);
    return envelope({ success: true });
  });

  app.get("/api/v1/profile", { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.actor!.userId } });
    return envelope(safeUser(user));
  });

  app.patch("/api/v1/profile", { preHandler: authenticate }, async (request) => {
    const body = parse(z.object({ displayName: z.string().min(2).optional(), locale: z.enum(["fa", "en"]).optional(), phone: z.string().max(30).nullable().optional(), jobTitle: z.string().max(120).nullable().optional() }), request.body);
    const user = await prisma.user.update({ where: { id: request.actor!.userId }, data: body });
    await audit(request, "PROFILE_UPDATE", "User", user.id);
    return envelope(safeUser(user));
  });

  app.post("/api/v1/profile/change-password", { preHandler: authenticate }, async (request) => {
    const body = parse(z.object({ currentPassword: z.string(), newPassword: z.string().min(8).max(128) }), request.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.actor!.userId } });
    if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) throw Object.assign(new Error("Current password is incorrect"), { statusCode: 400, code: "PASSWORD_INCORRECT" });
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 12) } }),
      prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await audit(request, "PASSWORD_CHANGE", "User", user.id);
    return envelope({ success: true });
  });
}
