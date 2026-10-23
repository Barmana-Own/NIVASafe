import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { root, task, evidence, candidate as previousCandidate, files, sha, read } from "./prepare.mjs";

export { root, task, evidence, files, sha, read };
export const id = "release-image-first-attempt-20261022-02";
export const baseline = previousCandidate;
export const candidate = `${root}/.local/${task}/candidate-r2`;
export const overlays = [
  "backend/src/ai-provider.ts", "backend/src/ai-provider.test.ts",
  "backend/src/image-analysis-diagnostics.ts", "backend/src/image-analysis-diagnostics.test.ts",
  "backend/package.json", "pnpm-lock.yaml",
];
export const manifestPath = `${evidence}/candidate-r2.json`;
const excluded = new Set(["node_modules", "dist", "build", ".turbo", ".vite-cache", ".cache", "coverage", "__pycache__", "playwright-results", "playwright-report"]);
function safePart(part) {
  return !excluded.has(part) && !part.endsWith(".tsbuildinfo") && !part.endsWith(".pyc")
    && part !== ".env" && !(part.startsWith(".env.") && ![".env.example", ".env.sample"].includes(part));
}

function verifyDependencyAddition() {
  const integrity = "sha512-EvRlUt/QqAEvXdQeRMYUfwOQsfzpDztykrG2owGEE/rBOBoYv9uF39ZzsNDh4lTFHhTr2XOZjKkYgueD12ZmGA==";
  const proofPath = `${evidence}/dependency-addition.json`, proof = read(proofPath);
  assert.equal(proof.status, "PASS"); assert.equal(proof.package, "undici"); assert.equal(proof.version, "6.29.1"); assert.equal(proof.integrity, integrity);
  assert(proof.otherDependenciesUnchanged && proof.existingLibcSelectorsPreserved && proof.installScriptsExecuted === false);
  assert.equal(sha(`${root}/backend/package.json`), proof.packageSha256); assert.equal(sha(`${root}/pnpm-lock.yaml`), proof.lockSha256);
  const previous = read(`${root}/.local/${task}/backend-package.before-undici.json`), next = read(`${root}/backend/package.json`);
  assert(!Object.hasOwn(previous.dependencies, "undici")); assert.equal(next.dependencies.undici, "6.29.1");
  const strippedPackage = structuredClone(next); delete strippedPackage.dependencies.undici;
  assert.deepEqual(strippedPackage, previous, "An unrelated package manifest field changed");
  // Reuse the already-installed YAML parser only for exact lockfile comparison.
  const yamlDirectory = fs.readdirSync(`${root}/node_modules/.pnpm`).find(name => /^yaml@2\./u.test(name));
  assert(yamlDirectory, "Existing YAML parser is unavailable");
  const require = createRequire(import.meta.url), yaml = require(`${root}/node_modules/.pnpm/${yamlDirectory}/node_modules/yaml`);
  const previousLock = yaml.parse(fs.readFileSync(`${root}/.local/${task}/pnpm-lock.before-undici.yaml`, "utf8")), nextLock = yaml.parse(fs.readFileSync(`${root}/pnpm-lock.yaml`, "utf8"));
  assert.deepEqual(nextLock.importers.backend.dependencies.undici, { specifier: "6.29.1", version: "6.29.1" });
  assert.equal(nextLock.packages["undici@6.29.1"].resolution.integrity, integrity);
  assert.equal(nextLock.packages["undici@6.29.1"].engines.node, ">=18.17");
  const strippedLock = structuredClone(nextLock);
  delete strippedLock.importers.backend.dependencies.undici; delete strippedLock.packages["undici@6.29.1"]; delete strippedLock.snapshots["undici@6.29.1"];
  assert.deepEqual(strippedLock, previousLock, "The lockfile changed beyond the exact Undici addition");
  // The active worktree has unrelated pre-existing development-manifest changes.
  // Build this release's manifests from the verified frozen baseline and add only Undici.
  const baselinePackageText = fs.readFileSync(`${baseline}/backend/package.json`, "utf8");
  const newline = baselinePackageText.includes("\r\n") ? "\r\n" : "\n";
  assert.equal(baselinePackageText.split('    "zod":').length, 2);
  const candidatePackageText = baselinePackageText.replace('    "zod":', `    "undici": "6.29.1",${newline}    "zod":`);
  const expectedPackage = read(`${baseline}/backend/package.json`); expectedPackage.dependencies.undici = "6.29.1";
  assert.deepEqual(JSON.parse(candidatePackageText), expectedPackage);
  const baselineLockText = fs.readFileSync(`${baseline}/pnpm-lock.yaml`, "utf8"), lockNewline = baselineLockText.includes("\r\n") ? "\r\n" : "\n";
  const packagesAt = baselineLockText.indexOf("packages:"), snapshotsAt = baselineLockText.indexOf("snapshots:");
  assert(packagesAt > 0 && snapshotsAt > packagesAt);
  const parts = [baselineLockText.slice(0, packagesAt), baselineLockText.slice(packagesAt, snapshotsAt), baselineLockText.slice(snapshotsAt)];
  const importer = ["      undici:", "        specifier: 6.29.1", "        version: 6.29.1", ""].join(lockNewline);
  const packageEntry = ["  undici@6.29.1:", `    resolution: {integrity: ${integrity}}`, "    engines: {node: '>=18.17'}", "", ""].join(lockNewline);
  const snapshot = ["  undici@6.29.1: {}", "", ""].join(lockNewline), anchor = "  unicode-properties@1.4.1:";
  assert.equal(parts[0].split("      zod:").length, 2);
  assert.equal(parts[1].split(anchor).length, 2); assert.equal(parts[2].split(anchor).length, 2);
  const candidateLockText = parts[0].replace("      zod:", `${importer}      zod:`) + parts[1].replace(anchor, `${packageEntry}${anchor}`) + parts[2].replace(anchor, `${snapshot}${anchor}`);
  const candidateLock = yaml.parse(candidateLockText), baselineLock = yaml.parse(baselineLockText);
  assert.deepEqual(candidateLock.importers.backend.dependencies.undici, nextLock.importers.backend.dependencies.undici);
  assert.deepEqual(candidateLock.packages["undici@6.29.1"], nextLock.packages["undici@6.29.1"]);
  assert.deepEqual(candidateLock.snapshots["undici@6.29.1"], nextLock.snapshots["undici@6.29.1"]);
  delete candidateLock.importers.backend.dependencies.undici; delete candidateLock.packages["undici@6.29.1"]; delete candidateLock.snapshots["undici@6.29.1"];
  assert.deepEqual(candidateLock, baselineLock, "Candidate lockfile contains an unrelated upgrade");
  const packagePath = fs.realpathSync(`${root}/backend/node_modules/undici`), installed = read(`${packagePath}/package.json`);
  assert.equal(installed.name, "undici"); assert.equal(installed.version, "6.29.1");
  return { candidatePackageText, candidateLockText, addition: { package: "undici", version: "6.29.1", registryIntegrity: integrity, packagePath, proofPath, proofSha256: sha(proofPath), otherDependenciesUnchanged: true, lockfileOnlyExactAddition: true, installScriptsExecuted: false, manifestsDerivedFromFrozenBaseline: true, unrelatedWorktreeDevelopmentManifestChangesExcluded: true,
    files: files(packagePath, "", false).map(relative => ({ path: relative, sha256: sha(`${packagePath}/${relative}`) })) } };
}

