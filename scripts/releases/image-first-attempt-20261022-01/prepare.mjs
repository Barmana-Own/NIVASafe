import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

export const root = "C:/NIVASafe";
export const task = "image-first-attempt-20261022-01";
export const id = `release-${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const candidate = `${root}/.local/${task}/candidate`;
export const baseline = `${root}/.local/rula-landmark-accuracy-20261022-01/candidate`;
export const priorEvidence = `${root}/reports/evidence/rula-landmark-accuracy-20261022-01`;
export const live = "C:/inetpub/nivasafe/app-com";
export const overlays = ["backend/src/ai-provider.ts", "backend/src/ai-provider.test.ts"];
export const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export const read = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));

const excluded = new Set(["node_modules", "dist", "build", ".turbo", ".vite-cache", ".cache", "coverage", "__pycache__", "playwright-results", "playwright-report"]);
function safePart(part) {
  return !excluded.has(part) && !part.endsWith(".tsbuildinfo") && !part.endsWith(".pyc")
    && part !== ".env" && !(part.startsWith(".env.") && ![".env.example", ".env.sample"].includes(part));
}
export function files(directory, prefix = "", filter = true) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (filter && !safePart(entry.name)) return [];
    const relative = `${prefix}${entry.name}`;
    return entry.isDirectory() ? files(path.join(directory, entry.name), `${relative}/`, filter) : entry.isFile() ? [relative] : [];
  });
}
const inventory = directory => files(directory, "", false).map(relative => ({ path: relative, sha256: sha(`${directory}/${relative}`) }));

function prepare() {
  assert(!fs.existsSync(candidate), "Preserve an existing candidate; never replace frozen evidence in place");
  const previousValidation = read(`${priorEvidence}/build-validation.json`);
  assert.equal(previousValidation.status, "PASS", "A verified baseline is required");
  assert.equal(read(`${priorEvidence}/independent-final-review.json`).status, "PASS");
  const frontendTests = read(`${priorEvidence}/frontend-tests-final.json`);
  assert(frontendTests.success && frontendTests.numFailedTests === 0 && frontendTests.numPendingTests === 0);
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(candidate, { recursive: true });
  for (const directory of ["backend", "shared"]) {
    const source = `${baseline}/${directory}`;
    fs.cpSync(source, `${candidate}/${directory}`, { recursive: true, filter: file => path.relative(source, file).split(path.sep).every(safePart) });
  }
  const supportFiles = [
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "turbo.json", "docker-compose.yml",
    // Existing backend tests read these files; no frontend application source is copied or built.
    "frontend/test-fixtures/rula-ai-synthetic.png", "deployment/ecosystem.config.cjs", "scripts/probe-efficient-vision-model.mjs",
  ];
  for (const relative of supportFiles) {
    const target = `${candidate}/${relative}`;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(`${baseline}/${relative}`, target);
  }
  const diffs = [];
  for (const relative of overlays) {
    const diff = spawnSync("git", ["-c", "core.autocrlf=false", "diff", "--no-index", "--", `${baseline}/${relative}`, `${root}/${relative}`], { encoding: "utf8", windowsHide: true });
    assert([0, 1].includes(diff.status), `Cannot inspect scoped source: ${relative}`);
    if (diff.stdout) diffs.push(diff.stdout);
    fs.copyFileSync(`${root}/${relative}`, `${candidate}/${relative}`);
  }
  for (const directory of ["", "backend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  const manifestFiles = files(candidate).map(relative => {
    const current = sha(`${candidate}/${relative}`), previous = sha(`${baseline}/${relative}`);
    if (!overlays.includes(relative)) assert.equal(current, previous, `Unrelated baseline file changed: ${relative}`);
    return { path: relative, sha256: current, baselineSha256: previous, changed: current !== previous };
  });
  for (const directory of ["backend", "shared"]) for (const relative of files(`${baseline}/${directory}`)) {
    assert(fs.existsSync(`${candidate}/${directory}/${relative}`), `Baseline artifact missing: ${directory}/${relative}`);
  }
  const ui = {
    source: `${baseline}/frontend`,
    sourceFiles: ["src", "public"].flatMap(directory => fs.existsSync(`${baseline}/frontend/${directory}`) ? inventory(`${baseline}/frontend/${directory}`).map(file => ({ ...file, path: `${directory}/${file.path}` })) : []),
    staticRoot: live, staticFiles: inventory(live),
    previousTests: { path: `${priorEvidence}/frontend-tests-final.json`, sha256: sha(`${priorEvidence}/frontend-tests-final.json`), status: "PASS_REFERENCE_UNCHANGED_SOURCE", passed: frontendTests.numPassedTests, failed: frontendTests.numFailedTests, pending: frontendTests.numPendingTests },
    rerun: "NOT_RUN: backend-only provider timing change; no frontend source, asset or API contract change",
  };
  fs.writeFileSync(`${evidence}/candidate-source-diffs.patch`, diffs.join("\n"));
  fs.writeFileSync(`${evidence}/frontend-unchanged.json`, JSON.stringify(ui, null, 2));
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify({
    task, id, candidate, baseline, files: manifestFiles, overlayFiles: overlays,
    expectedChangedRuntimeModules: ["ai-provider.js"],
    copiedApplications: ["backend", "shared/domain"], testSupportFiles: supportFiles,
    frontendUnchangedEvidence: `${evidence}/frontend-unchanged.json`,
    noSchemaChange: true, noNodeDependencyChange: true, pythonUnchanged: true,
    noFrontendSourceCopiedOrBuilt: true, originalWorktreePreserved: true,
  }, null, 2));
  console.log(JSON.stringify({ status: "PREPARED", candidate, files: manifestFiles.length, changedSourceFiles: manifestFiles.filter(file => file.changed).map(file => file.path), frontendReferencePassed: frontendTests.numPassedTests, frontendStaticFiles: ui.staticFiles.length }));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/prepare.mjs")) prepare();
