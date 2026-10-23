import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { root, work, evidence, candidate, sha, read } from "./prepare.mjs";

// Four failed source-contract test cases retain all labels, fields and approval gates.
// Six superseded spellings occur within those cases; the behavioral regressions remain separate.
const repairs = [
  {
    test: "RULA creation stepper",
    old: `expect(assessmentPagesSource).toContain('else if (review?.editedAnalysis) { setRulaForce(review.force ?? 0); setRulaMuscleUse(review.muscleUse ?? false); setPostureAnalysis(review.editedAnalysis); }');`,
    next: `expect(assessmentPagesSource).toContain('else if (review?.editedAnalysis) publishSelectedRulaObservation(review.editedAnalysis, { force: review.force ?? 0, muscleUse: review.muscleUse ?? false });');\n    expect(assessmentPagesSource).toContain('currentRulaObservation.current = { analysis, ...adjustments };');`,
  },
  {
    test: "RULA process information",
    old: `expect(assessmentPagesSource).toContain('<RulaMuscleUseSelector value={rulaMuscleUse} onChange={setRulaMuscleUse}/>');`,
    next: `expect(assessmentPagesSource).toContain('<RulaMuscleUseSelector value={activeRulaAdjustments.muscleUse} onChange={(muscleUse) => updateRulaAdjustments({ muscleUse })}/>');\n    expect(assessmentPagesSource).toContain('activeSide={rulaReviewSide} onSideChange={setRulaReviewSide}');\n    expect(assessmentPagesSource).toContain('manualImageOverrides.current[imageKey] = imageOverrides;');`,
  },
  {
    test: "RULA process information",
    old: `expect(assessmentPagesSource).toContain('name="muscleUse" value={rulaMuscleUse ? "1" : "0"}');`,
    next: `expect(assessmentPagesSource).toContain('name="muscleUse" value={activeRulaAdjustments.muscleUse ? "1" : "0"}');`,
  },
  {
    test: "dashboard widget layout",
    old: `expect(appLayoutSource).toContain('collapsed={sidebarCollapsed}');`,
    next: `expect(appLayoutSource).toContain('collapsed={sidebarCollapsed && !mobileViewport}');\n    expect(appLayoutSource).toContain('useModalFocus(sidebar, mobileViewport && mobileOpen, () => setMobileOpen(false));');`,
  },
  {
    test: "form auto-save contract",
    old: String.raw`expect(assessmentPagesSource).toContain("...(side === \"RIGHT\" ? nextSides.RIGHT! : {})");`,
    next: `expect(assessmentPagesSource).toContain('...(targetSide === "RIGHT" ? nextSides.RIGHT! : {})');\n    expect(assessmentPagesSource).toContain('const targetSide = side ?? activeRulaSide;');`,
  },
  {
    test: "form auto-save contract",
    old: `expect(assessmentPagesSource).toContain('const visibleAnalysis = bodySide === "BOTH" ? analysis.sideAnalyses?.[activeSide] ?? analysis : analysis');`,
    next: `expect(assessmentPagesSource).toContain('const visibleAnalysis = rulaAnalysisForSide(analysis, bodySide === "BOTH" ? activeSide : bodySide);');\n    expect(assessmentPagesSource).toContain('return analysis.sideAnalyses?.[side] ?? (!analysis.sideAnalyses && (!analysis.bodySide || analysis.bodySide === side) ? analysis : postureAnalysisRowsFromValue(null));');`,
  },
];
const relative = "frontend/src/ui-rules.test.ts", targetPaths = [`${root}/${relative}`, `${candidate}/${relative}`];
const inspected = targetPaths.map(file => {
  const before = fs.readFileSync(file, "utf8"), eol = before.includes("\r\n") ? "\r\n" : "\n"; let after = before;
  for (const repair of repairs) { assert.equal(after.split(repair.old).length - 1, 1, `Expected one unchanged assertion in ${file}: ${repair.test}`); after = after.replace(repair.old, repair.next.replaceAll("\n", eol)); }
  return { file, before, after, beforeSha256: sha(file) };
});
const plan = { status: "EXACT_TEST_ONLY_REPAIR_PLAN", at: new Date().toISOString(), failedCases: 4, replacementCount: repairs.length, replacements: repairs, targets: inspected.map(({ file, beforeSha256 }) => ({ file, beforeSha256 })), applicationSourceUnchanged: true };
fs.writeFileSync(`${evidence}/contract-assertion-repair-plan.json`, JSON.stringify(plan, null, 2));
if (process.argv.includes("--apply")) {
  const manifest = read(`${evidence}/candidate.json`), frozen = manifest.files.find(file => file.path === relative); assert(frozen); assert.equal(sha(targetPaths[1]), frozen.sha256, "Candidate test file no longer matches the frozen manifest");
  const runtime = `${candidate}/frontend/src/features/assessments/AssessmentPages.tsx`, runtimeHash = sha(runtime);
  for (const [index, { file }] of inspected.entries()) { const backup = index === 0 ? `${work}/root-before/${relative}` : `${work}/ui-rules.frozen-before.test.ts`; fs.mkdirSync(path.dirname(backup), { recursive: true }); if (!fs.existsSync(backup)) fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL); }
  try { for (const record of inspected) { assert.equal(sha(record.file), record.beforeSha256); fs.writeFileSync(record.file, record.after); } }
  catch (error) { for (const record of inspected) fs.writeFileSync(record.file, record.before); throw error; }
  assert.equal(sha(runtime), runtimeHash);
  fs.writeFileSync(`${evidence}/contract-assertion-repair-applied.json`, JSON.stringify({ ...plan, status: "APPLIED_TEST_ONLY_NEEDS_REFREEZE_AND_VALIDATION", helperSha256: sha(fileURLToPath(import.meta.url)), targets: inspected.map(({ file, beforeSha256 }) => ({ file, beforeSha256, afterSha256: sha(file) })), runtimeSha256: runtimeHash }, null, 2));
}
console.log(JSON.stringify({ status: process.argv.includes("--apply") ? "APPLIED_NEEDS_REFREEZE" : "PLAN_READY", failedCases: 4, replacements: repairs.length }));
