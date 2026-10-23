import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

// Preparation and syntax checking never bootstrap a database or call the provider.
if (!process.argv.includes("--execute")) {
  console.log(JSON.stringify({ status: "PREPARED_NOT_EXECUTED", prerequisite: "Explicit root authorization, then run with --execute", providerBudget: { total: 4, rula: 2, fmea: 2 } }));
  process.exit(0);
}

const root = "C:/NIVASafe";
const release = "assessment-image-activation-20261022-01";
const work = `${root}/.local/${release}`;
const runtime = `${work}/candidate/backend`;
const evidence = `${root}/reports/evidence/${release}/synthetic-integration`;
const endpoint = "https://api.arvancloudai.ir/v1/chat/completions";
const isolatedDataDirectory = `${root}/.local/rula-authenticated-e2e-20261017-01/mariadb/data`;
const isolatedPort = 53306;
const fixturePath = `${root}/.local/rula-model-contract-20261018-113940/rula-labeled-reference.png`;
const fixtureHash = "246c363399f29da2ded072a7b20dee3eb71c98665d6a14c8c4df14386e5ed195";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const quantizeJson = value => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "number" ? Number(item.toFixed(9)) : item));
const safeProcessEnv = Object.fromEntries(["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"].filter(name => process.env[name]).map(name => [name, process.env[name]]));
fs.mkdirSync(evidence, { recursive: true });
const lockPath = `${evidence}/execution.lock`;
const lock = fs.openSync(lockPath, "wx");
const runId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
const resultPath = `${evidence}/result-${runId}.json`;
const ledgerPath = `${evidence}/provider-attempts.jsonl`;
let phase = "prerequisites", db, app, actor, isolatedServer, activePurpose = null, blockedOutboundAttempts = 0;
const nativeFetch = globalThis.fetch;
const result = { release, runId, startedAt: new Date().toISOString(), status: "RUNNING", productionDataAccessed: false, productionConfigModified: false, pm2Modified: false, realProviderResponses: true, fixture: { kind: "Synthetic labeled illustration; no real person", sha256: fixtureHash }, providerBudget: { total: 4, rula: 2, fmea: 2 }, checks: [], records: [], independentAnatomicalAccuracy: "NOT_VERIFIED" };
const save = () => fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
const pass = (name, detail = {}) => { result.checks.push({ name, status: "PASS", ...detail }); save(); console.log(JSON.stringify({ check: name, status: "PASS", ...detail })); };
function expectSafe(condition, message) { assert(condition, message); }
function command(binary, args, env, input) {
  const child = spawnSync(binary, args, { cwd: work, env, input, encoding: "utf8", windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
  // CLI output can contain a datasource URL; never print or persist it.
  if (child.error || child.status !== 0) throw Object.assign(new Error("Isolated prerequisite command failed"), { code: "ISOLATED_COMMAND_FAILED", commandExitCode: child.status, commandKind: args.includes("push") ? "prisma-db-push" : "mysql" });
  return child.stdout;
}
function ledger() {
  return fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line)) : [];
}
function recordProvider(event) { fs.appendFileSync(ledgerPath, `${JSON.stringify({ runId, at: new Date().toISOString(), ...event })}\n`); }
function attempts(purpose) { return ledger().filter(row => row.event === "attempt" && (!purpose || row.purpose === purpose)).length; }

