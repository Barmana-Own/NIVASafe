import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, id, evidence, sha, read } from "./prepare.mjs";

const deployment = read(`${evidence}/deployment.json`), build = read(`${evidence}/build-validation.json`);
const browser = read(`${evidence}/e2e-validation.json`), liveUi = read(`${evidence}/live-ui.json`), review = read(`${evidence}/final-review.json`);
assert.equal(deployment.status, "DEPLOYED");
for (const record of [build, browser, liveUi, review]) assert.equal(record.status, "PASS");
assert.equal(review.candidateManifestSha256, sha(`${evidence}/candidate.json`));
assert.equal(browser.passed, 6);
assert(liveUi.heightAfter < liveUi.heightBefore);
const record = {
  task, classification: "TARGETED_FILES_UPLOAD_CONTROL_ENHANCEMENT", status: "COMPLETE_SCOPED_REPAIR",
  completedAt: new Date().toISOString(), scope: "Existing Files upload form: compact selection box and existing organization-image picker",
  frontendOnly: true, javaScriptChanged: true, backendChanged: false, databaseChanged: false, dependenciesChanged: false,
  apiRestarted: false, authorizationAndExistingFileWorkflowsPreserved: true, globalProjectCompletionClaimed: false,
  validation: { frontendTests: build.tests.passed, browserTests: browser.passed, typecheckLintBuild: "PASS", security: "PASS_SCOPED", liveBrowser: "PASS", preservation: "PASS" },
  fullStackArchitectureRebuild: "NOT_APPLICABLE_TARGETED_FRONTEND_MAINTENANCE",
  documentation: "docs/files-organization-image-picker-2026-10-22.md", evidence: `reports/evidence/${task}/final-review.json`,
  deploymentEvidence: `reports/evidence/${task}/deployment.json`, cssSupplement: deployment.cssSupplement,
};
for (const file of ["project-state.json", "release-manifest.json"]) {
  const content = read(`${root}/${file}`);
  content.filesOrganizationImagePicker20261022 = file === "release-manifest.json" ? { id, ...record, backendPreserved: deployment.apiUnchanged } : record;
  if (file === "release-manifest.json") content.latestVerifiedFrontendMaintenanceRelease = id;
  fs.writeFileSync(`${root}/${file}`, `${JSON.stringify(content, null, 2)}\n`);
}
fs.appendFileSync(`${root}/project-integrity-manifest.md`, `\n\n## Files upload selection — 2026-10-22\n\nOnly the Files upload form gained the requested organization-image choice and reduced selection-box height. All existing local file types, optional reference, upload action, role permissions, report navigation, list, preview, download and delete capabilities remain. The shared organization picker and all backend/database/API contracts are unchanged. All ${deployment.preservedPriorStaticFiles} prior non-index assets and ${deployment.preservedStylesheets.length} stylesheet links were preserved; API identity, private configuration and reverse proxy remained unchanged. Final evidence: reports/evidence/${task}/final-review.json.\n`);
fs.appendFileSync(`${root}/docs/files-organization-image-picker-2026-10-22.md`, `\n## Verified delivery\n\n- Published JavaScript entry: \`${deployment.newEntry}\`; scoped stylesheet: \`${deployment.cssSupplement}\`.\n- Shared-domain build, ${build.tests.passed} frontend unit/source-contract tests, TypeScript typecheck/lint, compilation and production frontend build: PASS.\n- All six isolated Chrome browser cases: PASS, zero failed/skipped cases. Tested Persian RTL light layouts at 1280/390 px and English LTR blue at 1024 px.\n- First browser attempt: four cases passed; the layout test incorrectly counted a native file input's implicit button role as an actual nested button. A single test locator was corrected; the original manifest/test/failure evidence was retained and all six browser cases rerun. Runtime source and validated production artifacts did not change during this test-only correction.\n- Read-only authenticated production acceptance: PASS. Selection box measured ${liveUi.heightBefore.toFixed(1)} px before and ${liveUi.heightAfter.toFixed(1)} px after; both choices, organization picker, optional reference, reports and file list were verified. No production files were uploaded, replaced or deleted for acceptance.\n- Independent scoped security/regression review, immutable artifact/public-byte verification and final preservation review: PASS.\n- Backend/database test suites: NOT_RUN_FRONTEND_ONLY_CHANGE. No migrations, backend restart or persistence changes were required. This is not a repository-wide security audit or a new full-stack release.\n`);
fs.writeFileSync(`${evidence}/completion.json`, JSON.stringify(record, null, 2), { flag: "wx" });
console.log(JSON.stringify({ status: record.status, task, frontendTests: build.tests.passed, browserTests: browser.passed }));
