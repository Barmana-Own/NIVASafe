import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { envelope, prisma } from "./core.js";
import { registerActionRoutes } from "./modules/actions.js";
import { registerAIRoutes } from "./modules/ai.js";
import { registerAssessmentRoutes } from "./modules/assessments.js";
import { registerAuditRoutes } from "./modules/audit.js";
import { registerAuthRoutes } from "./modules/auth.js";
import { registerAdminRoutes } from "./modules/admin.js";
import { registerDashboardRoutes } from "./modules/dashboard.js";
import { registerFileRoutes } from "./modules/files.js";
import { registerKnowledgeRoutes } from "./modules/knowledge.js";
import { registerNotificationRoutes } from "./modules/notifications.js";
import { registerOrganizationRoutes } from "./modules/organizations.js";
import { registerSubscriptionRoutes } from "./modules/subscriptions.js";
import { registerProjectRoutes } from "./modules/projects.js";
import { registerReportRoutes } from "./modules/reports.js";
import { registerUserRoutes } from "./modules/users.js";

export async function buildApp() {
  const app = Fastify({ trustProxy: ["127.0.0.1", "::1"], logger: { redact: ["req.headers.authorization", "req.body.password", "req.body.refreshToken"] }, genReqId: () => randomUUID(), bodyLimit: 32 * 1024 * 1024 });
  const configuredOrigins = (process.env.APP_URL ?? "http://localhost:5043")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") {
    configuredOrigins.push("http://localhost:5043", "http://127.0.0.1:5043");
  }
  await app.register(cors, { origin: [...new Set(configuredOrigins)], credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? "development-access-secret-change-before-production" });
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 8 } });
  await app.register(swagger, { openapi: { info: { title: "NIVASafe API", version: "1.0.0" } } });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, requestId: request.id });
    const err = error as Error & { statusCode?: number; code?: string };
    let status = typeof err.statusCode === "number" ? err.statusCode : 500;
    let code = err.code ?? "INTERNAL_ERROR";
    let message = err.message;
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    if (typeof prismaError?.code === "string") {
      if (prismaError.code === "P2002") { status = 409; code = "DUPLICATE_VALUE"; message = "A record with these values already exists"; }
      if (prismaError.code === "P2003") { status = 409; code = "RELATION_CONFLICT"; message = "The selected record is referenced or does not belong to this context"; }
      if (prismaError.code === "P2025") { status = 404; code = "NOT_FOUND"; message = "Record not found"; }
    }
    return reply.status(status).send({ error: { code, message: status === 500 && process.env.NODE_ENV === "production" ? "Unexpected server error" : message, requestId: request.id } });
  });
  app.get("/api/v1/health", async (_, reply) => { let database: "up" | "down" = "up"; try { await prisma.$queryRaw`SELECT 1`; } catch { database = "down"; } return reply.code(database === "up" ? 200 : 503).send(envelope({ status: database === "up" ? "healthy" : "unhealthy", database, databaseEngine: "mysql", redis: process.env.REDIS_URL ? "configured" : "disabled", storage: process.env.S3_ENDPOINT ? "s3" : "local", ai: "optional-fallback-ready", version: process.env.APP_VERSION ?? "0.1.0" })); });

  await registerAuthRoutes(app); await registerAdminRoutes(app); await registerUserRoutes(app); await registerOrganizationRoutes(app); await registerSubscriptionRoutes(app); await registerProjectRoutes(app); await registerAssessmentRoutes(app); await registerActionRoutes(app); await registerFileRoutes(app); await registerReportRoutes(app); await registerKnowledgeRoutes(app); await registerAIRoutes(app); await registerNotificationRoutes(app); await registerDashboardRoutes(app); await registerAuditRoutes(app);
  return app;
}
