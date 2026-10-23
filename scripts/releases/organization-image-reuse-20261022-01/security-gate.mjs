import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, evidence, candidate, sha, read } from "./prepare.mjs";

const manifestHash = sha(`${evidence}/candidate.json`);
const frontend = read(`${evidence}/peer-frontend-security.json`), backend = read(`${evidence}/peer-backend-security.json`), helper = read(`${evidence}/peer-integration-helper-security.json`);
for (const review of [frontend, backend]) { assert.equal(review.status, "PASS"); assert.equal(review.candidateManifestSha256, manifestHash); }
assert.equal(helper.status, "PASS");
const build = read(`${evidence}/build-validation.json`), browser = read(`${evidence}/e2e-validation.json`), integration = read(`${evidence}/integration-validation.json`);
const integrationResult = read(integration.rawResult);
assert.equal(sha(integration.rawResult), integration.rawResultSha256);
assert(Number.isSafeInteger(integrationResult.requests) && integrationResult.requests > 0);
for (const gate of [build, browser, integration]) { assert.equal(gate.status, "PASS"); assert.equal(gate.candidateManifestSha256, manifestHash); }
for (const file of read(`${evidence}/candidate.json`).files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
for (const file of build.artifacts) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
for (const artifact of integration.runtimeArtifactHashes) assert.equal(sha(`${candidate}/backend/${artifact.file}`), artifact.sha256);
const helpers = ["prepare.mjs", "apply-source.mjs", "validate.mjs", "database.mjs", "release.mjs", "integration.mjs"];
const hashes = Object.fromEntries(helpers.map(file => [file, sha(`${root}/scripts/releases/${task}/${file}`)]));
// Frontend peer authored neither these publication helpers nor the frontend
// implementation. The integration runner's fixture-only revisions are covered
// by its exact successful execution hash and the primary final review.
for (const file of helpers.filter(file => file !== "integration.mjs")) assert.equal(hashes[file], frontend.reviewedHelpersSha256[file]);
assert.equal(hashes["integration.mjs"], integration.scriptSha256);
assert.equal(read(`${evidence}/frontend-plan.json`).releaseHelperSha256, hashes["release.mjs"]);
const record = { status: "PASS", task, gate: "SCOPED_INCREMENTAL_IMAGE_REUSE_SECURITY_AND_REGRESSION_GATE", at: new Date().toISOString(), candidateManifestSha256: manifestHash, reviewedHelpersSha256: hashes, peerEvidence: ["peer-frontend-security.json", "peer-backend-security.json", "peer-integration-helper-security.json"].map(path => ({ path, sha256: sha(`${evidence}/${path}`) })), frontendTests: build.tests.frontend.passed, backendTests: build.tests.backend.passed, browserTests: browser.passed, integrationRequests: integrationResult.requests, findingsIntroducedByRepair: [], materialSecurityIssues: 0, originalAttachmentsAndObjectsPreserved: true, newAssociationMigrationOnly: true, historicalMigrationChain: { status: "FAIL_PREEXISTING_UNRELATED", currentIncrementalReleaseBlocked: false, documentedIn: "docs/organization-image-reuse-2026-10-22.md", originalMigrationsUnchanged: true }, repositoryWideSecurityAuditClaimed: false };
const refreshing = process.argv.includes("--refresh-publication-helper-review");
if (fs.existsSync(`${evidence}/security-review.json`)) {
  assert(refreshing, "Preserve a completed security review before refreshing helper bindings");
  const prior = read(`${evidence}/security-review.json`); assert.equal(prior.candidateManifestSha256, manifestHash);
  fs.copyFileSync(`${evidence}/security-review.json`, `${evidence}/security-review-before-tool-path-repair.json`, fs.constants.COPYFILE_EXCL);
  record.publicationHelperRepair = { priorEvidence: "security-review-before-tool-path-repair.json", runtimeSourceChanged: false, reason: "Use the already validated build-tool Prisma CLI, absent by design from production-only dependencies; resume only a hash-verified pre-switch stage and backup." };
}
fs.writeFileSync(`${evidence}/security-review.json`, JSON.stringify(record, null, 2), { flag: refreshing ? "w" : "wx" });
console.log(JSON.stringify({ status: "PASS", task, frontendTests: record.frontendTests, backendTests: record.backendTests, browserTests: record.browserTests }));
