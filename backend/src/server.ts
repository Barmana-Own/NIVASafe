import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envCandidates = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];
for (const envFile of envCandidates) {
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
    break;
  }
}

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_ENV ??= "development";
  process.env.APP_URL ??= "http://localhost:5043";
  process.env.DATABASE_URL ??= "mysql://root@127.0.0.1:3306/nivasafe";
}

const [{ validateEnvironment }, { buildApp }, { prisma }] = await Promise.all([import("./config.js"), import("./app.js"), import("./core.js")]);
const { port } = validateEnvironment();
const app = await buildApp();
const host = process.env.HOST ?? (process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0");

await app.listen({ port, host });
app.log.info(`NIVASafe API is listening on http://${host}:${port}`);

async function shutdown() {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
