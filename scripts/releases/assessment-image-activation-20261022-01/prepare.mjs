import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

export const root = "C:/NIVASafe";
export const task = "assessment-image-activation-20261022-01";
export const id = `release-${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const candidate = `${root}/.local/${task}/candidate`;
export const baseline = `${root}/.local/rula-direct-consent-20261022-01/candidate`;
export const runtimeFiles = [
  "backend/src/ai-provider.ts",
  "backend/src/image-provider-approval.ts",
  "backend/src/image-processing-consent.ts",
  "backend/src/modules/assessments.ts",
  "backend/src/posture-image-authorizations.ts",
  "backend/src/fmea-process.ts",
  "backend/src/rula-posture-ai.ts",
  "frontend/src/features/account/imageProcessingPolicy.ts",
];
export const testFiles = [
  "backend/src/ai-provider.test.ts",
  "backend/src/image-provider-approval.test.ts",
  "backend/src/image-processing-consent.test.ts",
  "backend/src/posture-image-authorizations.test.ts",
  "backend/src/registration-security.test.ts",
  "backend/src/rula-registered-member.test.ts",
  "backend/src/rula-three-stage.test.ts",
  "backend/src/fmea-image-consent.test.ts",
  "backend/src/fmea-process.test.ts",
  "frontend/src/features/account/ImageProcessingConsent.test.tsx",
];
export const sha = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export const read = file => JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/prepare.mjs")) {
  assert(!fs.existsSync(candidate), "Candidate already exists; preserve it and inspect before retrying");
  fs.mkdirSync(evidence, { recursive: true });
  fs.cpSync(baseline, candidate, { recursive: true, filter: source => {
    const parts = path.relative(baseline, source).split(path.sep);
    return !parts.some(part => ["node_modules", "dist", ".turbo", ".vite-cache", "playwright-results", "playwright-report"].includes(part) || part === ".env" || part.startsWith(".env."));
  }});
  for (const relative of [...runtimeFiles, ...testFiles]) {
    const target = path.join(candidate, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, relative), target);
  }
  for (const directory of ["", "backend", "frontend", "shared/domain"]) {
    fs.symlinkSync(path.join(root, directory, "node_modules"), path.join(candidate, directory, "node_modules"), "junction");
  }
  // Existing source tests use Node builtins; this is a staging compiler setting only.
  const frontendConfig = read(`${candidate}/frontend/tsconfig.json`);
  frontendConfig.compilerOptions.types = [...new Set([...frontendConfig.compilerOptions.types, "node"])];
  fs.writeFileSync(`${candidate}/frontend/tsconfig.json`, JSON.stringify(frontendConfig, null, 2));
  const files = [...runtimeFiles, ...testFiles].map(relative => ({ path: relative, sha256: sha(path.join(candidate, relative)) }));
  assert.equal(sha(`${candidate}/backend/prisma/schema.prisma`), sha(`${baseline}/backend/prisma/schema.prisma`));
  assert.equal(sha(`${candidate}/frontend/src/main.tsx`), sha(`${baseline}/frontend/src/main.tsx`));
  assert.equal(sha(`${candidate}/frontend/src/features/assessments/AssessmentPages.tsx`), sha(`${baseline}/frontend/src/features/assessments/AssessmentPages.tsx`));
  const receipt = { task, id, candidate, baseline, files, noSchemaChange: true, frontendRoutesUnchanged: true, assessmentLayoutsUnchanged: true, existingDependenciesReused: true };
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ status: "PREPARED", candidate, changedRuntimeSources: runtimeFiles.length, tests: testFiles.length }));
}
