import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = "C:/NIVASafe", task = "rula-review-population-20261023-01";
const work = `${root}/.local/${task}`, evidence = `${root}/reports/evidence/${task}`;
const oldReleaseId = "release-ai-text-connection-20261023-01";
const oldBackend = `C:/ProgramData/NIVASafe/releases/${oldReleaseId}/backend`;
const backend = `${work}/rollback-compatible/backend`;
const candidateSchema = `${work}/candidate/backend/src/rula-measurement.ts`;
const helper = fileURLToPath(import.meta.url);
const compiler = `${root}/backend/node_modules/typescript/bin/tsc`;
const reportFile = `${evidence}/compat-validation.json`;
const sha = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const excluded = new Set(["node_modules", "__pycache__", ".pytest_cache", ".venv", "venv"]);
const allowed = file => !excluded.has(path.basename(file)) && !path.basename(file).startsWith(".env") && !file.endsWith(".pyc") && !file.endsWith(".tsbuildinfo");
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => allowed(entry.name)).flatMap(entry => {
    assert(!entry.isSymbolicLink(), `Unexpected source link: ${entry.name}`);
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(file) : [file];
  }).sort();
}
function inventory(directory, roots) {
  return roots.flatMap(relative => {
    const full = `${directory}/${relative}`;
    return fs.statSync(full).isDirectory() ? files(full) : [full];
  }).map(file => ({ path: file.slice(directory.length + 1), sha256: sha(file) })).sort((a, b) => a.path.localeCompare(b.path));
}

