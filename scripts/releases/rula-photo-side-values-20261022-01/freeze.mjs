import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { root, task, id, work, candidate, evidence, frontendBaseline, backendBaseline, sha, read, files, hashText } from "./prepare.mjs";
const approval = read(`${evidence}/approved-changes.json`), baseline = read(`${evidence}/baseline.json`);
assert(!fs.existsSync(`${evidence}/candidate.json`));
const normalize = value => value.replaceAll("\r\n", "\n");
for (const file of baseline.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256, `Baseline mutated: ${file.path}`);
const copied = [];
for (const relative of approval.sourceFiles) {
  assert(/^(frontend\/src\/features\/assessments|backend\/src)\/[A-Za-z0-9_./-]+\.(?:ts|tsx)$/u.test(relative));
  assert(!relative.split("/").includes(".."));
  const source = `${root}/${relative}`, destination = `${candidate}/${relative}`, original = `${work}/root-before/${relative}`;
  assert(fs.existsSync(source));
  if (fs.existsSync(destination)) {
    assert(fs.existsSync(original), `Missing before snapshot: ${relative}`);
    if (relative !== "frontend/src/features/assessments/AssessmentPages.tsx") assert.equal(normalize(fs.readFileSync(original, "utf8")), normalize(fs.readFileSync(destination, "utf8")), `Unrelated root differences require explicit review: ${relative}`);
  } else assert(!fs.existsSync(original), `File unexpectedly absent from baseline: ${relative}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(source, destination);
  copied.push({ path: relative, rootAfterSha256: sha(source), rootBeforeSha256: fs.existsSync(original) ? sha(original) : null });
}
const currentPaths = files(candidate), oldPaths = baseline.files.map(file => file.path), oldHashes = new Map(baseline.files.map(file => [file.path, file.sha256]));
for (const file of oldPaths) assert(currentPaths.includes(file), `Protected source disappeared: ${file}`);
const modified = currentPaths.filter(file => !oldHashes.has(file) || sha(`${candidate}/${file}`) !== oldHashes.get(file));
assert.deepEqual(modified.slice().sort(), approval.sourceFiles.slice().sort());
for (const relative of ["frontend/src/styles.css", "frontend/src/i18n.tsx", "frontend/src/layout/SidebarNavigation.tsx", "frontend/src/layout/AppLayout.tsx", "backend/prisma/schema.prisma", "backend/package.json", "frontend/package.json", "pnpm-lock.yaml"]) {
  const base = relative.startsWith("backend/") ? backendBaseline : frontendBaseline;
  assert.equal(sha(`${candidate}/${relative}`), sha(`${base}/${relative}`));
}
const assessment = fs.readFileSync(`${candidate}/frontend/src/features/assessments/AssessmentPages.tsx`, "utf8");
assert(assessment.includes('className="rula-review-notice"'), "Preserve the existing review notice");
const manifest = { status: "PREPARED", task, id, frontendBaseline, backendBaseline, candidate, modified, expectedChangedRuntimeModules: approval.expectedChangedRuntimeModules, sourceRationale: approval.sourceRationale, backendChanged: true, databaseSchemaChanged: false, dependenciesChanged: false, addedUiElements: false, stylesheetChanged: false, rootSnapshots: copied, files: currentPaths.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })) };
fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
fs.writeFileSync(`${evidence}/scope.json`, JSON.stringify({ task, candidateManifestSha256: hashText(JSON.stringify(manifest, null, 2)), requested: ["Independent per-photo and anatomical-side RULA suggestions", "Populate existing A/B tables, preliminary summary, force and muscle-use controls", "Persist independent values without adding UI"], unchanged: ["All fourteen active stylesheets", "Existing owner consent and subject authorization", "Existing review and final-status gates", "Database schema, migrations and other features"], stages: [{ stage: 1, status: "PASS", evidence: "Root cause and existing contracts inspected" }, { stage: 2, status: "PASS", evidence: "Existing UI reused; no added controls, text or layout" }, { stage: 3, status: "IMPLEMENTED_VALIDATION_PENDING" }, { stage: 4, status: "IMPLEMENTED_VALIDATION_PENDING" }, { stage: 5, status: "NOT_APPLICABLE_SCHEMA_UNCHANGED" }, { stage: 6, status: "VALIDATION_PENDING" }, { stage: 7, status: "VALIDATION_PENDING_EXISTING_AUTH_PRESERVED" }, { stage: 8, status: "VALIDATION_PENDING" }, { stage: 9, status: "VALIDATION_PENDING" }, { stage: 10, status: "VALIDATION_PENDING" }, { stage: 11, status: "VALIDATION_PENDING" }, { stage: 12, status: "VALIDATION_PENDING" }] }, null, 2));
console.log(JSON.stringify({ status: "FROZEN", task, modified, sourceFiles: currentPaths.length }));
