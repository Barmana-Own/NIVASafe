import fs from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { root, task, evidence, live, sha, read } from "./prepare.mjs";

// Both fixed frames were independently produced by the unchanged published
// application. This supplements one nondeterministic Chromium raster state;
// it does not relax pixel equality or derive expectations from candidate UI.
const helper = fileURLToPath(import.meta.url), output = `${evidence}/desktop-raster-oracle.json`;
assert(!fs.existsSync(output), "Preserve the oracle before replacing it");
const baselineFile = `${evidence}/baseline-observations.json`, diagnosticFile = `${evidence}/diagnostic-desktop-paint.json`, diagnosticHelper = `${root}/scripts/releases/${task}/diagnose-desktop-paint.mjs`;
const baseline = read(baselineFile), diagnostic = read(diagnosticFile), profile = { width: 1920, height: 1080, locale: "en", theme: "blue" };
const fixedOriginalSha = "d1d975ff9b5434254d96adcae21c557fd91eab3db7142f73dc6fa4757db1115a", fixedPublishedSha = "d93a115ac3cfb87f33480dfe0f963930cdd66b6e33f2b6cc809024d833feac3e";
const sameProfile = item => Object.keys(profile).every(key => item[key] === profile[key]);
assert.equal(baseline.status, "PASS"); assert.equal(diagnostic.status, "DIAGNOSTIC"); assert.equal(diagnostic.fatal, undefined); assert.equal(diagnostic.noProductEdits, true); assert.equal(diagnostic.noPixelTolerance, true); assert.equal(diagnostic.noDomCssFocusInjection, true);
for (const key of ["pageErrors", "unexpectedApiRequests", "blockedExternalRequests", "staticErrors"]) assert.deepEqual(diagnostic[key], []);
assert.equal(diagnostic.productionNetworkRequests, 0); assert.equal(diagnostic.productionMutations, 0); assert.equal(diagnostic.realAuthenticationRequests, 0);
assert.equal(diagnostic.baselineObservationsSha256, sha(baselineFile)); assert.equal(diagnostic.baselineIndexSha256, baseline.publishedIndexSha256); assert.equal(diagnostic.liveIndexSha256, baseline.publishedIndexSha256); assert.equal(sha(baseline.capturedIndex), baseline.publishedIndexSha256); assert.equal(sha(diagnosticHelper), diagnostic.helperSha256);
assert.equal(baseline.publishedStylesheets.length, 20);
const original = baseline.observations.find(item => item.stage === "landing" && sameProfile(item.profile)), old = diagnostic.diagnostics.find(item => item.published === true && sameProfile(item.profile));
assert(original && old, "Both original-only records are required"); assert.equal(original.screenshot.sha256, fixedOriginalSha); assert.equal(old.screenshots.length, 2); assert.equal(old.before.animations.length, 0); assert.equal(old.after.animations.length, 0); assert.equal(old.beforeDifference.differentPixels, 1215); assert.equal(old.settledDifference.differentPixels, 1215);
for (const frame of old.screenshots) assert.equal(frame.sha256, fixedPublishedSha);
const frames = [
  { id: "stored-original", source: "original-published-baseline", ...original.screenshot },
  { id: "independent-published-raster", source: "diagnostic-record-published-true", ...old.screenshots[0] },
];
for (const frame of frames) { assert.equal(sha(frame.path), frame.sha256); const bytes = fs.readFileSync(frame.path); assert.equal(bytes.readUInt32BE(16), 1920); assert.equal(bytes.readUInt32BE(20), 1080); }
const originalStaticInputs = baseline.liveStaticInputs.map(item => ({ path: `${live}${item.path}`, sha256: item.sha256 }));
for (const input of [...originalStaticInputs, ...baseline.sourceInputs, ...baseline.fontInputs]) assert.equal(sha(input.path), input.sha256);
const paths = [...new Set([helper, baselineFile, baseline.capturedIndex, diagnosticFile, diagnosticHelper, ...frames.map(item => item.path), ...old.screenshots.map(item => item.path), ...originalStaticInputs.map(item => item.path), ...baseline.sourceInputs.map(item => item.path), ...baseline.fontInputs.map(item => item.path)])];
const fixtures = paths.map(path => ({ path, sha256: sha(path) }));
fs.writeFileSync(output, JSON.stringify({
  status: "PASS", task, at: new Date().toISOString(),
  scope: { profile, stage: "landing", surface: "desktop", frames: 2 },
  policy: { strictPixelEquality: true, noRetries: true, noMasking: true, noTolerance: true, noCandidateDerivedExpectations: true, noAutomaticExtension: true, originalComputedControlsAndFocusStillRequired: true },
  helper: { path: helper, sha256: sha(helper) },
  baseline: { path: baselineFile, sha256: sha(baselineFile), index: { path: baseline.capturedIndex, sha256: baseline.publishedIndexSha256 } },
  diagnostic: { path: diagnosticFile, sha256: sha(diagnosticFile), helper: { path: diagnosticHelper, sha256: sha(diagnosticHelper) }, recordPublished: true, originalPixelDifferenceRetained: 1215 },
  frames, originalStaticInputs, publishedStylesheets: baseline.publishedStylesheets, sourceInputs: baseline.sourceInputs, fontInputs: baseline.fontInputs, fixtures,
}, null, 2), { flag: "wx" });
console.log(JSON.stringify({ status: "PASS", path: output, sha256: sha(output), frames: frames.map(item => ({ id: item.id, sha256: item.sha256 })), fixtures: fixtures.length }));