function prepare() {
  assert(process.argv.includes("--source-ready"), "Run only after the responsible backend agent confirms proven diagnosis and final source/tests");
  assert(!fs.existsSync(candidate) && !fs.existsSync(manifestPath), "Revision 2 candidate/evidence already exists; preserve it before any further revision");
  const v1 = read(`${evidence}/candidate.json`);
  assert.equal(read(`${evidence}/build-validation.json`).status, "PASS");
  for (const file of v1.files) assert.equal(sha(`${baseline}/${file.path}`), file.sha256, "The validated v1 source must remain immutable");
  const dependency = verifyDependencyAddition(), nodeDependencyAddition = dependency.addition;
  const preservedV1Evidence = fs.readdirSync(evidence).filter(name => name.endsWith(".json") && !name.includes("-r2")).map(name => ({ path: `${evidence}/${name}`, sha256: sha(`${evidence}/${name}`) }));
  fs.cpSync(baseline, candidate, { recursive: true, filter: source => path.relative(baseline, source).split(path.sep).every(safePart) });
  const diffs = [];
  for (const relative of overlays) {
    assert(fs.existsSync(`${root}/${relative}`) && fs.existsSync(`${baseline}/${relative}`), `Required revision source missing: ${relative}`);
    if (relative === "backend/package.json") fs.writeFileSync(`${candidate}/${relative}`, dependency.candidatePackageText);
    else if (relative === "pnpm-lock.yaml") fs.writeFileSync(`${candidate}/${relative}`, dependency.candidateLockText);
    else fs.copyFileSync(`${root}/${relative}`, `${candidate}/${relative}`);
    const diff = spawnSync("git", ["-c", "core.autocrlf=false", "diff", "--no-index", "--", `${baseline}/${relative}`, `${candidate}/${relative}`], { encoding: "utf8", windowsHide: true });
    assert([0, 1].includes(diff.status), `Cannot inspect revision source: ${relative}`);
    if (diff.stdout) diffs.push(diff.stdout);
  }
  for (const directory of ["", "backend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  const frozen = files(candidate).map(relative => {
    const current = sha(`${candidate}/${relative}`), previous = sha(`${baseline}/${relative}`);
    if (!overlays.includes(relative)) assert.equal(current, previous, `Unrelated revision file changed: ${relative}`);
    return { path: relative, sha256: current, baselineSha256: previous, changed: current !== previous };
  });
  for (const relative of files(baseline)) assert(fs.existsSync(`${candidate}/${relative}`), `A v1 artifact disappeared: ${relative}`);
  assert(frozen.some(file => file.path === "backend/src/ai-provider.ts" && file.changed), "A substantive provider repair is required");
  const expectedChangedRuntimeModules = frozen.filter(file => file.changed && file.path.startsWith("backend/src/") && file.path.endsWith(".ts") && !file.path.endsWith(".test.ts")).map(file => file.path.slice("backend/src/".length).replace(/\.ts$/u, ".js")).sort();
  assert(expectedChangedRuntimeModules.length >= 1 && expectedChangedRuntimeModules.length <= 2 && expectedChangedRuntimeModules.every(file => ["ai-provider.js", "image-analysis-diagnostics.js"].includes(file)), "Unexpected revision runtime scope");
  for (const file of preservedV1Evidence) assert.equal(sha(file.path), file.sha256, "Prior v1 evidence changed");
  fs.writeFileSync(`${evidence}/candidate-source-diffs-r2.patch`, diffs.join("\n"));
  fs.writeFileSync(manifestPath, JSON.stringify({
    task, revision: 2, id, candidate, baseline, files: frozen, overlayFiles: overlays,
    expectedChangedRuntimeModules, preservedV1Evidence, nodeDependencyAddition,
    frontendUnchangedEvidence: `${evidence}/frontend-unchanged.json`,
    priorCompilePassSeparateFromFunctionalFailure: true,
    noSchemaChange: true, noNodeDependencyChange: false, onlyNodeDependencyAddition: "undici@6.29.1", allOtherNodeDependenciesPreserved: true, pythonUnchanged: true,
    noFrontendSourceCopiedOrBuilt: true, proxyUnchangedFromDeployedV1: true,
    originalV1CandidateAndEvidencePreserved: true,
  }, null, 2));
  console.log(JSON.stringify({ status: "PREPARED", revision: 2, candidate, files: frozen.length, changedSourceFiles: frozen.filter(file => file.changed).map(file => file.path), expectedChangedRuntimeModules, preservedV1Artifacts: preservedV1Evidence.length }));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/prepare-r2.mjs")) prepare();
