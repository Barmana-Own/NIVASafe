import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, USERNAME_MAX_LENGTH, detectContactInput, isForbiddenDisplayName, isStrongPassword, isValidDisplayName, isValidEmail, isValidIranianNationalId, isValidPhone, isValidUsername, normalizeDisplayName, normalizeEmail, normalizeNationalId, normalizePhone, normalizeUsername, PASSWORD_MIN_LENGTH, SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@nivasafe/domain";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { getLoginRateLimit } from "../config.js";
import { audit, envelope, parse, prisma, safeUser, tokenHash } from "../core.js";
import { scheduleEmail } from "../mail.js";
import { defaultProjectForLocale, workspaceForRegistration } from "../onboarding.js";
import { createSubscriptionFields } from "../subscription.js";

const credentials = z.object({ identifier: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).optional(), email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).optional(), password: z.string().min(8).max(128) }).refine((value) => Boolean(value.identifier || value.email), { message: "ایمیل یا نام کاربری را وارد کنید.", path: ["identifier"] });
const subscriptionPlanInput = z.enum(SUBSCRIPTION_PLANS.map((plan) => plan.id) as [SubscriptionPlan, ...SubscriptionPlan[]]);
const registrationInput = z.object({
  email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH),
  username: z.string().trim().max(USERNAME_MAX_LENGTH).nullable().optional(),
  password: z.string().min(1).max(128),
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  firstName: z.string().trim().min(1).max(40).optional(),
  lastName: z.string().trim().min(1).max(40).optional(),
  registrationKind: z.enum(["personal", "organization"]).default("personal"),
  locale: z.enum(["fa", "en"]).default("fa"),
  phone: z.string().trim().max(32).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  companyName: z.string().trim().min(2).max(191).nullable().optional(),
  activityArea: z.string().trim().max(120).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  employeeCount: z.number().int().min(0).max(10_000_000).nullable().optional(),
  nationalId: z.string().trim().max(50).nullable().optional(),
  subscriptionPlan: subscriptionPlanInput.default("STARTER"),
}).strict().superRefine((value, context) => {
  if (value.registrationKind === "organization" && !value.companyName?.trim()) {
    context.addIssue({ code: "custom", path: ["companyName"], message: "نام شرکت را وارد کنید." });
  }
  if (value.registrationKind === "organization" && !value.industry?.trim()) {
    context.addIssue({ code: "custom", path: ["industry"], message: "نوع صنعت را وارد کنید." });
  }
  if ((value.firstName === undefined) !== (value.lastName === undefined)) {
    const missingField = value.firstName === undefined ? "firstName" : "lastName";
    context.addIssue({ code: "custom", path: [missingField], message: "نام و نام خانوادگی را کامل وارد کنید." });
  }
  if (value.registrationKind === "organization" && value.nationalId?.trim() && !isValidIranianNationalId(value.nationalId)) {
    context.addIssue({ code: "custom", path: ["nationalId"], message: "شناسه ملی شرکت معتبر نیست." });
  }
});
const profileInput = z.object({ email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).optional(), displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH).optional(), locale: z.enum(["fa", "en"]).optional(), phone: z.string().trim().max(32).nullable().optional(), jobTitle: z.string().trim().max(120).nullable().optional() });
const registrationRateLimit = { max: process.env.NODE_ENV === "production" ? 5 : 30, timeWindow: "1 hour" } as const;
// Keep the production login window, but do not lock local testers behind it.
// The application-wide limiter remains active in development.
const loginRouteOptions = process.env.NODE_ENV === "production"
  ? { config: { rateLimit: getLoginRateLimit() } }
  : {};

function validationError(message: string, code: string) {
  return Object.assign(new Error(message), { statusCode: 400, code });
}

function checkedEmail(value: string): string {
  const email = normalizeEmail(value);
  if (detectContactInput(value) !== "email" || !isValidEmail(email)) throw validationError("ایمیل معتبر وارد کنید.", "INVALID_EMAIL");
  return email;
}

export function checkedUsername(value: string | null | undefined, required = false): string | null {
  if (value == null || !value.trim()) {
    if (required) throw validationError("نام کاربری را وارد کنید.", "USERNAME_REQUIRED");
    return null;
  }
  const username = normalizeUsername(value);
  if (!isValidUsername(username)) throw validationError("نام کاربری باید انگلیسی، بدون فاصله و بین ۳ تا ۶۴ نویسه باشد.", "INVALID_USERNAME");
  return username;
}

