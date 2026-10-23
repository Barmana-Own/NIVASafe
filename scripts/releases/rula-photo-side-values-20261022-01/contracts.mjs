import fs from "node:fs";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { task, candidate, evidence, sha, read } from "./prepare.mjs";
const manifestFile = `${evidence}/candidate.json`, browserFile = `${evidence}/e2e-validation.json`, buildFile = `${evidence}/build-validation.json`;
const manifest = read(manifestFile), browser = read(browserFile), build = read(buildFile);
assert.equal(browser.status, "PASS"); assert.equal(build.status, "PASS");
assert.equal(browser.candidateManifestSha256, sha(manifestFile)); assert.equal(build.candidateManifestSha256, sha(manifestFile));
for (const file of manifest.files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
for (const file of build.artifacts) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
const posture = await import(pathToFileURL(`${candidate}/backend/dist/rula-posture.js`).href);
const report = await import(pathToFileURL(`${candidate}/backend/dist/rula-report.js`).href);
const inference = await import(pathToFileURL(`${candidate}/backend/dist/rula-posture-ai.js`).href);
const { z } = createRequire(`${candidate}/backend/package.json`)("zod");
// saveRulaImageResult validates the base inference, then appends a validated
// durable-result UUID. Validate that actual wire shape, keeping strict keys.
const wireResponse = inference.rulaPostureImageAnalysisResponseSchema.extend({ analysisRequestId: z.string().uuid() });
let responses = 0, observations = 0, mutations = 0, bilateralImages = 0;
for (const ledger of browser.ledgers) {
  for (const response of ledger.inferenceResponses ?? []) {
    const data = wireResponse.parse(response.data);
    assert(data.sides[response.bodySide]); responses += 1;
  }
  for (const mutation of ledger.mutations) {
    if (!mutation.payload?.postureAnalysis) continue;
    const analysis = posture.rulaPostureAnalysisSchema.parse(mutation.payload.postureAnalysis);
    const bodySide = mutation.payload.bodySide ?? ledger.bodySide ?? "BOTH";
    for (const image of analysis.imageAssessments ?? []) {
      posture.assertRulaPostureSide(bodySide, image.analysis);
      const fallback = { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, force: image.force, muscleUse: image.muscleUse, algorithmVersion: "cornell-worksheet-2001-tables-v1" };
      report.rulaInputSchema.parse(report.rulaInputsForAnalysis(fallback, image.analysis));
      if (bodySide === "BOTH") {
        const results = report.buildRulaSideResults(bodySide, fallback, image.analysis); assert(results?.LEFT && results.RIGHT);
        for (const side of ["LEFT", "RIGHT"]) { assert(image.analysis.sideAnalyses?.[side]); assert(results[side].score >= 1 && results[side].score <= 7); }
        assert.equal(report.primaryRulaResult(results).score, Math.max(results.LEFT.score, results.RIGHT.score)); bilateralImages += 1;
      }
      observations += 1;
    }
    mutations += 1;
  }
}
assert(responses > 0 && observations >= 8 && mutations >= 2 && bilateralImages >= 8, "Exercise real browser contract data, not an empty ledger");
const result = { status: "PASS", task, candidateManifestSha256: sha(manifestFile), buildEvidenceSha256: sha(buildFile), browserEvidenceSha256: sha(browserFile), helperSha256: sha(new URL(import.meta.url)), schemaValidatedInferenceResponses: responses, schemaValidatedImageObservations: observations, schemaValidatedMutations: mutations, independentlyScoredBilateralImages: bilateralImages, strictBuiltBackendContracts: true, databaseOrProviderAccess: false };
fs.writeFileSync(`${evidence}/contract-validation.json`, JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify(result));
