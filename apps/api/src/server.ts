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

await app.listen({ port, host: "0.0.0.0" });
app.log.info(`NIVASafe API is listening on http://localhost:${port}`);

async function shutdown() {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