function checkedLoginIdentifier(value: string): { kind: "email" | "username"; value: string } {
  const identifier = value.normalize("NFKC").trim();
  if (detectContactInput(identifier) === "email") return { kind: "email", value: checkedEmail(identifier) };
  const username = checkedUsername(identifier, true);
  return { kind: "username", value: username! };
}

function checkedPhone(value: string | null | undefined): string | null {
  if (value == null || !value.trim()) return null;
  const phone = normalizePhone(value);
  if (detectContactInput(value) !== "phone" || !isValidPhone(phone)) throw validationError("شماره تلفن معتبر وارد کنید.", "INVALID_PHONE");
  return phone;
}

function checkedDisplayName(value: string): string {
  const displayName = normalizeDisplayName(value);
  if (!isValidDisplayName(displayName) || isForbiddenDisplayName(displayName)) throw validationError("این نام کاربری قابل استفاده نیست.", "RESERVED_DISPLAY_NAME");
  return displayName;
}

function checkedNamePart(value: string): string {
  const name = normalizeDisplayName(value);
  if (!isValidDisplayName(name) || isForbiddenDisplayName(name)) throw validationError("نام معتبر وارد کنید.", "INVALID_NAME");
  return name;
}

function checkedNationalId(value: string | null | undefined): string | null {
  if (value == null || !value.trim()) return null;
  const nationalId = normalizeNationalId(value);
  if (!isValidIranianNationalId(nationalId)) throw validationError("شناسه ملی شرکت معتبر نیست.", "INVALID_NATIONAL_ID");
  return nationalId;
}

export function checkedPassword(value: string, context: { email?: string; displayName?: string } = {}): string {
  if (!isStrongPassword(value, context)) throw validationError(`رمز عبور باید حداقل ${PASSWORD_MIN_LENGTH} نویسه و شامل حرف، عدد و نشانه باشد و قابل حدس نباشد.`, "WEAK_PASSWORD");
  return value;
}

export function validateRegistrationIdentity(input: { email: string; username?: string | null; displayName: string; phone?: string | null; firstName?: string; lastName?: string }) {
  const firstName = input.firstName === undefined ? undefined : checkedNamePart(input.firstName);
  const lastName = input.lastName === undefined ? undefined : checkedNamePart(input.lastName);
  const displayName = firstName !== undefined && lastName !== undefined ? checkedDisplayName(`${firstName} ${lastName}`) : checkedDisplayName(input.displayName);
  return {
    email: checkedEmail(input.email),
    ...(input.username === undefined ? {} : { username: checkedUsername(input.username) }),
    displayName,
    phone: checkedPhone(input.phone),
    ...(firstName === undefined ? {} : { firstName }),
    ...(lastName === undefined ? {} : { lastName }),
  };
}

export function parseRegistrationInput(data: unknown) {
  return parse(registrationInput, data);
}

