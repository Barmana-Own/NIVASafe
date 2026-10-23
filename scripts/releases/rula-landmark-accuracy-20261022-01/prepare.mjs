import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

export const root = "C:/NIVASafe";
export const task = "rula-landmark-accuracy-20261022-01";
export const id = `release-${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const candidate = `${root}/.local/${task}/candidate`;
export const baseline = `${root}/.local/assessment-image-activation-20261022-01/candidate`;
export const runtimeFiles = [
  "backend/src/config.ts", "backend/src/modules/assessments.ts", "backend/src/rula-posture-ai.ts",
  "backend/src/rula-measurement.ts", "backend/src/rula-pose-provider.ts", "backend/src/rula-local-pose-geometry.ts",
];
export const testFiles = [
  "backend/src/rula-posture-ai.test.ts", "backend/src/rula-pose-provider.test.ts",
  "backend/src/rula-local-pose-geometry.test.ts", "backend/src/rula-local-pose-route.test.ts",
];
export const pythonFiles = [
  ".gitignore", "LICENSE.mediapipe", "pose-model-manifest.json", "README.md", "requirements.lock",
  "rula_pose_worker.py", "test_rula_pose_worker.py",
].map(file => `backend/python/${file}`);
export const frontendFiles = ["frontend/src/features/assessments/AssessmentPages.tsx", "frontend/src/styles.css"];
export const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export const read = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));

function patchLightbox() {
  const relative = frontendFiles[0];
  const original = fs.readFileSync(`${baseline}/${relative}`, "utf8");
  const before = '<div className="assessment-image-lightbox-canvas">';
  const after = '<div className={`assessment-image-lightbox-canvas${overlay ? " rula-image-lightbox-canvas" : ""}`}>';
  assert.equal(original.split(before).length - 1, 1, "Lightbox JSX patch must match exactly once");
  assert(fs.readFileSync(`${root}/${relative}`, "utf8").includes(after), "Task lightbox implementation missing");
  fs.writeFileSync(`${candidate}/${relative}`, original.replace(before, after));
  const cssRelative = frontendFiles[1];
  const css = fs.readFileSync(`${baseline}/${cssRelative}`, "utf8");
  const rules = fs.readFileSync(`${root}/${cssRelative}`, "utf8").split(/\r?\n/u).filter(line =>
    line.startsWith(".assessment-image-lightbox-canvas.rula-image-lightbox-canvas ") || line.startsWith(".rula-image-lightbox-canvas > img "));
  assert.equal(rules.length, 2, "Exactly the two task-scoped RULA lightbox rules are required");
  const marker = css.split(/\r?\n/u).find(line => line.startsWith(".assessment-image-lightbox-canvas {"));
  assert(marker && !css.includes("rula-image-lightbox-canvas"), "Unexpected prior lightbox CSS");
  const newline = css.includes("\r\n") ? "\r\n" : "\n";
  fs.writeFileSync(`${candidate}/${cssRelative}`, css.replace(marker, `${marker}${newline}${rules.join(newline)}`));
}

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    if (["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__"].includes(item.name) || item.name.endsWith(".tsbuildinfo")) return [];
    const full = path.join(directory, item.name);
    return item.isDirectory() ? collectFiles(full) : item.isFile() ? [full] : [];
  });
}

function prepare() {
  assert(!fs.existsSync(candidate), "Candidate already exists; preserve frozen evidence before preparing a new build");
  fs.mkdirSync(evidence, { recursive: true });
  fs.cpSync(baseline, candidate, { recursive: true, filter: source => {
    const parts = path.relative(baseline, source).split(path.sep);
    return !parts.some(part => ["node_modules", "dist", ".turbo", ".vite-cache", "playwright-results", "playwright-report", "__pycache__"].includes(part)
      || part.endsWith(".tsbuildinfo") || part === ".env" || (part.startsWith(".env.") && ![".env.example", ".env.sample"].includes(part)));
  }});
  const diffs = [];
  for (const relative of [...runtimeFiles, ...testFiles, ...pythonFiles]) {
    const source = `${root}/${relative}`;
    assert(fs.existsSync(source), `Missing task file: ${relative}`);
    const target = `${candidate}/${relative}`;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    if (fs.existsSync(`${baseline}/${relative}`)) {
      const diff = spawnSync("git", ["-c", "core.autocrlf=false", "diff", "--no-index", "--", `${baseline}/${relative}`, source], { encoding: "utf8", windowsHide: true });
      assert([0, 1].includes(diff.status), `Cannot inspect scoped source diff: ${relative}`);
      if (diff.stdout) diffs.push(diff.stdout);
    }
  }
  patchLightbox();
  for (const directory of ["", "backend", "frontend", "shared/domain"]) {
    fs.symlinkSync(path.join(root, directory, "node_modules"), path.join(candidate, directory, "node_modules"), "junction");
  }
  const protectedPaths = [
    "backend/prisma/schema.prisma", "backend/package.json", "frontend/package.json", "package.json", "pnpm-lock.yaml",
    "frontend/src/main.tsx", "frontend/src/features/assessments/rulaMeasurement.ts",
  ];
  for (const relative of protectedPaths) assert.equal(sha(`${candidate}/${relative}`), sha(`${baseline}/${relative}`), `Protected file changed: ${relative}`);
  assert(fs.readFileSync(`${candidate}/frontend/src/features/assessments/rulaMeasurement.ts`, "utf8").includes('"AI_ANGLE_AUDIT"'), "Existing frontend measurement metadata must accept AI_ANGLE_AUDIT");
  const allowed = new Set([...runtimeFiles, ...testFiles, ...pythonFiles, ...frontendFiles]);
  const unexpected = collectFiles(baseline).flatMap(file => {
    const relative = path.relative(baseline, file).replaceAll("\\", "/");
    if (path.basename(file) === ".env" || path.basename(file).startsWith(".env.")) return [];
    return !allowed.has(relative) && (!fs.existsSync(`${candidate}/${relative}`) || sha(file) !== sha(`${candidate}/${relative}`)) ? [relative] : [];
  });
  assert.deepEqual(unexpected, [], "An unrelated frozen baseline artifact was changed or removed");
  const files = [...allowed].map(relative => ({ path: relative, sha256: sha(`${candidate}/${relative}`) }));
  fs.writeFileSync(`${evidence}/candidate-source-diffs.patch`, diffs.join("\n"));
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify({
    task, id, candidate, baseline, files, protectedPaths, noSchemaChange: true,
    existingNodeDependenciesReused: true, noNodeDependencyChange: true, newPythonRuntimeLock: "backend/python/requirements.lock",
    frontendChanges: "Only the RULA lightbox class plus two CSS rules; all other UI from the verified frozen release",
    frontendMeasurementSourceCompatible: true, unrelatedBaselineArtifactsPreserved: true,
  }, null, 2));
  console.log(JSON.stringify({ status: "PREPARED", candidate, files: files.length, protectedPaths: protectedPaths.length }));
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/prepare.mjs")) prepare();
