import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFileSync(join(root, file), "utf8");
const checks = [];
function check(name, condition, detail = "") { checks.push({ name, ok: Boolean(condition), detail }); if (!condition) process.exitCode = 1; }

const schema = read("backend/prisma/schema.prisma");
const compose = read("docker-compose.yml");
const dockerEnv = read(".env.docker.example");
const accountPages = read("frontend/src/features/account/AccountPages.tsx");
const aiProvider = read("backend/src/ai-provider.ts");
const manualSchema = read("database/nivasafe-mysql-schema.sql");
const manifest = JSON.parse(read("frontend/public/manifest.webmanifest"));
const serviceWorker = read("frontend/public/sw.js");
const pwaManager = read("frontend/src/pwa/PwaManager.tsx");
const iisPwaConfig = read("frontend/public/web.config");
const validation = read("shared/domain/src/validation.ts");
const authModule = read("backend/src/modules/auth.ts");
const subscriptionModule = read("backend/src/modules/subscriptions.ts");
const subscriptionSchema = read("backend/prisma/schema.prisma");
const authGuard = read("backend/src/auth-guard.ts");
const organizationModule = read("backend/src/modules/organizations.ts");
const appRoutes = read("frontend/src/App.tsx");
const appLayout = read("frontend/src/layout/AppLayout.tsx");
const apiClient = read("frontend/src/api/client.ts");
const webPackage = JSON.parse(read("frontend/package.json"));
const apiPackage = JSON.parse(read("backend/package.json"));
const migrationDir = join(root, "backend/prisma/migrations");
const migrationFiles = readdirSync(migrationDir, { recursive: true }).filter((file) => String(file).endsWith("migration.sql"));
const migrationSql = migrationFiles.map((file) => read(`backend/prisma/migrations/${file}`)).join("\n");

check("Prisma provider is MySQL", /provider\s*=\s*"mysql"/.test(schema));
check("No PostgreSQL configuration remains", !/postgres(?:ql)?/i.test([schema, compose, migrationSql].join("\n")));
check("Docker Compose uses MySQL 8", /image:\s*mysql:8\.4/.test(compose));
check("Frontend is React", Boolean(webPackage.dependencies?.react && webPackage.dependencies?.vite));
check("Backend is Node/Fastify", Boolean(apiPackage.dependencies?.fastify && apiPackage.scripts?.start?.includes("node")));
check("Frontend port is 5043", /port:\s*5043/.test(read("frontend/vite.config.ts")));
check("Backend port is 5044", /5044/.test(read("backend/src/config.ts")));
check("Production environment templates exist", existsSync(join(root, ".env.production.example")) && existsSync(join(root, ".env.docker.example")));
check("Docker DATABASE_URL uses mysql service hostname", /@mysql:3306\/nivasafe/.test(dockerEnv));
check("Production requires SMTP for invitations and password reset", /SMTP_URL:\s*\$\{SMTP_URL:\?/.test(compose));
check("Demo login credentials are not shipped", !/admin@nivasafe\.local|Demo123!/.test(accountPages));
check("MySQL migration exists", migrationFiles.length > 0 && /CREATE TABLE `User`/.test(migrationSql));
check("All 29 Prisma tables are in migration", (migrationSql.match(/CREATE TABLE/g) ?? []).length === 29, String((migrationSql.match(/CREATE TABLE/g) ?? []).length));
check("Production provisioning script exists", existsSync(join(root, "backend/prisma/provision.ts")));
check("Manual MySQL schema export exists", existsSync(join(root, "database/nivasafe-mysql-schema.sql")) && /CREATE TABLE `User`/.test(manualSchema) && /CREATE TABLE `AIUsageRecord`/.test(manualSchema) && /`employeeCount`/.test(manualSchema) && /`visibleUserIds`/.test(manualSchema));
check("External AI adapters are implemented", /api\.arvancloudai\.ir\/v1/.test(aiProvider) && /api\.openai\.com\/v1\/responses/.test(aiProvider) && /generativelanguage\.googleapis\.com/.test(aiProvider) && /api\.anthropic\.com\/v1\/messages/.test(aiProvider));
check("Runtime smoke test exists", existsSync(join(root, "scripts/smoke-test.mjs")));
check("Database backup and restore scripts exist", existsSync(join(root, "scripts/mysql-backup.mjs")) && existsSync(join(root, "scripts/mysql-restore.mjs")));
check("PWA manifest is installable", manifest.display === "standalone" && manifest.scope === "/" && manifest.start_url === "/" && manifest.icons?.some((icon) => icon.sizes === "192x192") && manifest.icons?.some((icon) => icon.sizes === "512x512"));
check("PWA shell and offline fallback exist", existsSync(join(root, "frontend/public/sw.js")) && existsSync(join(root, "frontend/public/offline.html")) && /caches\.open\(STATIC_CACHE\)/.test(serviceWorker));
check("PWA update flow is user-controlled", /SKIP_WAITING/.test(serviceWorker) && /updateViaCache:\s*"none"/.test(pwaManager) && /controllerchange/.test(pwaManager));
check("IIS serves PWA metadata with safe cache headers", /\.webmanifest/.test(iisPwaConfig) && /no-cache/.test(iisPwaConfig) && /no-store/.test(iisPwaConfig));
check("Registration input security is enforced in API and shared domain", /isValidEmail/.test(validation) && /isValidPhone/.test(validation) && /isForbiddenDisplayName/.test(validation) && /isStrongPassword/.test(validation) && /timeWindow: "1 hour"/.test(authModule));
check("Multi-organization subscriptions are independently modeled and gated", /subscriptionPlan/.test(subscriptionSchema) && /subscriptionStatus/.test(subscriptionSchema) && /SUBSCRIPTION_REQUIRED/.test(authGuard) && /subscription\/checkout/.test(subscriptionModule));
check("Multi-organization account switching and creation are membership-scoped", /OrganizationMember/.test(subscriptionSchema) && /app\.post\("\/api\/v1\/organizations"[\s\S]*allowUnsubscribed: true/.test(organizationModule) && /selectOrganization/.test(apiClient) && /path: "\/organizations"[\s\S]*scope: "all"/.test(appLayout) && /<Route path="organizations" element={<OrganizationsPage \/>}/.test(appRoutes));

const contract = spawnSync(process.execPath, [join(root, "scripts/check-api-contract.mjs")], { encoding: "utf8" });
check("Frontend API paths match backend routes", contract.status === 0, `${contract.stdout}${contract.stderr}`.trim());

for (const item of checks) console.log(`${item.ok ? "[OK]" : "[FAIL]"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
if (process.exitCode) throw new Error("Release verification failed");
console.log(`\nRelease verification passed (${checks.length} checks).`);