export async function registerAuthRoutes(app: FastifyInstance) {
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret-change-before-production";
  const signRefreshToken = (userId: string) => app.jwt.sign({ sub: userId, type: "refresh", jti: randomUUID() }, { key: refreshSecret, expiresIn: "7d" });

  app.post("/api/v1/auth/register", { config: { rateLimit: registrationRateLimit } }, async (request, reply) => {
    const body = parseRegistrationInput(request.body);
    const { email, username, displayName, phone } = validateRegistrationIdentity(body);
    if (body.registrationKind === "organization" && !phone) throw validationError("تلفن همراه را وارد کنید.", "INVALID_PHONE");
    const password = checkedPassword(body.password, { email, displayName });
    const duplicate = await prisma.user.findFirst({ where: { OR: [{ email }, ...(username ? [{ username }] : []), ...(phone ? [{ phone }] : [])] }, select: { email: true, username: true, phone: true } });
    if (duplicate?.email === email) throw validationError("این ایمیل قبلاً ثبت شده است.", "EMAIL_IN_USE");
    if (username && duplicate?.username === username) throw validationError("این نام کاربری قبلاً ثبت شده است.", "USERNAME_IN_USE");
    if (phone && duplicate?.phone === phone) throw validationError("این شماره تلفن قبلاً ثبت شده است.", "PHONE_IN_USE");
    const workspace = workspaceForRegistration({
      displayName,
      registrationKind: body.registrationKind,
      locale: body.locale,
      companyName: body.companyName,
      activityArea: body.activityArea,
      industry: body.industry,
      employeeCount: body.employeeCount,
      nationalId: body.registrationKind === "organization" ? checkedNationalId(body.nationalId) : null,
    });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({ data: { email, username, displayName, locale: body.locale, phone, jobTitle: body.jobTitle || null, passwordHash, active: false } });
      const organization = await tx.organization.create({
        data: {
          ...workspace,
          ...createSubscriptionFields(body.subscriptionPlan, new Date(), process.env.NODE_ENV === "production"),
          members: { create: { userId: createdUser.id, role: "ORG_ADMIN" } },
          projects: { create: defaultProjectForLocale(body.locale) },
        },
      });
      await tx.auditLog.create({ data: { userId: createdUser.id, organizationId: organization.id, action: "USER_REGISTER", entityType: "User", entityId: createdUser.id, metadata: { registrationKind: body.registrationKind, active: false }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
      return createdUser;
    });
    return reply.code(201).send(envelope({ ...safeUser(user), pendingActivation: true }));
  });

  app.post("/api/v1/auth/login", loginRouteOptions, async (request) => {
    const body = parse(credentials, request.body);
    const loginIdentifier = checkedLoginIdentifier(body.identifier ?? body.email ?? "");
    const user = await prisma.user.findUnique({ where: loginIdentifier.kind === "email" ? { email: loginIdentifier.value } : { username: loginIdentifier.value }, include: { memberships: { where: { active: true }, include: { organization: true } } } });
    if (!user?.active || !(await bcrypt.compare(body.password, user.passwordHash))) {
      await prisma.auditLog.create({ data: { action: "FAILED_LOGIN", metadata: { identifier: loginIdentifier.value, kind: loginIdentifier.kind }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
      throw Object.assign(new Error("ایمیل یا نام کاربری و رمز عبور صحیح نیست."), { statusCode: 401, code: "INVALID_CREDENTIALS" });
    }
    const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: "15m" });
    const refreshToken = signRefreshToken(user.id);
    const loginAuditData = user.memberships.length
      ? user.memberships.map((membership) => ({ userId: user.id, organizationId: membership.organization.id, action: "LOGIN", entityType: "User", entityId: user.id, metadata: { identifierKind: loginIdentifier.kind }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) }))
      : [{ userId: user.id, organizationId: null, action: "LOGIN", entityType: "User", entityId: user.id, metadata: { identifierKind: loginIdentifier.kind }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) }];
    await prisma.$transaction([
      prisma.session.create({ data: { userId: user.id, tokenHash: tokenHash(refreshToken), expiresAt: new Date(Date.now() + 7 * 86400000) } }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      prisma.auditLog.createMany({ data: loginAuditData }),
    ]);
    return envelope({ accessToken, refreshToken, user: safeUser(user), organizations: user.memberships.map((membership: { organization: { id: string; nameFa: string; nameEn: string; active: boolean; subscriptionPlan: string; subscriptionStatus: string; subscriptionExpiresAt: Date | null }; role: string }) => ({ id: membership.organization.id, nameFa: membership.organization.nameFa, nameEn: membership.organization.nameEn, role: membership.role, active: membership.organization.active, subscriptionPlan: membership.organization.subscriptionPlan, subscriptionStatus: membership.organization.subscriptionStatus, subscriptionExpiresAt: membership.organization.subscriptionExpiresAt })) });
  });

  app.post("/api/v1/auth/refresh", async (request) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string() }), request.body);
    let payload: { sub: string; type?: string };
    try { payload = app.jwt.verify(refreshToken, { key: refreshSecret }); } catch { throw Object.assign(new Error("Invalid refresh token"), { statusCode: 401, code: "INVALID_REFRESH_TOKEN" }); }
    const session = await prisma.session.findUnique({ where: { tokenHash: tokenHash(refreshToken) }, include: { user: { select: { active: true } } } });
    if (!session || session.userId !== payload.sub || !session.user.active || session.revokedAt || session.expiresAt < new Date() || payload.type !== "refresh") throw Object.assign(new Error("Refresh token revoked"), { statusCode: 401, code: "REFRESH_REVOKED" });
    const next = signRefreshToken(payload.sub);
    await prisma.$transaction([
      prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
      prisma.session.create({ data: { userId: payload.sub, tokenHash: tokenHash(next), expiresAt: new Date(Date.now() + 7 * 86400000) } }),
    ]);
    return envelope({ accessToken: app.jwt.sign({ sub: payload.sub }, { expiresIn: "15m" }), refreshToken: next });
  });

  app.post("/api/v1/auth/logout", { preHandler: authenticate }, async (request) => {
    const memberships = await prisma.organizationMember.findMany({ where: { userId: request.actor!.userId, active: true }, select: { organizationId: true } });
    const logoutAuditData = memberships.length
      ? memberships.map((membership) => ({ userId: request.actor!.userId, organizationId: membership.organizationId, action: "LOGOUT", entityType: "User", entityId: request.actor!.userId, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) }))
      : [{ userId: request.actor!.userId, organizationId: request.actor?.organizationId ?? null, action: "LOGOUT", entityType: "User", entityId: request.actor!.userId, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) }];
    await prisma.$transaction([
      prisma.session.updateMany({ where: { userId: request.actor!.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.auditLog.createMany({ data: logoutAuditData }),
    ]);
    return envelope({ success: true });
  });

  app.post("/api/v1/auth/forgot-password", async (request) => {
    const { identifier: rawIdentifier, email: legacyEmail } = parse(z.object({ identifier: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).optional(), email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).optional() }).refine((value) => Boolean(value.identifier || value.email), { message: "ایمیل یا نام کاربری را وارد کنید.", path: ["identifier"] }), request.body);
    const loginIdentifier = checkedLoginIdentifier(rawIdentifier ?? legacyEmail ?? "");
    const user = await prisma.user.findUnique({ where: loginIdentifier.kind === "email" ? { email: loginIdentifier.value } : { username: loginIdentifier.value } });
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
    const body = parse(z.object({ token: z.string().min(32), password: z.string().min(1).max(128) }), request.body);
    checkedPassword(body.password);
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: tokenHash(body.token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw Object.assign(new Error("Reset token is invalid or expired"), { statusCode: 400, code: "RESET_TOKEN_INVALID" });
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(body.password, 12) } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.auditLog.create({ data: { userId: reset.userId, action: "PASSWORD_RESET", requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } }),
    ]);
    return envelope({ success: true });
  });

  app.get("/api/v1/profile", { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.actor!.userId } });
    return envelope(safeUser(user));
  });

  app.patch("/api/v1/profile", { preHandler: authenticate }, async (request) => {
    const body = parse(profileInput, request.body);
    const current = await prisma.user.findUniqueOrThrow({ where: { id: request.actor!.userId }, select: { id: true, email: true } });
    const email = body.email === undefined ? undefined : checkedEmail(body.email);
    if (email !== undefined && email !== current.email) {
      const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: current.id } }, select: { id: true } });
      if (duplicate) throw validationError("این ایمیل قبلاً ثبت شده است.", "EMAIL_IN_USE");
    }
    const data = {
      ...(email === undefined ? {} : { email }),
      ...(body.displayName === undefined ? {} : { displayName: checkedDisplayName(body.displayName) }),
      ...(body.locale === undefined ? {} : { locale: body.locale }),
      ...(body.phone === undefined ? {} : { phone: checkedPhone(body.phone) }),
      ...(body.jobTitle === undefined ? {} : { jobTitle: body.jobTitle || null }),
    };
    const user = await prisma.user.update({ where: { id: request.actor!.userId }, data });
    await audit(request, "PROFILE_UPDATE", "User", user.id);
    return envelope(safeUser(user));
  });

  app.post("/api/v1/profile/change-password", { preHandler: authenticate }, async (request) => {
    const body = parse(z.object({ currentPassword: z.string(), newPassword: z.string().min(1).max(128) }), request.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.actor!.userId } });
    if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) throw Object.assign(new Error("Current password is incorrect"), { statusCode: 400, code: "PASSWORD_INCORRECT" });
    checkedPassword(body.newPassword, { email: user.email, displayName: user.displayName });
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 12) } }),
      prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await audit(request, "PASSWORD_CHANGE", "User", user.id);
    return envelope({ success: true });
  });
}
