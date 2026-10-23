import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { root, work, evidence, candidate, sha, read } from "./prepare.mjs";

const side = process.argv.includes("--frontend") ? "frontend" : process.argv.includes("--backend") ? "backend" : null;
assert(side, "Choose a completed source side");
const transplantPath = `${work}/${side}-transplant.json`, patch = read(transplantPath);
const destination = `${evidence}/${side}-source-transplant.json`;
assert(!fs.existsSync(destination), "Do not overwrite an applied source transplant");
assert(!fs.existsSync(`${evidence}/candidate.json`), "Source is frozen");
const originalFiles = read(`${evidence}/baseline.json`).files;
const modified = [], planned = [];
const normalized = text => text.replaceAll("\r\n", "\n");
function replaceHunk(contents, replacement, file) {
  const text = normalized(contents), before = normalized(replacement.before);
  assert.equal(text.split(before).length, 2, `Ambiguous exact source hunk: ${file}`);
  const start = text.indexOf(before), offsets = [];
  for (let index = 0; index < contents.length; index += 1) {
    if (contents[index] === "\r" && contents[index + 1] === "\n") continue;
    offsets.push(index);
  }
  offsets.push(contents.length);
  return contents.slice(0, offsets[start]) + replacement.after + contents.slice(offsets[start + before.length]);
}
for (const change of patch.changes) {
  const target = `${candidate}/${change.path}`;
  assert(change.path.startsWith(`${side}/`) && !change.path.includes(".."));
  assert.equal(sha(`${root}/${change.path}`), change.afterSha256);
  if (change.kind === "new" || change.kind === "add") {
    assert(!originalFiles.some(file => file.path === change.path));
    if (fs.existsSync(target)) assert.equal(sha(target), change.afterSha256);
    planned.push({ target, bytes: fs.readFileSync(`${root}/${change.path}`) });
  } else {
    assert.equal(sha(change.beforePath), change.beforeSha256);
    let contents = fs.readFileSync(target, "utf8");
    // A preparation failure may have written earlier hunks. Reconstruct only
    // these explicitly approved paths from the protected baseline before retry.
    const recorded = originalFiles.find(file => file.path === change.path);
    assert(recorded);
    if (sha(target) !== recorded.sha256) {
      const base = change.path.startsWith("frontend/") ? `${root}/.local/files-organization-image-picker-20261022-01/candidate` : `${root}/.local/image-first-attempt-20261022-01/candidate-r2`;
      assert.equal(sha(`${base}/${change.path}`), recorded.sha256);
      contents = fs.readFileSync(`${base}/${change.path}`, "utf8");
    }
    for (const replacement of change.replacements) {
      contents = replaceHunk(contents, replacement, change.path);
    }
    planned.push({ target, bytes: contents });
  }
}
for (const { target, bytes } of planned) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
for (const change of patch.changes) modified.push({ path: change.path, sha256: sha(`${candidate}/${change.path}`), rootSha256: change.afterSha256 });
fs.writeFileSync(destination, JSON.stringify({ status: "APPLIED_EXACT_SCOPED_HUNKS", side, artifactSha256: sha(transplantPath), files: modified }, null, 2), { flag: "wx" });
console.log(JSON.stringify({ status: "APPLIED", side, files: modified.length }));
