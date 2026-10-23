import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, id, evidence, sha, read } from "./prepare.mjs";

const deployment = read(`${evidence}/deployment.json`);
const build = read(`${evidence}/build-validation.json`);
const browser = read(`${evidence}/e2e-validation.json`);
const liveUi = read(`${evidence}/live-ui.json`);
const finalReview = read(`${evidence}/final-review.json`);
for (const result of [build, browser, liveUi, finalReview]) assert.equal(result.status, "PASS");
assert.equal(deployment.status, "DEPLOYED");
assert.equal(finalReview.candidateManifestSha256, sha(`${evidence}/candidate.json`));
const record = {
  task, classification: "TARGETED_OWNER_UI_REPAIR", status: "COMPLETE_SCOPED_REPAIR",
  scope: "RULA notice/owner-selector frontend visibility, photo edit styling, corrective-action form reset and responsive list cards",
  completedAt: new Date().toISOString(), frontendOnly: true, backendChanged: false, databaseChanged: false,
  apiRestarted: false, consentAndAuthorizationPreserved: true, globalProjectCompletionClaimed: false,
  applicableStages: { requirements: "PASS", existingDesignSystem: "PASS", frontend: "PASS", unchangedApiDatabaseAuthReview: "PASS", security: "PASS_SCOPED", tests: "PASS", qa: "PASS", deployment: "PASS", independentFinalReview: "PASS" },
  fullStackArchitectureRebuild: "NOT_APPLICABLE_TARGETED_FRONTEND_REPAIR",
  validation: { frontendTests: build.tests.passed, browserTests: browser.passed, typecheckLintBuild: "PASS", security: "PASS_SCOPED", liveBrowser: "PASS", preservation: "PASS" },
  evidence: `reports/evidence/${task}/final-review.json`, documentation: "docs/owner-ui-refinements-2026-10-22.md",
  deploymentEvidence: `reports/evidence/${task}/deployment.json`, jsEntrypoint: deployment.newEntry, cssSupplement: deployment.cssSupplement,
};
const statePath = `${root}/project-state.json`;
const state = read(statePath);
state.ownerUiRefinements20261022 = record;
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
const releasePath = `${root}/release-manifest.json`;
const release = read(releasePath);
release.ownerUiRefinements20261022 = { id, ...record, backendPreserved: deployment.apiUnchanged };
release.latestVerifiedFrontendMaintenanceRelease = id;
fs.writeFileSync(releasePath, `${JSON.stringify(release, null, 2)}\n`);
fs.appendFileSync(`${root}/project-integrity-manifest.md`, `\n\n## Owner interface refinements — 2026-10-22\n\nFour explicitly requested interface changes were deployed. The two RULA sections are INTENTIONALLY_HIDDEN_FRONTEND_ONLY at the owner's request; processing state, ownership and consent guards remain intact. Native/custom action fields reset only after confirmed creation of the submitted form, with assessment context and independent drafts preserved. The shared date control retains delayed autosave and native reset behavior. All action card information, filters, status editing, progress and all three register types remain available. All ${deployment.preservedPriorStaticFiles} previous non-index static files and four prior stylesheet links were preserved; API PID/configuration, environment and reverse proxy remained identical. Independent evidence: reports/evidence/${task}/final-review.json.\n`);
fs.appendFileSync(`${root}/docs/owner-ui-refinements-2026-10-22.md`, `\n## Verified delivery\n\n- Deployed entry: \`${deployment.newEntry}\`; scoped supplement: \`${deployment.cssSupplement}\`.\n- ${build.tests.passed} frontend unit/source-contract tests, TypeScript typecheck/lint, shared-domain build and production frontend build: PASS.\n- ${browser.passed} isolated Chrome browser regressions: PASS, covering creation success/failure, duplicate submission, pending assessment switching, delayed IndexedDB date restoration, native date reset/unmount and responsive cards across all three registers.\n- Live authenticated browser presentation checks: PASS; no production records were created or changed by these checks.\n- Scoped security and preservation review: PASS. Backend/database test suites were not rerun for this frontend-only change; existing contracts and runtime were preserved.\n- Test harness failures and subsequent synthetic quota-fixture repair are retained in the evidence history. The source build/artifacts remained unchanged during that test-only repair.\n- Earlier source/database ZIP remains its original dated snapshot; this release did not rewrite that deliverable.\n`);
fs.writeFileSync(`${evidence}/completion.json`, JSON.stringify(record, null, 2), { flag: "wx" });
console.log(JSON.stringify({ task, status: record.status, frontendTests: build.tests.passed, browserTests: browser.passed, id }));