async function main() {
  fs.mkdirSync(evidence, { recursive: true });
  assert(!fs.existsSync(reportFile), "Preserve previous compatibility evidence before rerunning");
  assert(!fs.existsSync(backend), "Never overwrite an existing rollback artifact");
  assert(path.resolve(backend).startsWith(`${path.resolve(work)}${path.sep}`));
  const roots = ["src", "dist", "prisma", "python", "package.json", "tsconfig.json", "vitest.config.ts"];
  const oldFiles = inventory(oldBackend, roots), helperSha256 = sha(helper), schemaSha256 = sha(candidateSchema);
  const originalSchema = fs.readFileSync(`${oldBackend}/src/rula-measurement.ts`, "utf8");
  const schema = fs.readFileSync(candidateSchema, "utf8");
  const acceptance = /\r?\n  \/\*\* Original model detection, distinct from an independently usable measurement\. \*\/\r?\n  aiDetected:z\.boolean\(\)\.optional\(\),/u;
  assert(acceptance.test(schema));
  assert.equal(schema.replace(acceptance, "").replaceAll("\r\n", "\n"), originalSchema.replaceAll("\r\n", "\n"), "Compatibility source may add only optional schema acceptance");
  fs.mkdirSync(backend, { recursive: true });
  let report;
  try {
    for (const relative of roots) fs.cpSync(`${oldBackend}/${relative}`, `${backend}/${relative}`, { recursive: true, filter: allowed, errorOnExist: true, force: false });
    fs.copyFileSync(candidateSchema, `${backend}/src/rula-measurement.ts`);
    fs.symlinkSync(`${oldBackend}/node_modules`, `${backend}/node_modules`, "junction");
    // Production dependencies omit compiler/test declaration packages. Supply
    // development types from a build-only ancestor without changing the old
    // backend dependency junction or any packaged source/configuration.
    fs.symlinkSync(`${root}/backend/node_modules`, `${work}/rollback-compatible/node_modules`, "junction");
    const sourceRoots = roots.filter(relative => relative !== "dist");
    const sources = inventory(backend, sourceRoots);
    assert.deepEqual(sources.map(file => file.path), oldFiles.filter(file => !file.path.startsWith("dist/")).map(file => file.path));
    for (const file of sources) assert.equal(file.sha256, file.path === "src/rula-measurement.ts" ? schemaSha256 : oldFiles.find(old => old.path === file.path).sha256, `Unexpected compatibility source change: ${file.path}`);
    const compileLog = `${evidence}/compat-compile.log`, descriptor = fs.openSync(compileLog, "wx");
    const started = Date.now();
    const exitCode = await new Promise(resolve => {
      const child = spawn(process.execPath, [compiler, "-p", "tsconfig.json"], { cwd: backend, windowsHide: true, shell: false, stdio: ["ignore", descriptor, descriptor] });
      child.once("error", () => resolve(-1)); child.once("close", value => resolve(value ?? -1));
    });
    fs.closeSync(descriptor); assert.equal(exitCode, 0, "Compatibility typecheck/compilation failed");
    const artifacts = inventory(backend, ["dist"]), oldArtifacts = oldFiles.filter(file => file.path.startsWith("dist/"));
    assert.deepEqual(artifacts.map(file => file.path), oldArtifacts.map(file => file.path));
    const changed = artifacts.filter(file => file.sha256 !== oldArtifacts.find(old => old.path === file.path).sha256);
    const changedRuntime = changed.filter(file => !file.path.endsWith(".test.js"));
    assert.deepEqual(changedRuntime.map(file => file.path), ["dist/rula-measurement.js"]);
    assert.equal(sha(`${backend}/src/rula-posture-ai.ts`), sha(`${oldBackend}/src/rula-posture-ai.ts`));
    assert.equal(sha(`${backend}/dist/rula-posture-ai.js`), sha(`${oldBackend}/dist/rula-posture-ai.js`));

    const { rulaMeasurementSchema } = await import(pathToFileURL(`${backend}/dist/rula-measurement.js`).href);
    const { rulaPostureAnalysisSchema, assertRulaFinalStatusReviewed } = await import(pathToFileURL(`${backend}/dist/rula-posture.js`).href);
    const { rulaPostureImageAnalysisResponseSchema } = await import(pathToFileURL(`${backend}/dist/rula-posture-ai.js`).href);
    const { saveRulaImageResult, loadRulaImageResult } = await import(pathToFileURL(`${backend}/dist/rula-image-results.js`).href);
    const measurement = { version: "image-plane-audit-v1", state: "CONFLICT", basis: "IMAGE_PLANE", aiAngle: 75, aiScore: 3, geometryAngle: 0, qualityCodes: ["ANGLE_LANDMARK_CONFLICT"], view: "SAGITTAL", width: 640, height: 960, landmarks: [] };
    const checks = [];
    for (const marker of [undefined, true, false]) {
      const value = { ...measurement, ...(marker === undefined ? {} : { aiDetected: marker }) };
      const parsed = rulaMeasurementSchema.parse(value); assert.equal(parsed.aiDetected, marker);
      checks.push({ name: marker === undefined ? "legacy-measurement" : `measurement-aiDetected-${marker}`, status: "PASS" });
    }
    for (const invalid of ["true", "false", 0, 1, null]) assert.equal(rulaMeasurementSchema.safeParse({ ...measurement, aiDetected: invalid }).success, false);
    checks.push({ name: "strict-optional-boolean", status: "PASS" });
    const parts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"];
    const observation = marker => Object.fromEntries(parts.map(part => [part, { angle: null, score: 1, detected: false, confidence: .95, source: "AI", confirmedByUser: false, requiresReview: true, measurement: { ...measurement, ...(marker === undefined ? {} : { aiDetected: marker }) } }]));
    for (const marker of [undefined, true, false]) {
      const left = { ...observation(marker), bodySide: "LEFT" }, right = { ...observation(marker), bodySide: "RIGHT" };
      const imageAnalysis = { ...right, sideAnalyses: { LEFT: left, RIGHT: right } };
      const persisted = { ...imageAnalysis, imageAssessments: [{ imageKey: "synthetic-compat-photo", fileName: "synthetic.png", analysis: imageAnalysis, force: 0, muscleUse: false }] };
      const parsed = rulaPostureAnalysisSchema.parse(JSON.parse(JSON.stringify(persisted)));
      assert.equal(parsed.sideAnalyses.LEFT.upperArm.measurement.aiDetected, marker);
      assert.equal(parsed.imageAssessments[0].analysis.sideAnalyses.RIGHT.upperArm.measurement.aiDetected, marker);
      assert.throws(() => assertRulaFinalStatusReviewed("APPROVED", "BOTH", parsed));
      checks.push({ name: marker === undefined ? "legacy-persisted-observation" : `new-persisted-observation-${marker}`, status: "PASS" });
    }
    const resultSide = marker => ({ ...Object.fromEntries(parts.map(part => [part, { angle: null, score: 1, detected: false, confidence: .95, requiresReview: true, measurement: { ...measurement, ...(marker === undefined ? {} : { aiDetected: marker }) } }])), overlay: { points: {} } });
    for (const marker of [undefined, true, false]) {
      const id = "70000000-0000-4000-8000-000000000001";
      const result = { sides: { RIGHT: resultSide(marker) }, notes: "Synthetic compatibility fixture", provider: "synthetic", aiStatus: "connected" };
      rulaPostureImageAnalysisResponseSchema.parse(result);
      let stored;
      const repository = { async create(input) { stored = JSON.parse(JSON.stringify(input.result)); return { id }; }, async find() { return { id, output: stored }; } };
      const saved = await saveRulaImageResult({ organizationId: "synthetic-org", userId: "synthetic-user", sourceRequestId: "synthetic-request", imageSha256: "a".repeat(64), bodySide: "RIGHT", locale: "en", authorization: { accountConsentVersion: "synthetic-policy", consentRecordId: "synthetic-consent", consentSource: "ACCOUNT_POLICY", imageSubject: "SELF", imageOwnerUserId: "synthetic-user", ownerAuthorizationId: null, ownerConsentRecordId: null }, attempts: 1, startedAt: new Date(0), completedAt: new Date(1), result }, repository);
      const loaded = await loadRulaImageResult({ id, organizationId: "synthetic-org", userId: "synthetic-user" }, repository);
      assert.equal(saved.sides.RIGHT.upperArm.measurement.aiDetected, marker);
      assert.equal(loaded.sides.RIGHT.upperArm.measurement.aiDetected, marker);
      checks.push({ name: marker === undefined ? "legacy-stored-inference" : `new-stored-inference-${marker}`, status: "PASS" });
    }
    for (const file of oldFiles) assert.equal(sha(`${oldBackend}/${file.path}`), file.sha256, `Production baseline changed: ${file.path}`);
    assert.equal(sha(candidateSchema), schemaSha256); assert.equal(sha(helper), helperSha256);
    assert.deepEqual(inventory(backend, sourceRoots), sources);
    report = { status: "PASS", task, at: new Date().toISOString(), releaseId: `release-${task}-rollback-compatible`, oldReleaseId, oldBackend, backend, helperSha256, candidateSchemaSha256: schemaSha256, oldPrivateFiles: oldFiles, sourceFiles: sources, artifactFiles: artifacts, changedRuntimeFiles: changedRuntime, changedTestArtifacts: changed.filter(file => file.path.endsWith(".test.js")), typecheckAndCompile: { status: "PASS", exitCode, elapsedMs: Date.now() - started, command: [process.execPath, compiler, "-p", "tsconfig.json"], compilerSha256: sha(compiler), productionDependencyJunctionPreserved: true, log: compileLog, logSha256: sha(compileLog) }, checks, syntheticContractChecks: checks.length, previousAiBehaviorByteIdentical: true, onlyOptionalSchemaAcceptanceAdded: true, productionFilesUnchanged: true, noRootProductFilesChanged: true, noEnvironmentSecretsUploadsOrCachesCopied: true, noProviderNetworkDatabaseOrBusinessCalls: true, persistenceFixtureRepository: "IN_MEMORY_ONLY", deploymentPerformed: false };
  } catch (error) {
    report = { status: "FAIL", task, at: new Date().toISOString(), helperSha256, candidateSchemaSha256: schemaSha256, error: error.message, backend, preservedFailureArtifact: true, deploymentPerformed: false };
    process.exitCode = 1;
  }
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, releaseId: report.releaseId, syntheticContractChecks: report.syntheticContractChecks, reportFile, reportSha256: sha(reportFile), changedRuntime: report.changedRuntimeFiles?.map(file => file.path), error: report.error }));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
