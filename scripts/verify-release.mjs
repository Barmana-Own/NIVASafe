import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), "utf8");
const checks = [];
function check(name, condition, detail = "") { checks.push({ name, ok: Boolean(condition), detail }); if (!condition) process.exitCode = 1; }

const schema = read("apps/api/prisma/schema.prisma");
const compose = read("docker-compose.yml");
const dockerEnv = read(".env.docker.example");
const accountPages = read("apps/web/src/features/account/AccountPages.tsx");
const aiProvider = read("apps/api/src/ai-provider.ts");
const webPackage = JSON.parse(read("apps/web/package.json"));
const apiPackage = JSON.parse(read("apps/api/package.json"));
const migrationDir = join(root, "apps/api/prisma/migrations");
const migrationFiles = readdirSync(migrationDir, { recursive: true }).filter((file) => String(file).endsWith("migration.sql"));
const migrationSql = migrationFiles.map((file) => read(`apps/api/prisma/migrations/${file}`)).join("\n");

check("Prisma provider is MySQL", /provider\s*=\s*"mysql"/.test(schema));
check("No PostgreSQL configuration remains", !/postgres(?:ql)?/i.test([schema, compose, migrationSql].join("\n")));
check("Docker Compose uses MySQL 8", /image:\s*mysql:8\.4/.test(compose));
check("Frontend is React", Boolean(webPackage.dependencies?.react && webPackage.dependencies?.vite));
check("Backend is Node/Fastify", Boolean(apiPackage.dependencies?.fastify && apiPackage.scripts?.start?.includes("node")));
check("Frontend port is 5043", /port:\s*5043/.test(read("apps/web/vite.config.ts")));
check("Backend port is 5044", /5044/.test(read("apps/api/src/config.ts")));
check("Production environment templates exist", existsSync(join(root, ".env.production.example")) && existsSync(join(root, ".env.docker.example")));
check("Docker DATABASE_URL uses mysql service hostname", /@mysql:3306\/nivasafe/.test(dockerEnv));
check("Production requires SMTP for invitations and password reset", /SMTP_URL:\s*\$\{SMTP_URL:\?/.test(compose));
check("Demo login credentials are development-only", /import\.meta\.env\.DEV/.test(accountPages));
check("MySQL migration exists", migrationFiles.length === 1 && /CREATE TABLE `User`/.test(migrationSql));
check("All 27 Prisma tables are in migration", (migrationSql.match(/CREATE TABLE/g) ?? []).length === 27, String((migrationSql.match(/CREATE TABLE/g) ?? []).length));
check("Production provisioning script exists", existsSync(join(root, "apps/api/prisma/provision.ts")));
check("Manual MySQL schema export exists", existsSync(join(root, "database/nivasafe-mysql-schema.sql")) && read("database/nivasafe-mysql-schema.sql") === migrationSql.trimStart());
check("External AI adapters are implemented", /api\.openai\.com\/v1\/responses/.test(aiProvider) && /generativelanguage\.googleapis\.com/.test(aiProvider) && /api\.anthropic\.com\/v1\/messages/.test(aiProvider));
check("Runtime smoke test exists", existsSync(join(root, "scripts/smoke-test.mjs")));
check("Database backup and restore scripts exist", existsSync(join(root, "scripts/mysql-backup.mjs")) && existsSync(join(root, "scripts/mysql-restore.mjs")));

const contract = spawnSync(process.execPath, [join(root, "scripts/check-api-contract.mjs")], { encoding: "utf8" });
check("Frontend API paths match backend routes", contract.status === 0, `${contract.stdout}${contract.stderr}`.trim());

for (const item of checks) console.log(`${item.ok ? "[OK]" : "[FAIL]"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
if (process.exitCode) throw new Error("Release verification failed");
console.log(`\nRelease verification passed (${checks.length} checks).`);
