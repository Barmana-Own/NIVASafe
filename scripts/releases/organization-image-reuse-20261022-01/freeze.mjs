import fs from "node:fs";
import assert from "node:assert/strict";
import { task, id, work, evidence, candidate, frontendBaseline, backendBaseline, sha, read, files } from "./prepare.mjs";

assert(!fs.existsSync(`${evidence}/candidate.json`));
const baseline = read(`${evidence}/baseline.json`), previous = new Map(baseline.files.map(file => [file.path, file.sha256]));
const applied = ["frontend", "backend"].flatMap(side => read(`${evidence}/${side}-source-transplant.json`).files);
const allowed = applied.map(file => file.path).sort();
for (const file of applied) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
const all = files(candidate), modified = all.filter(file => sha(`${candidate}/${file}`) !== previous.get(file)).sort();
assert.deepEqual(modified, allowed);
for (const file of previous.keys()) assert(all.includes(file), "Protected baseline file disappeared");
assert.equal(sha(`${candidate}/frontend/src/styles.css`), sha(`${frontendBaseline}/frontend/src/styles.css`));
for (const file of ["backend/package.json", "backend/python/rula_pose_worker.py", "backend/python/requirements.lock"]) assert.equal(sha(`${candidate}/${file}`), sha(`${backendBaseline}/${file}`));
const migrationName = "202610220001_attachment_assessment_links", migrationPath = `${candidate}/backend/prisma/migrations/${migrationName}/migration.sql`;
const manifest = { status: "FROZEN_SOURCE_READY", task, id, candidate, frontendBaseline, backendBaseline, at: new Date().toISOString(), modified, migrationName, migrationSha256: sha(migrationPath), noDependenciesChanged: true, noVisualChanges: true, noExistingDataDeleted: true, expectedChangedRuntimeModules: ["assessment-image-links.js", "modules/assessments.js", "modules/files.js"], files: all.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })) };
fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: "wx" });
console.log(JSON.stringify({ status: manifest.status, files: all.length, modified: modified.length, candidateManifestSha256: sha(`${evidence}/candidate.json`) }));