try {
  const envBytes = fs.readFileSync(`${root}/.env`);
  const protectedEnvHash = sha(envBytes);
  const { ARVAN_API_KEY: providerKey } = parseEnv(envBytes.toString("utf8"));
  expectSafe(providerKey, "Provider credential must already be provisioned");
  const schema = `nivasafe_test_image_activation_${randomBytes(6).toString("hex")}`;
  expectSafe(/^nivasafe_test_image_activation_[a-f0-9]{12}$/.test(schema), "Unexpected disposable schema identity");
  const isolatedUrl = new URL(`mysql://root@127.0.0.1:${isolatedPort}/${schema}`);
  result.database = { schema, host: "127.0.0.1", port: isolatedPort, newlyCreated: true, productionSchemaConnected: false };
  const fixture = fs.readFileSync(fixturePath);
  assert.equal(sha(fixture), fixtureHash, "Synthetic fixture changed");
  expectSafe(fs.existsSync(`${runtime}/dist/app.js`) && fs.existsSync(`${runtime}/dist/image-processing-consent.js`), "Build candidate backend first");
  expectSafe(attempts() < 4 && attempts("rula") < 2 && attempts("fmea") < 2, "Persistent provider budget is exhausted");
  const mysql = "C:/Runtime/mariadb/bin/mysql.exe";
  expectSafe(fs.existsSync(mysql), "Existing MySQL client is required");
  const mysqlArgs = ["--no-defaults", "--protocol=tcp", "--host=127.0.0.1", `--port=${isolatedPort}`, "--user=root", "--ssl=0", "--batch", "--raw", "--skip-column-names"];
  const mysqlEnv = { ...safeProcessEnv };
  phase = "isolated-server-identity";
  expectSafe(fs.existsSync(isolatedDataDirectory), "Previously verified disposable datadir is required");
  const identityQuery = "SELECT @@port, @@datadir;\n";
  function probeServer() { return spawnSync(mysql, mysqlArgs, { cwd: work, env: mysqlEnv, input: identityQuery, encoding: "utf8", windowsHide: true, timeout: 3000 }); }
  let identity = probeServer();
  if (identity.status !== 0) {
    isolatedServer = spawn("C:/Runtime/mariadb/bin/mariadbd.exe", ["--no-defaults", "--basedir=C:/Runtime/mariadb", `--datadir=${isolatedDataDirectory}`, "--bind-address=127.0.0.1", `--port=${isolatedPort}`, `--pid-file=${work}/synthetic-${runId}.pid`, `--log-error=${work}/synthetic-${runId}.mysql.log`], { cwd: work, env: mysqlEnv, windowsHide: true, stdio: "ignore" });
    isolatedServer.on("error", () => undefined);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
      identity = probeServer();
      if (identity.status === 0 || isolatedServer.exitCode !== null) break;
    }
  }
  expectSafe(identity.status === 0, "Isolated MySQL server did not become ready");
  const normalizedIdentity = identity.stdout.trim().replaceAll("\\", "/").toLowerCase();
  assert.equal(normalizedIdentity, `${isolatedPort}\t${isolatedDataDirectory}/`.toLowerCase(), "Unexpected isolated server datadir or port");
  result.database.isolatedDatadirVerified = true;
  result.database.startedServerPid = isolatedServer?.pid ?? null;
  phase = "fresh-schema";
  const present = command(mysql, mysqlArgs, mysqlEnv, `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${schema}';\n`).trim();
  assert.equal(present, "", "Disposable schema must not already exist");
  command(mysql, mysqlArgs, mysqlEnv, `CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`);
  const runtimeEnv = {
    ...safeProcessEnv, NODE_ENV: "production", APP_URL: "http://127.0.0.1:5199", APP_VERSION: `${release}-synthetic`, DATABASE_URL: isolatedUrl.toString(),
    JWT_ACCESS_SECRET: randomBytes(48).toString("base64url"), JWT_REFRESH_SECRET: randomBytes(48).toString("base64url"), SMTP_URL: "smtp://127.0.0.1:9",
    LOCAL_UPLOAD_DIR: `${work}/synthetic-uploads-${runId}`, AI_ENABLED: "true", AI_DEFAULT_PROVIDER: "arvancloud", AI_RISK_PROVIDER: "arvancloud", AI_CHAT_PROVIDER: "arvancloud",
    ARVAN_API_KEY: providerKey, ARVAN_BASE_URL: "https://api.arvancloudai.ir/v1", RULA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud", FMEA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud",
    RULA_IMAGE_PRIVACY_APPROVED_PROVIDER: "", FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER: "", RULA_IMAGE_VISION_SUPPORTED_PROVIDER: "arvancloud", FMEA_IMAGE_VISION_SUPPORTED_PROVIDER: "arvancloud",
  };
  command(process.execPath, [`${runtime}/node_modules/prisma/build/index.js`, "db", "push", "--skip-generate", "--schema", `${runtime}/prisma/schema.prisma`], runtimeEnv);
  // Imports below must see only the new disposable schema and task-local integrations.
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, runtimeEnv);
  process.chdir(runtime);
  const { normalizeRulaImage } = await import(pathToFileURL(`${runtime}/dist/rula-image-normalization.js`).href);
  const normalized = await normalizeRulaImage(fixture, "image/png");
  const expectedImageHashes = { rula: sha(normalized.buffer), fmea: fixtureHash };
  result.fixture.normalizedSha256 = expectedImageHashes.rula;
  globalThis.fetch = async (url, init = {}) => {
    // No text inference, remote URL, redirects, alternate model, or other image is authorized.
    if (String(url) !== endpoint || !["rula", "fmea"].includes(activePurpose)) {
      blockedOutboundAttempts += 1;
      throw Object.assign(new Error("Unexpected outbound request blocked"), { code: "SYNTHETIC_OUTBOUND_BLOCKED", retryable: false });
    }
    assert.equal(init.method, "POST"); assert.equal(init.redirect, "error");
    const payload = JSON.parse(init.body);
    assert.equal(payload.model, "GPT-5-Mini");
    const userContent = payload.messages.find(message => message.role === "user")?.content;
    expectSafe(Array.isArray(userContent), "An actual multimodal message is required");
    const images = userContent.filter(item => item.type === "image_url");
    assert.equal(images.length, 1);
    const image = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(images[0].image_url.url);
    expectSafe(image, "Image must be a local data payload");
    const imageSha256 = sha(Buffer.from(image[1], "base64"));
    assert.equal(imageSha256, expectedImageHashes[activePurpose]);
    const userText = userContent.filter(item => item.type === "text").map(item => item.text).join("\n");
    expectSafe(userText.includes(activePurpose === "rula" ? "NIVASAFE_RULA_POSTURE_IMAGE_REVIEW" : "NIVASAFE_FMEA_IMAGE_REVIEW"), "Image purpose mismatch");
    expectSafe(attempts() < 4 && attempts(activePurpose) < 2, "Persistent provider request budget exceeded");
    const purpose = activePurpose;
    recordProvider({ event: "attempt", purpose, imageSha256, requestedModel: payload.model });
    const response = await nativeFetch(url, init);
    recordProvider({ event: "response", purpose, status: response.status });
    return response;
  };
  const { prisma } = await import(pathToFileURL(`${runtime}/dist/core.js`).href);
  db = prisma;
  const database = await db.$queryRaw`SELECT DATABASE() AS name`;
  assert.equal(database[0].name, schema);
  assert.equal(await db.user.count(), 0);
  const { ACCOUNT_IMAGE_CONSENT_VERSION, IMAGE_PROCESSING_PURPOSE } = await import(pathToFileURL(`${runtime}/dist/image-processing-consent.js`).href);
  assert.equal(ACCOUNT_IMAGE_CONSENT_VERSION, "image-processing-account-2026-10-22-v3");
  assert.equal(IMAGE_PROCESSING_PURPOSE, "assessment-images");
  const { default: bcrypt } = await import(pathToFileURL(`${runtime}/node_modules/bcryptjs/index.js`).href);
  actor = { userId: randomUUID(), organizationId: randomUUID(), projectId: randomUUID(), email: `image.qa.${randomBytes(9).toString("hex")}@example.com`, password: `Aa!9${randomBytes(36).toString("base64url")}` };
  const passwordHash = await bcrypt.hash(actor.password, 12);
  await db.$transaction(async tx => {
    await tx.user.create({ data: { id: actor.userId, email: actor.email, passwordHash, displayName: "Synthetic Image Assessor", locale: "en", active: true, globalRole: "USER", aiEnabled: true, aiTokenLimit: 1_000_000 } });
    await tx.organization.create({ data: { id: actor.organizationId, nameFa: "Synthetic image QA", nameEn: "Synthetic image QA", subscriptionProvider: "synthetic-qa", subscriptionStatus: "ACTIVE", subscriptionExpiresAt: new Date(Date.now() + 3_600_000), members: { create: { userId: actor.userId, role: "HSE_SPECIALIST" } } } });
    await tx.project.create({ data: { id: actor.projectId, organizationId: actor.organizationId, name: "Synthetic image QA", code: "IMAGE-QA" } });
  });
  const { buildApp } = await import(pathToFileURL(`${runtime}/dist/app.js`).href);
  app = await buildApp();
  app.log.level = "silent";
  async function request(route, { method = "GET", body, multipart, expected = [200], binary = false, authenticated = true } = {}) {
    const headers = { accept: binary ? "*/*" : "application/json", "user-agent": "NIVASafe-Synthetic-Image-QA/1.0" };
    if (authenticated && actor.token) { headers.authorization = `Bearer ${actor.token}`; headers["x-organization-id"] = actor.organizationId; }
    if (multipart) headers["content-type"] = multipart.contentType;
    else if (body !== undefined) headers["content-type"] = "application/json";
    const response = await app.inject({ method, url: `/api/v1${route}`, headers, payload: multipart?.payload ?? (body === undefined ? undefined : JSON.stringify(body)) });
    if (!expected.includes(response.statusCode)) {
      let code; try { code = response.json().error?.code; } catch { /* A non-JSON failure never includes response bytes in evidence. */ }
      result.lastFailure = { route, status: response.statusCode, code: typeof code === "string" && /^[A-Z0-9_]{1,80}$/.test(code) ? code : null };
      throw Object.assign(new Error("Unexpected isolated API status"), { code: "SYNTHETIC_API_ASSERTION_FAILED" });
    }
    return { status: response.statusCode, payload: binary ? response.rawPayload : response.json(), headers: response.headers };
  }
  function imageForm(purpose) {
    const boundary = `synthetic-${randomBytes(8).toString("hex")}`;
    const fields = purpose === "rula" ? { imageSubject: "SELF", bodySide: "RIGHT", jobTitle: "Synthetic posture inspection", taskDescription: "Inspect the labeled synthetic side-view drawing.", locale: "en" } : { jobTitle: "Synthetic illustration inspection", department: "Synthetic QA", activityDescription: "Inspect only the visible synthetic drawing.", locale: "en" };
    const chunks = Object.entries(fields).map(([name, value]) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
    return { contentType: `multipart/form-data; boundary=${boundary}`, payload: Buffer.concat([...chunks, Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic-no-person.png"\r\nContent-Type: image/png\r\n\r\n`), fixture, Buffer.from(`\r\n--${boundary}--\r\n`)]) };
  }
  const routes = { rula: "/rula/posture-image-analysis", fmea: "/fmea/process-image-analysis" };
  async function deniedBoth(label) {
    const before = attempts();
    for (const purpose of ["rula", "fmea"]) {
      const response = await request(routes[purpose], { method: "POST", multipart: imageForm(purpose), expected: [403] });
      assert.equal(response.payload.error.code, "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
    }
    assert.equal(attempts(), before); assert.equal(blockedOutboundAttempts, 0);
    pass(`both-deny-${label}-without-outbound-transfer`);
  }
  const consent = accepted => request("/profile/image-processing-consent", { method: "PUT", body: { accepted, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION } });
  phase = "authentication-and-consent";
  await request("/health", { authenticated: false });
  const login = await request("/auth/login", { method: "POST", authenticated: false, body: { identifier: actor.email, password: actor.password } });
  actor.token = login.payload.data.accessToken;
  assert.equal(login.payload.data.user.globalRole, "USER");
  assert.equal(login.payload.data.organizations[0].role, "HSE_SPECIALIST");
  await deniedBoth("missing-consent");
  await db.auditLog.create({ data: { userId: actor.userId, organizationId: null, action: "IMAGE_PROCESSING_CONSENT_ACCEPTED", entityType: "ImageProcessingConsent", entityId: actor.userId, metadata: { accepted: true, policyVersion: "image-processing-account-2026-10-22-v2", provider: "arvancloud", purpose: "rula-posture", source: "SYNTHETIC_LEGACY_RECEIPT" } } });
  await deniedBoth("legacy-v2-consent");
  await consent(true);
  await consent(false);
  await deniedBoth("withdrawn-consent");
  await consent(true);
  for (const purpose of ["rula", "fmea"]) {
    const policy = await request(`/${purpose}/image-analysis-policy`);
    assert.equal(policy.payload.data.available, true);
    assert.equal(policy.payload.data.consentAccepted, true);
    assert.equal(policy.payload.data.consentVersion, ACCOUNT_IMAGE_CONSENT_VERSION);
  }
  pass("ordinary-user-api-login-and-v3-consent-enable-both-policies");
  const analyses = {};
  for (const purpose of ["rula", "fmea"]) {
    phase = `real-${purpose}-image`;
    activePurpose = purpose;
    let response;
    try { response = await request(routes[purpose], { method: "POST", multipart: imageForm(purpose) }); }
    finally { activePurpose = null; }
    const data = response.payload.data;
    assert.equal(data.provider, "arvancloud");
    assert.equal(data.aiStatus, "connected");
    if (purpose === "rula") {
      expectSafe(data.analysisRequestId && data.sides?.RIGHT, "A durable structured RULA result is required");
      const retrieved = await request(`/rula/posture-image-analysis/${data.analysisRequestId}`);
      assert.deepEqual(quantizeJson(retrieved.payload.data), quantizeJson(data));
      pass("rula-durable-result-retrieval", { analysisRequestId: data.analysisRequestId });
    } else {
      expectSafe(typeof data.summary === "string" && Array.isArray(data.riskRows), "A validated FMEA response is required");
    }
    analyses[purpose] = data;
    pass(`real-${purpose}-provider-analysis`, { attempts: attempts(purpose), responseSha256: sha(Buffer.from(JSON.stringify(data))), model: typeof data.model === "string" ? data.model.slice(0, 100) : "GPT-5-Mini requested; FMEA route omits model metadata" });
  }
  phase = "assessment-persistence-and-pdf";
  const parts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"];
  const primary = analyses.rula.sides.RIGHT;
  const observations = Object.fromEntries(parts.map(part => [part, { ...primary[part], source: "AI", confirmedByUser: false, requiresReview: true }]));
  const inputs = { ...Object.fromEntries(parts.map(part => [part, primary[part].score])), force: 0, muscleUse: false };
  const rula = await request("/rula", { method: "POST", expected: [201], body: { projectId: actor.projectId, title: "Synthetic real-image RULA draft", bodySide: "RIGHT", inputs, postureAnalysis: { ...observations, ...(primary.overlay ? { imageOverlay: primary.overlay } : {}) }, status: "IN_PROGRESS" } });
  const fmea = await request("/fmea", { method: "POST", expected: [201], body: { projectId: actor.projectId, title: "Synthetic real-image FMEA draft", code: `IMG-${randomBytes(4).toString("hex")}`, activityDescription: "Inspect only the visible synthetic drawing.", status: "IN_PROGRESS" } });
  for (const [index, row] of analyses.fmea.riskRows.entries()) await request(`/fmea/${fmea.payload.data.id}/items`, { method: "POST", expected: [201], body: { ...row, rowNumber: index + 1 } });
  for (const [purpose, id] of [["rula", rula.payload.data.id], ["fmea", fmea.payload.data.id]]) {
    const reopened = await request(`/${purpose}/${id}`);
    assert.equal(reopened.payload.data.id, id);
    await request(`/${purpose}/${id}/report?locale=en`);
    const pdf = await request(`/reports/${purpose}/${id}.pdf?locale=en`, { binary: true });
    assert.equal(pdf.payload.subarray(0, 5).toString(), "%PDF-");
    expectSafe(pdf.payload.length > 1000, "An actual report PDF is required");
    const pdfPath = `${evidence}/${runId}-${purpose}.pdf`;
    fs.writeFileSync(pdfPath, pdf.payload);
    result.records.push({ type: purpose, id, status: "IN_PROGRESS", synthetic: true, pdfPath, pdfSha256: sha(pdf.payload), pdfBytes: pdf.payload.length });
    pass(`${purpose}-save-reopen-report-and-real-pdf`, { pdfBytes: pdf.payload.length });
  }
  await consent(false);
  await deniedBoth("withdrawal-after-success");
  assert.equal(await db.aIQuotaReservation.count(), 0);
  result.usage = await db.aIUsageRecord.findMany({ select: { sourceType: true, provider: true, model: true, totalTokens: true } });
  const transferReceipts = await db.auditLog.findMany({ where: { action: { in: ["RULA_IMAGE_TRANSFER_AUTHORIZED", "FMEA_IMAGE_TRANSFER_AUTHORIZED"] } }, select: { action: true, metadata: true } });
  result.transferReceipts = transferReceipts.map(row => ({ action: row.action, purpose: row.metadata?.purpose, accountConsentVersion: row.metadata?.accountConsentVersion, imageSha256: row.metadata?.imageSha256 }));
  expectSafe(result.transferReceipts.some(row => row.action === "RULA_IMAGE_TRANSFER_AUTHORIZED") && result.transferReceipts.some(row => row.action === "FMEA_IMAGE_TRANSFER_AUTHORIZED"), "Both transfer receipts are required");
  assert.equal(sha(fs.readFileSync(`${root}/.env`)), protectedEnvHash);
  pass("quota-released-audited-consent-enforced-and-protected-config-unchanged");
  result.status = "PASS_REAL_SYNTHETIC_IMAGE_TRANSPORT_PERSISTENCE_PDF";
  result.assessmentFinalApproval = "NOT_PERFORMED; genuine image observations remain drafts requiring human review";
} catch (error) {
  result.status = "FAIL";
  result.failure = { phase, name: ["AssertionError", "Error", "TypeError"].includes(error?.name) ? error.name : "ExecutionError", code: typeof error?.code === "string" && /^[A-Z0-9_]{1,80}$/.test(error.code) ? error.code : null, ...(error?.commandKind ? { commandKind: error.commandKind, commandExitCode: error.commandExitCode } : {}) };
  process.exitCode = 1;
} finally {
  activePurpose = null;
  try {
    if (db && actor) await db.$transaction(async tx => {
      await tx.session.updateMany({ where: { userId: actor.userId }, data: { revokedAt: new Date() } });
      await tx.organizationMember.updateMany({ where: { userId: actor.userId, organizationId: actor.organizationId }, data: { active: false } });
      await tx.user.updateMany({ where: { id: actor.userId }, data: { active: false, aiEnabled: false } });
      await tx.organization.updateMany({ where: { id: actor.organizationId }, data: { active: false, subscriptionStatus: "EXPIRED", subscriptionExpiresAt: new Date() } });
    });
    result.fixtureAccountsDisabled = Boolean(db && actor);
  } catch { result.fixtureAccountsDisabled = false; result.cleanupStatus = "FAIL"; process.exitCode = 1; }
  if (app) await app.close().catch(() => { process.exitCode = 1; });
  if (db) await db.$disconnect().catch(() => { process.exitCode = 1; });
  if (isolatedServer && isolatedServer.exitCode === null) {
    const shutdown = spawnSync("C:/Runtime/mariadb/bin/mysqladmin.exe", ["--no-defaults", "--protocol=tcp", "--host=127.0.0.1", `--port=${isolatedPort}`, "--user=root", "--ssl=0", "shutdown"], { env: safeProcessEnv, windowsHide: true, encoding: "utf8", timeout: 15000 });
    if (shutdown.status !== 0) isolatedServer.kill();
    await Promise.race([new Promise(resolve => isolatedServer.once("exit", resolve)), new Promise(resolve => setTimeout(resolve, 3000))]);
    result.database.startedServerStopped = isolatedServer.exitCode !== null;
  }
  globalThis.fetch = nativeFetch;
  result.providerAttempts = { total: attempts(), rula: attempts("rula"), fmea: attempts("fmea") };
  result.blockedOutboundAttempts = blockedOutboundAttempts;
  result.finishedAt = new Date().toISOString();
  save();
  fs.closeSync(lock);
  fs.unlinkSync(lockPath);
  console.log(JSON.stringify({ status: result.status, checks: result.checks.length, providerAttempts: result.providerAttempts, fixtureAccountsDisabled: result.fixtureAccountsDisabled, failure: result.failure ?? null, resultPath }));
}
