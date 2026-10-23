import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// This fixture never loads .env, production credentials, or production records.
const root = "C:/NIVASafe";
const release = "organization-image-reuse-20261022-01";
const work = `${root}/.local/${release}`;
const candidate = `${work}/candidate/backend`;
const evidence = `${root}/reports/evidence/${release}/integration`;
const isolatedPort = 53306;
const isolatedDatadir = `${root}/.local/rula-authenticated-e2e-20261017-01/mariadb/data`;
const mysql = "C:/Runtime/mariadb/bin/mysql.exe";
const safeEnv = Object.fromEntries(["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"].filter(name => process.env[name]).map(name => [name, process.env[name]]));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const fixture = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
if (!process.argv.includes("--execute")) {
  console.log(JSON.stringify({ status: "PREPARED_NOT_EXECUTED", database: "Fresh disposable schema on verified loopback 53306 only", providerRequests: 0 }));
  process.exit(0);
}
fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(evidence, { recursive: true });
const runId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
const schema = `nivasafe_test_image_reuse_${randomBytes(6).toString("hex")}`;
assert.match(schema, /^nivasafe_test_image_reuse_[a-f0-9]{12}$/);
const uploadDir = `${work}/integration-uploads-${runId}`;
const lockPath = `${evidence}/execution.lock`;
const lock = fs.openSync(lockPath, "wx");
const resultPath = `${evidence}/result-${runId}.json`;
const result = { release, runId, startedAt: new Date().toISOString(), scriptSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), status: "RUNNING", database: { host: "127.0.0.1", port: isolatedPort, schema }, productionDataAccessed: false, productionConfigModified: false, outboundRequests: 0, checks: [] };
const save = () => fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
const pass = (name, detail = {}) => { result.checks.push({ name, status: "PASS", ...detail }); save(); console.log(JSON.stringify({ check: name, status: "PASS" })); };
const args = ["--no-defaults", "--protocol=tcp", "--host=127.0.0.1", `--port=${isolatedPort}`, "--user=root", "--ssl=0", "--batch", "--raw", "--skip-column-names"];
let isolatedServer, databaseCreated = false, db, app, phase = "prerequisites", restoreStorage, restoreCreate;
const nativeFetch = globalThis.fetch;
function sql(input) {
  const child = spawnSync(mysql, args, { cwd: work, env: safeEnv, input, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 });
  if (child.error || child.status !== 0) throw Object.assign(new Error("Disposable database command failed"), { code: "ISOLATED_SQL_FAILED", exitCode: child.status });
  return child.stdout.trim();
}
function identity() {
  const probe = spawnSync(mysql, args, { cwd: work, env: safeEnv, input: "SELECT @@port, @@datadir;\n", encoding: "utf8", windowsHide: true, timeout: 3000 });
  if (probe.status !== 0) return false;
  assert.equal(probe.stdout.trim().replaceAll("\\", "/").toLowerCase(), `${isolatedPort}\t${isolatedDatadir}/`.toLowerCase(), "Unexpected database identity");
  return true;
}
function snapshotObjects() {
  return fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).sort().map(name => ({ name, sha256: sha(fs.readFileSync(path.join(uploadDir, name))) })) : [];
}
try {
  assert(fs.existsSync(`${candidate}/dist/app.js`), "Build the isolated candidate backend first");
  result.candidateBindings = ["dist/app.js", "dist/core.js", "dist/assessment-image-links.js", "dist/modules/files.js", "dist/modules/assessments.js", "prisma/schema.prisma"].map(file => ({ file, sha256: sha(fs.readFileSync(`${candidate}/${file}`)) }));
  assert(fs.existsSync(isolatedDatadir) && fs.existsSync(mysql), "Verified isolated database runtime is required");
  if (!identity()) {
    isolatedServer = spawn("C:/Runtime/mariadb/bin/mariadbd.exe", ["--no-defaults", "--basedir=C:/Runtime/mariadb", `--datadir=${isolatedDatadir}`, "--bind-address=127.0.0.1", `--port=${isolatedPort}`, `--pid-file=${work}/integration-${runId}.pid`, `--log-error=${work}/integration-${runId}.mysql.log`], { cwd: work, env: safeEnv, windowsHide: true, stdio: "ignore" });
    isolatedServer.on("error", () => undefined);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
      if (identity() || isolatedServer.exitCode !== null) break;
    }
  }
  assert(identity(), "Disposable database did not become ready");
  result.database.datadirVerified = true; result.database.startedServerPid = isolatedServer?.pid ?? null;
  assert.equal(sql(`SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${schema}';\n`), "");
  sql(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`); databaseCreated = true;
  const runtimeEnv = { ...safeEnv, NODE_ENV: "production", APP_URL: "http://127.0.0.1:5199", APP_VERSION: `${release}-integration`, DATABASE_URL: `mysql://root@127.0.0.1:${isolatedPort}/${schema}`, JWT_ACCESS_SECRET: randomBytes(48).toString("base64url"), JWT_REFRESH_SECRET: randomBytes(48).toString("base64url"), SMTP_URL: "smtp://127.0.0.1:9", LOCAL_UPLOAD_DIR: uploadDir, AI_ENABLED: "false", RULA_LOCAL_POSE_ENABLED: "false" };
  if (process.argv.includes("--existing-baseline")) {
    phase = "existing-schema-incremental-migration";
    const priorPath = `${evidence}/result-1792711615647-0f134b5d.json`, prior = JSON.parse(fs.readFileSync(priorPath, "utf8"));
    assert.equal(prior.status, "FAIL"); assert.equal(prior.failure.code, "ISOLATED_MIGRATION_FAILED");
    assert.equal(prior.database.createdSchemaDropped, true); assert.equal(prior.database.startedServerStopped, true);
    result.legacyCleanMigrationChain = { status: "FAIL_PREEXISTING_UNRELATED", migration: "202608240002_global_role", reason: "Duplicates User.globalRole already added by 202608050900_global_super_admin", evidence: priorPath, evidenceSha256: sha(fs.readFileSync(priorPath)), originalMigrationFilesUnchanged: true };
    const baselineSchema = `${root}/.local/image-first-attempt-20261022-01/candidate-r2/backend/prisma/schema.prisma`;
    const baselineManifest = JSON.parse(fs.readFileSync(`${root}/reports/evidence/${release}/baseline.json`, "utf8"));
    assert.equal(sha(fs.readFileSync(baselineSchema)), baselineManifest.files.find(file => file.path === "backend/prisma/schema.prisma").sha256);
    assert(!fs.readFileSync(baselineSchema, "utf8").includes("model AttachmentAssessmentLink"));
    const bootstrap = spawnSync(process.execPath, [`${candidate}/node_modules/prisma/build/index.js`, "db", "push", "--skip-generate", "--schema", baselineSchema], { cwd: candidate, env: runtimeEnv, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    fs.writeFileSync(`${evidence}/baseline-bootstrap-${runId}.txt`, `${bootstrap.stdout ?? ""}\n${bootstrap.stderr ?? ""}`.replace(/mysql:\/\/[^\s"']+/gi, "[DISPOSABLE_DATABASE_URL]"));
    if (bootstrap.error || bootstrap.status !== 0) throw Object.assign(new Error("Disposable baseline schema bootstrap failed"), { code: "ISOLATED_BASELINE_FAILED", exitCode: bootstrap.status });
    const migrationName = "202610220001_attachment_assessment_links", migrationPath = `${candidate}/prisma/migrations/${migrationName}/migration.sql`;
    const manifest = JSON.parse(fs.readFileSync(`${root}/reports/evidence/${release}/candidate.json`, "utf8"));
    assert.equal(sha(fs.readFileSync(migrationPath)), manifest.migrationSha256);
    sql(`USE \`${schema}\`;\n${fs.readFileSync(migrationPath, "utf8")}\n`);
    assert.equal(sql(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${schema}' AND table_name='AttachmentAssessmentLink';`), "1");
    const uniqueColumns = sql(`SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') FROM information_schema.statistics WHERE table_schema='${schema}' AND table_name='AttachmentAssessmentLink' AND index_name='AttachmentAssessmentLink_attachment_target_key' AND non_unique=0;`);
    assert.equal(uniqueColumns, "attachmentId,entityType,entityId");
    assert.equal(sql(`SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema='${schema}' AND table_name='AttachmentAssessmentLink' AND referenced_table_name IN ('Attachment','Organization');`), "2");
    assert.equal(sql(`SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') FROM information_schema.statistics WHERE table_schema='${schema}' AND table_name='AttachmentAssessmentLink' AND index_name='AttachmentAssessmentLink_organization_target_idx';`), "organizationId,entityType,entityId");
    result.incrementalMigration = { status: "PASS", mode: "frozen-existing-schema-plus-only-reviewed-additive-DDL", baselineSchemaSha256: sha(fs.readFileSync(baselineSchema)), name: migrationName, sha256: sha(fs.readFileSync(migrationPath)), uniqueConstraintVerified: true, foreignKeysVerified: 2, targetIndexVerified: true };
    pass("frozen-existing-schema-bootstrap-and-reviewed-additive-migration-with-unique-foreign-key-target-index-verification");
  } else {
    phase = "clean-migration";
    const migrate = spawnSync(process.execPath, [`${candidate}/node_modules/prisma/build/index.js`, "migrate", "deploy", "--schema", `${candidate}/prisma/schema.prisma`], { cwd: candidate, env: runtimeEnv, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    fs.writeFileSync(`${evidence}/migration-${runId}.txt`, `${migrate.stdout ?? ""}\n${migrate.stderr ?? ""}`.replace(/mysql:\/\/[^\s"']+/gi, "[DISPOSABLE_DATABASE_URL]"));
    if (migrate.error || migrate.status !== 0) throw Object.assign(new Error("Clean disposable migration failed"), { code: "ISOLATED_MIGRATION_FAILED", exitCode: migrate.status });
    const migrationRows = sql(`SELECT migration_name FROM \`${schema}\`._prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name;\n`).split("\n").filter(Boolean);
    assert(migrationRows.some(name => /attachment.*link|image.*reuse/i.test(name)), "The new attachment-link migration must execute");
    result.migrations = migrationRows;
    pass("clean-schema-initialization-through-committed-migrations", { count: migrationRows.length });
  }
  phase = "isolated-runtime-import";
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, runtimeEnv); process.chdir(candidate);
  globalThis.fetch = async () => { result.outboundRequests += 1; throw new Error("External HTTP is disabled in organization-image reuse integration"); };
  ({ prisma: db } = await import(pathToFileURL(`${candidate}/dist/core.js`).href));
  assert.equal((await db.$queryRaw`SELECT DATABASE() AS name`)[0].name, schema);
  assert.equal(await db.user.count(), 0);
  const { storage } = await import(pathToFileURL(`${candidate}/dist/storage.js`).href);
  const { default: bcrypt } = await import(pathToFileURL(`${candidate}/node_modules/bcryptjs/index.js`).href);
  phase = "synthetic-account-fixtures";
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 4);
  const org = randomUUID(), foreignOrg = randomUUID(), projectId = randomUUID(), foreignProject = randomUUID();
  const admin = randomUUID(), assessor = randomUUID(), viewer = randomUUID();
  await db.$transaction(async tx => {
    for (const [id, suffix] of [[admin, "admin"], [assessor, "assessor"], [viewer, "viewer"]]) await tx.user.create({ data: { id, email: `${suffix}.${runId}@example.test`, passwordHash, displayName: `Synthetic ${suffix}`, active: true, globalRole: "USER" } });
    await tx.organization.create({ data: { id: org, nameFa: "Synthetic reuse QA", nameEn: "Synthetic reuse QA", subscriptionProvider: "synthetic-qa", subscriptionStatus: "ACTIVE", subscriptionExpiresAt: new Date(Date.now() + 3_600_000), members: { create: [{ userId: admin, role: "ORG_ADMIN" }, { userId: assessor, role: "HSE_SPECIALIST" }, { userId: viewer, role: "VIEWER" }] } } });
    await tx.organization.create({ data: { id: foreignOrg, nameFa: "Foreign synthetic QA", nameEn: "Foreign synthetic QA", subscriptionProvider: "synthetic-qa", subscriptionStatus: "ACTIVE", subscriptionExpiresAt: new Date(Date.now() + 3_600_000) } });
    await tx.project.create({ data: { id: projectId, organizationId: org, name: "Synthetic reuse QA", code: "REUSE-QA" } });
    await tx.project.create({ data: { id: foreignProject, organizationId: foreignOrg, name: "Foreign synthetic QA", code: "FOREIGN-QA" } });
  });
  phase = "synthetic-assessment-fixtures";
  const makeFmea = (suffix, organizationId = org, targetProject = projectId, deletedAt = null) => db.fmeaAssessment.create({ data: { organizationId, projectId: targetProject, title: `Synthetic FMEA ${suffix}`, code: `REUSE-${suffix}-${runId}`, deletedAt } });
  const makeRula = suffix => db.rulaAssessment.create({ data: { organizationId: org, projectId, title: `Synthetic RULA ${suffix}`, inputs: { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, force: 0, muscleUse: false }, score: 1, actionLevel: 1, explanation: "Synthetic fixture" } });
  const [fmeaA, fmeaB, fmeaCap, fmeaDeleted, fmeaForeign, rulaA, rulaB, rulaCap] = await Promise.all([makeFmea("A"), makeFmea("B"), makeFmea("CAP"), makeFmea("DELETED", org, projectId, new Date()), makeFmea("FOREIGN", foreignOrg, foreignProject), makeRula("A"), makeRula("B"), makeRula("CAP")]);
  phase = "isolated-app-startup";
  const { buildApp } = await import(pathToFileURL(`${candidate}/dist/app.js`).href);
  app = await buildApp(); app.log.level = "silent"; await app.ready();
  const tokens = new Map([admin, assessor, viewer].map(id => [id, app.jwt.sign({ sub: id }, { expiresIn: "1h" })]));
  let requests = 0;
  async function request(route, { method = "GET", body, multipart, expected = [200], user = assessor, organizationId = org, authenticated = true, binary = false } = {}) {
    requests += 1;
    const headers = { accept: binary ? "*/*" : "application/json", "user-agent": "NIVASafe-Isolated-Reuse-QA/1.0" };
    if (authenticated) { headers.authorization = `Bearer ${tokens.get(user)}`; headers["x-organization-id"] = organizationId; }
    if (multipart) headers["content-type"] = multipart.contentType;
    else if (body !== undefined) headers["content-type"] = "application/json";
    const response = await app.inject({ method, url: `/api/v1${route}`, headers, payload: multipart?.payload ?? (body === undefined ? undefined : JSON.stringify(body)), remoteAddress: `127.0.0.${1 + Math.floor(requests / 80)}` });
    if (!expected.includes(response.statusCode)) {
      let code; try { code = response.json().error?.code; } catch { /* Never persist private error response bytes. */ }
      result.lastFailure = { route, status: response.statusCode, code: typeof code === "string" && /^[A-Z0-9_]{1,80}$/.test(code) ? code : null };
      throw new Error("Unexpected isolated API status");
    }
    return { status: response.statusCode, payload: binary ? response.rawPayload : response.json(), headers: response.headers };
  }
  function uploadForm(name = "canonical.png", fields = {}) {
    const boundary = `reuse-${randomBytes(8).toString("hex")}`;
    const chunks = Object.entries(fields).map(([key, value]) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
    return { contentType: `multipart/form-data; boundary=${boundary}`, payload: Buffer.concat([...chunks, Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`), fixture, Buffer.from(`\r\n--${boundary}--\r\n`)]) };
  }
  phase = "canonical-upload";
  const canonical = (await request("/files", { method: "POST", multipart: uploadForm(), expected: [201] })).payload.data;
  assert.equal(canonical.kind, "IMAGE"); assert.equal(canonical.size, fixture.length);
  assert.deepEqual(fs.readFileSync(path.join(uploadDir, canonical.objectKey)), fixture);
  const createAttachment = async (suffix, overrides = {}) => {
    const objectKey = `${randomUUID()}.png`;
    await storage.put(objectKey, fixture, "image/png");
    return db.attachment.create({ data: { organizationId: org, uploadedById: admin, kind: "IMAGE", originalName: `fixture-${suffix}.png`, objectKey, mimeType: "image/png", size: fixture.length, checksum: sha(fixture), ...overrides } });
  };
  const images = [];
  for (let index = 0; index < 5; index += 1) images.push(await createAttachment(String(index)));
  const direct = await createAttachment("direct", { entityType: "FmeaAssessment", entityId: fmeaB.id });
  const foreignImage = await createAttachment("foreign", { organizationId: foreignOrg });
  const deletedImage = await createAttachment("deleted", { deletedAt: new Date() });
  const document = await createAttachment("document", { kind: "DOCUMENT", mimeType: "application/pdf", originalName: "fixture.pdf" });
  const oversized = await createAttachment("oversized", { size: 10 * 1024 * 1024 + 1 });
  const zeroByte = await createAttachment("empty", { size: 0 });
  const libraryBefore = (await request("/files?limit=100")).payload;
  const attachmentCount = await db.attachment.count();
  const objectsBefore = snapshotObjects();
  let putCalls = 0, createCalls = 0;
  const originalPut = storage.put.bind(storage); storage.put = async (...putArgs) => { putCalls += 1; return originalPut(...putArgs); }; restoreStorage = () => { storage.put = originalPut; };
  const originalCreate = db.attachment.create.bind(db.attachment); db.attachment.create = async createArgs => { createCalls += 1; return originalCreate(createArgs); }; restoreCreate = () => { db.attachment.create = originalCreate; };
  const context = (type, id) => ({ entityType: type, entityId: id });
  const link = (id, entityType, entityId, options = {}) => request(`/files/${id}/assessment-links`, { method: "POST", body: context(entityType, entityId), expected: [200, 201], ...options });
  const unlink = (id, entityType, entityId, options = {}) => request(`/files/${id}/assessment-links`, { method: "DELETE", body: context(entityType, entityId), ...options });
  const filesFor = async (entityType, entityId) => (await request(`/files?entityType=${entityType}&entityId=${entityId}&limit=100`)).payload.data;
  phase = "durable-idempotent-links";
  await Promise.all(Array.from({ length: 5 }, () => link(canonical.id, "FmeaAssessment", fmeaA.id)));
  await link(canonical.id, "FmeaAssessment", fmeaB.id);
  await link(canonical.id, "RulaAssessment", rulaA.id);
  await link(canonical.id, "RulaAssessment", rulaB.id);
  const linkedRows = await db.$queryRaw`SELECT attachmentId, entityType, entityId FROM AttachmentAssessmentLink WHERE attachmentId = ${canonical.id}`;
  assert.equal(linkedRows.length, 4);
  for (const [entityType, assessmentId] of [["FmeaAssessment", fmeaA.id], ["FmeaAssessment", fmeaB.id], ["RulaAssessment", rulaA.id], ["RulaAssessment", rulaB.id]]) {
    const rows = await filesFor(entityType, assessmentId);
    assert.equal(rows.filter(row => row.id === canonical.id).length, 1);
    assert.equal(rows.find(row => row.id === canonical.id).objectKey, canonical.objectKey);
  }
  assert.equal((await db.attachment.findUnique({ where: { id: canonical.id } })).entityType, null);
  const reopened = (await request(`/rula/${rulaA.id}`)).payload.data;
  assert.equal(reopened.postureImages.filter(item => item.id === canonical.id).length, 1);
  const rulaList = (await request("/rula?limit=100")).payload.data;
  assert.equal(rulaList.find(item => item.id === rulaA.id).postureImages.filter(item => item.id === canonical.id).length, 1);
  const referenceUpdate = await request(`/rula/${rulaA.id}`, { method: "PATCH", body: { activityInfo: { jobTitle: "Synthetic reuse QA", taskDescription: "Inspect the synthetic reference fixture.", postureImageAttachmentId: canonical.id } } });
  assert.equal(referenceUpdate.payload.data.activityInfo.postureImageAttachmentId, canonical.id);
  assert.equal(putCalls, 0); assert.equal(createCalls, 0); assert.equal(await db.attachment.count(), attachmentCount);
  assert.deepEqual(snapshotObjects(), objectsBefore);
  assert.equal((await request("/files?limit=100")).payload.meta.total, libraryBefore.meta.total);
  pass("one-canonical-image-reused-by-four-assessments-with-idempotent-concurrent-link-and-no-storage-or-attachment-create");
  phase = "authorization-and-validation";
  await link(canonical.id, "FmeaAssessment", fmeaA.id, { authenticated: false, expected: [401] });
  await link(canonical.id, "FmeaAssessment", fmeaA.id, { user: viewer, expected: [403] });
  await unlink(canonical.id, "FmeaAssessment", fmeaA.id, { user: viewer, expected: [403] });
  await link(foreignImage.id, "FmeaAssessment", fmeaA.id, { expected: [404] });
  await link(canonical.id, "FmeaAssessment", fmeaForeign.id, { expected: [404] });
  await link(canonical.id, "FmeaAssessment", fmeaDeleted.id, { expected: [404] });
  await link(deletedImage.id, "FmeaAssessment", fmeaA.id, { expected: [404] });
  for (const item of [document, oversized, zeroByte]) await link(item.id, "FmeaAssessment", fmeaA.id, { expected: [400, 413, 415] });
  await request(`/files/${canonical.id}/assessment-links`, { method: "POST", body: { entityType: "KnowledgeDocument", entityId: fmeaA.id }, expected: [400] });
  await request(`/files/${canonical.id}/assessment-links`, { method: "POST", body: { entityType: "FmeaAssessment", entityId: "invalid" }, expected: [400] });
  await request(`/files/${canonical.id}/assessment-links`, { method: "POST", body: { entityType: "FmeaAssessment", entityId: fmeaA.id, organizationId: foreignOrg }, expected: [400] });
  const publicLibrary = (await request("/files?limit=100", { user: viewer })).payload.data;
  assert(!publicLibrary.some(item => item.id === foreignImage.id || item.id === deletedImage.id));
  await request(`/files/${foreignImage.id}/download`, { expected: [404] });
  pass("authentication-role-organization-type-size-deletion-and-identifier-boundaries");
  phase = "combined-legacy-and-link-caps";
  await link(images[0].id, "FmeaAssessment", fmeaB.id);
  await link(direct.id, "FmeaAssessment", fmeaB.id);
  assert.equal((await filesFor("FmeaAssessment", fmeaB.id)).length, 3);
  const legacyLimit = await link(images[1].id, "FmeaAssessment", fmeaB.id, { expected: [409] });
  assert.equal(legacyLimit.payload.error.code, "FMEA_ATTACHMENT_IMAGE_COUNT_LIMIT");
  for (const [entityType, target, cap] of [["FmeaAssessment", fmeaCap.id, 3], ["RulaAssessment", rulaCap.id, 4]]) {
    const outcomes = await Promise.all(images.map(item => link(item.id, entityType, target, { expected: [200, 201, 409] })));
    assert.equal(outcomes.filter(response => response.status !== 409).length, cap);
    assert.equal(outcomes.filter(response => response.status === 409).length, images.length - cap);
    for (const denied of outcomes.filter(response => response.status === 409)) assert.equal(denied.payload.error.code, entityType === "FmeaAssessment" ? "FMEA_ATTACHMENT_IMAGE_COUNT_LIMIT" : "RULA_ATTACHMENT_IMAGE_COUNT_LIMIT");
    const rows = await filesFor(entityType, target);
    assert.equal(rows.length, cap);
    await link(rows[0].id, entityType, target);
    assert.equal((await filesFor(entityType, target)).length, cap);
  }
  pass("combined-legacy-and-link-counts-and-concurrent-fmea-three-rula-four-caps-with-idempotency-at-cap");
  phase = "unlink-preservation";
  await request(`/files/${canonical.id}`, { method: "DELETE", user: admin, expected: [409] });
  const referenced = await unlink(canonical.id, "RulaAssessment", rulaA.id, { expected: [409] });
  assert.equal(referenced.payload.error.code, "RULA_IMAGE_RESULT_IN_USE");
  assert((await filesFor("RulaAssessment", rulaA.id)).some(item => item.id === canonical.id));
  await unlink(canonical.id, "FmeaAssessment", fmeaA.id);
  await unlink(canonical.id, "FmeaAssessment", fmeaA.id);
  assert(!(await filesFor("FmeaAssessment", fmeaA.id)).some(item => item.id === canonical.id));
  assert((await filesFor("RulaAssessment", rulaA.id)).some(item => item.id === canonical.id));
  assert((await db.attachment.findUnique({ where: { id: canonical.id } })).deletedAt === null);
  assert.deepEqual(fs.readFileSync(path.join(uploadDir, canonical.objectKey)), fixture);
  await link(direct.id, "RulaAssessment", rulaB.id);
  await unlink(direct.id, "FmeaAssessment", fmeaB.id);
  assert(!(await filesFor("FmeaAssessment", fmeaB.id)).some(item => item.id === direct.id));
  assert((await filesFor("RulaAssessment", rulaB.id)).some(item => item.id === direct.id));
  assert.equal((await db.attachment.findUnique({ where: { id: direct.id } })).deletedAt, null);
  await db.rulaAssessment.update({ where: { id: rulaB.id }, data: { status: "ARCHIVED" } });
  await link(images[0].id, "RulaAssessment", rulaB.id, { expected: [404] });
  await unlink(direct.id, "RulaAssessment", rulaB.id);
  assert(!(await filesFor("RulaAssessment", rulaB.id)).some(item => item.id === direct.id));
  assert((await filesFor("RulaAssessment", rulaB.id)).some(item => item.id === canonical.id));
  assert.equal((await db.attachment.findUnique({ where: { id: direct.id } })).deletedAt, null);
  assert.equal(await db.attachment.count(), attachmentCount); assert.equal(putCalls, 0); assert.equal(createCalls, 0);
  assert.deepEqual(snapshotObjects(), objectsBefore); assert.equal(result.outboundRequests, 0);
  for (const binding of result.candidateBindings) assert.equal(sha(fs.readFileSync(`${candidate}/${binding.file}`)), binding.sha256, "Integration candidate changed during execution");
  pass("unlink-removes-only-one-association-and-preserves-library-original-object-and-other-assessments");
  result.status = "PASS"; result.requests = requests;
} catch (error) {
  const safeMessage = String(error?.message ?? "").replace(/mysql:\/\/[^\s"']+/gi, "[DISPOSABLE_DATABASE_URL]").replace(/[A-Za-z0-9_-]{40,}/gu, "[LONG_TEST_VALUE]").slice(0, 1500);
  result.status = "FAIL"; result.failure = { phase, name: String(error?.name ?? "ExecutionError").slice(0, 80), diagnostic: safeMessage, code: typeof error?.code === "string" && /^[A-Z0-9_]{1,80}$/.test(error.code) ? error.code : null, ...(Number.isInteger(error?.exitCode) ? { exitCode: error.exitCode } : {}) };
  process.exitCode = 1;
} finally {
  if (restoreStorage) restoreStorage(); if (restoreCreate) restoreCreate();
  if (app) await app.close().catch(() => { process.exitCode = 1; });
  if (db) await db.$disconnect().catch(() => { process.exitCode = 1; });
  try {
    if (databaseCreated) { assert(identity()); sql(`DROP DATABASE \`${schema}\`;\n`); result.database.createdSchemaDropped = true; }
    const absoluteUpload = path.resolve(uploadDir), parent = path.resolve(work);
    assert(absoluteUpload.startsWith(`${parent}${path.sep}`) && path.basename(absoluteUpload) === `integration-uploads-${runId}`);
    fs.rmSync(absoluteUpload, { recursive: true, force: true }); result.uploadFixturesRemoved = true;
    if (isolatedServer && isolatedServer.exitCode === null) {
      assert(identity());
      const stop = spawnSync("C:/Runtime/mariadb/bin/mysqladmin.exe", [...args.slice(0, 6), "shutdown"], { env: safeEnv, windowsHide: true, encoding: "utf8", timeout: 15_000 });
      if (stop.status !== 0) isolatedServer.kill();
      await Promise.race([new Promise(resolve => isolatedServer.once("exit", resolve)), new Promise(resolve => setTimeout(resolve, 3000))]);
      result.database.startedServerStopped = isolatedServer.exitCode !== null;
    }
  } catch { result.cleanupStatus = "FAIL"; result.status = "FAIL"; process.exitCode = 1; }
  globalThis.fetch = nativeFetch;
  result.finishedAt = new Date().toISOString(); save(); fs.closeSync(lock); fs.unlinkSync(lockPath);
  console.log(JSON.stringify({ status: result.status, checks: result.checks.length, failure: result.failure ?? null, resultPath }));
}
