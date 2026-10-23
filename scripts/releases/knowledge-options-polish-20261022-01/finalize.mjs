import fs from "node:fs";
import assert from "node:assert/strict";
import { root, task, id, evidence, sha, read } from "./prepare.mjs";

const deployment = read(`${evidence}/deployment.json`);
const build = read(`${evidence}/build-validation.json`);
const browser = read(`${evidence}/e2e-validation.json`);
const liveUi = read(`${evidence}/live-ui.json`);
const review = read(`${evidence}/final-review.json`);
assert.equal(deployment.status, "DEPLOYED");
for (const record of [build, browser, liveUi, review]) assert.equal(record.status, "PASS");
assert.equal(review.candidateManifestSha256, sha(`${evidence}/candidate.json`));
const record = {
  task, classification: "TARGETED_KNOWLEDGE_PRESENTATION_REPAIR", status: "COMPLETE_SCOPED_REPAIR",
  completedAt: new Date().toISOString(), scope: "Seven existing knowledge creation option cards only",
  cssOnly: true, frontendOnly: true, javaScriptChanged: false, backendChanged: false, databaseChanged: false,
  apiRestarted: false, authorizationAndSubmissionPreserved: true, globalProjectCompletionClaimed: false,
  validation: { frontendTests: build.tests.passed, browserTests: browser.passed, typecheckLintBuild: "PASS", security: "PASS_SCOPED", liveBrowser: "PASS", preservation: "PASS" },
  fullStackArchitectureRebuild: "NOT_APPLICABLE_CSS_ONLY_REPAIR",
  documentation: "docs/knowledge-options-polish-2026-10-22.md", evidence: `reports/evidence/${task}/final-review.json`,
  deploymentEvidence: `reports/evidence/${task}/deployment.json`, cssSupplement: deployment.cssAsset,
};
const statePath = `${root}/project-state.json`, state = read(statePath);
state.knowledgeOptionsPolish20261022 = record;
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
const releasePath = `${root}/release-manifest.json`, release = read(releasePath);
release.knowledgeOptionsPolish20261022 = { id, ...record, backendPreserved: deployment.apiUnchanged };
release.latestVerifiedFrontendMaintenanceRelease = id;
fs.writeFileSync(releasePath, `${JSON.stringify(release, null, 2)}\n`);
fs.appendFileSync(`${root}/project-integrity-manifest.md`, `\n\n## Knowledge option cards — 2026-10-22\n\nOwner-requested presentation changes affect only the seven existing knowledge creation option labels. No fields, hints, actions or native controls were removed, hidden or replaced. Five-card role-dependent forms retain their original controls. GeneralPages source and all JavaScript remain unchanged; all previous ${deployment.preservedPriorStaticFiles} non-index static files and ${deployment.preservedStylesheets.length} stylesheet links were retained, along with API process/configuration, private environment and reverse proxy. Only a scoped stylesheet and one index link were added. Evidence: reports/evidence/${task}/final-review.json.\n`);
fs.appendFileSync(`${root}/docs/knowledge-options-polish-2026-10-22.md`, `\n## Verified delivery\n\n- Published scoped CSS: \`${deployment.cssAsset}\`. Existing JavaScript entry unchanged.\n- ${build.tests.passed} frontend unit/source-contract tests, shared-domain build, TypeScript typecheck/lint and production frontend build: PASS.\n- ${browser.passed} isolated Chrome browser cases: PASS with zero failures or skipped cases. Layout, both directions/themes, keyboard controls, multi-selection, existing upload/submission contracts, disabled quota and failure retention were verified using synthetic fixtures.\n- Authenticated live presentation: PASS, seven cards retained, transparent grid wrapper, full-width upload and no page overflow. No knowledge records or attachments were created or modified on production for this verification.\n- Scoped source/security, immutable publication and independent final preservation gates: PASS. Forced-colors fallback was reviewed in CSS; no browser forced-colors test is claimed.\n- Backend/database tests: NOT_RUN; no backend or persistence change. Their existing authorization/upload contracts and running process were preserved.\n`);
fs.writeFileSync(`${evidence}/completion.json`, JSON.stringify(record, null, 2), { flag: "wx" });
console.log(JSON.stringify({ task, status: record.status, frontendTests: build.tests.passed, browserTests: browser.passed, cssAsset: deployment.cssAsset }));
