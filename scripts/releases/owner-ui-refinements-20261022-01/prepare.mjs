import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { sha, read, hashText, files, liveFiles, runtimeIdentity } from "../rula-connected-overlay-20261022-01/prepare.mjs";

export { sha, read, hashText, files, runtimeIdentity };
export const root = "C:/NIVASafe";
export const task = "owner-ui-refinements-20261022-01";
export const id = `release-${task}`;
export const work = `${root}/.local/${task}`;
export const evidence = `${root}/reports/evidence/${task}`;
export const baseline = `${root}/.local/rula-connected-overlay-20261022-01/candidate`;
export const candidate = `${work}/candidate`;
export const live = "C:/inetpub/nivasafe/app-com";
export const config = `${root}/deployment/ecosystem.config.cjs`;
export const proxy = "C:/Runtime/nginx/conf/nginx.conf";
const excluded = new Set(["node_modules", "dist", ".turbo", ".vite-cache", "__pycache__", "playwright-results", "playwright-report"]);
const changedSource = "frontend/src/features/actions/ActionsPage.tsx";
const dateSource = "frontend/src/components/UI.tsx";
const tests = ["frontend/tests/e2e/actions-create-reset.spec.ts", "frontend/tests/e2e/actions-card-layout.spec.ts", "frontend/tests/e2e/action-date-contract.spec.ts", "frontend/test-fixtures/action-date-reset.html", "frontend/test-fixtures/action-date-reset.tsx"];

export function prepareE2ETestInputs() {
  const paths = ["fixtures.ts", "testData.ts", "assets/vazirmatn-arabic.woff2", "assets/vazirmatn-latin.woff2"].map(file => `frontend/tests/e2e/${file}`);
  assert(fs.existsSync(`${evidence}/candidate.json`));
  const files = paths.map(file => {
    const source = `${root}/${file}`, destination = `${candidate}/${file}`;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) assert.equal(sha(destination), sha(source));
    else fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    return { path: file, sha256: sha(destination) };
  });
  fs.writeFileSync(`${evidence}/e2e-test-prerequisites.json`, JSON.stringify({ status: "PREPARED_TEST_INPUTS_ONLY", candidateManifestSha256: sha(`${evidence}/candidate.json`), runtimeSourceChanged: false, productionArtifactsChanged: false, files }, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: "PREPARED_TEST_INPUTS_ONLY", count: files.length }));
}

export async function prepare() {
  assert(process.argv.includes("--source-ready"));
  const refresh = process.argv.includes("--refresh-source-before-validation");
  if (refresh) {
    assert(!fs.existsSync(`${evidence}/build-validation.json`), "Never change source after validation");
    for (const file of read(`${evidence}/candidate.json`).files) assert.equal(sha(`${candidate}/${file.path}`), file.sha256);
  } else {
    assert(!fs.existsSync(candidate), "Never replace an existing frozen candidate");
    assert(!fs.existsSync(`${evidence}/candidate.json`));
  }
  const previous = fs.readFileSync(`${baseline}/${changedSource}`, "utf8");
  const approved = fs.readFileSync(`${root}/${changedSource}`, "utf8");
  let expected = previous.replace('  const [creatingAction, setCreatingAction] = useState(false);', '  const [creatingAction, setCreatingAction] = useState(false);\n  const [createFormRevision, setCreateFormRevision] = useState({ FMEA: 0, RULA: 0 });');
  expected = expected.replace('      formElement.reset();', '      // A response for a detached form must not clear a different assessment\'s draft.\n      if (formElement.isConnected) {\n        if (createType === "FMEA") setCreateFmeaItemId("");\n        // Remount custom selects and date controls as well as native inputs.\n        setCreateFormRevision((current) => ({ ...current, [createType]: current[createType] + 1 }));\n      }');
  expected = expected.replace('key={actionDraftKey} storageKey={actionDraftKey}', 'key={`${actionDraftKey}:${createFormRevision.FMEA}`} storageKey={actionDraftKey}');
  expected = expected.replace('key={actionDraftKey} storageKey={actionDraftKey}', 'key={`${actionDraftKey}:${createFormRevision.RULA}`} storageKey={actionDraftKey}');
  assert.equal(approved.replaceAll("\r\n", "\n"), expected.replaceAll("\r\n", "\n"), "ActionsPage contains changes outside the approved form reset");
  const originalDate = fs.readFileSync(`${baseline}/${dateSource}`, "utf8");
  const currentDate = fs.readFileSync(`${root}/${dateSource}`, "utf8").replaceAll("\r\n", "\n");
  const dateTransplant = read(`${root}/.local/action-create-reset-20261022/date-transplant.json`);
  const dateBefore = dateTransplant.effect.before.replaceAll("\r\n", "\n");
  const dateAfter = dateTransplant.effect.after.replaceAll("\r\n", "\n");
  const hiddenBefore = dateTransplant.input.before;
  const hiddenAfter = dateTransplant.input.after;
  const datePatch = originalDate.replaceAll("\r\n", "\n").replace(dateBefore, dateAfter).replace(hiddenBefore, hiddenAfter);
  assert.notEqual(datePatch, originalDate.replaceAll("\r\n", "\n"), "Date fix is missing");
  assert.equal(datePatch, currentDate, "Date control contains unrelated changes");
  const supplements = [`${root}/.local/rula-hide-image-ui-20261022-01/visibility.css`, `${root}/.local/actions-cards-20261022-01/cards.css`];
  const originalRootCss = fs.readFileSync(`${root}/.local/rula-hide-image-ui-20261022-01/styles.before.css`, "utf8");
  const css = supplements.map(file => fs.readFileSync(file, "utf8")).join("\n");
  assert.equal(fs.readFileSync(`${root}/frontend/src/styles.css`, "utf8"), `${originalRootCss}\n${css}`, "Unrelated root styles changed");
  for (const file of tests) assert(fs.existsSync(`${root}/${file}`));
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(work, { recursive: true });
  let api, staticFiles;
  if (!refresh) {
  api = await runtimeIdentity();
  staticFiles = liveFiles().map(file => ({ path: file, sha256: sha(`${live}/${file}`), bytes: fs.statSync(`${live}/${file}`).size }));
  const protection = { capturedAt: new Date().toISOString(), api, envSha256: sha(`${root}/.env`), configSha256: sha(config), proxySha256: sha(proxy), indexSha256: sha(`${live}/index.html`), staticFiles };
  fs.writeFileSync(`${evidence}/runtime-before.json`, JSON.stringify(protection, null, 2), { flag: "wx" });
  fs.copyFileSync(`${live}/index.html`, `${work}/index.before.html`, fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(candidate);
  const filter = source => {
    const name = path.basename(source);
    return !excluded.has(name) && !name.endsWith(".tsbuildinfo") && name !== ".env" && (!name.startsWith(".env.") || [".env.example", ".env.sample"].includes(name));
  };
  for (const directory of ["frontend", "shared/domain"]) fs.cpSync(`${baseline}/${directory}`, `${candidate}/${directory}`, { recursive: true, filter });
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "turbo.json"]) fs.copyFileSync(`${baseline}/${file}`, `${candidate}/${file}`);
  for (const directory of ["", "frontend", "shared/domain"]) fs.symlinkSync(`${root}/${directory ? `${directory}/` : ""}node_modules`, `${candidate}/${directory ? `${directory}/` : ""}node_modules`, "junction");
  const contract = read(`${root}/reports/evidence/rula-connected-overlay-20261022-01/test-contract-sources.json`).files;
  for (const file of contract) {
    assert.equal(sha(`${baseline}/${file.path}`), file.sha256);
    fs.mkdirSync(path.dirname(`${candidate}/${file.path}`), { recursive: true });
    fs.copyFileSync(`${baseline}/${file.path}`, `${candidate}/${file.path}`, fs.constants.COPYFILE_EXCL);
  }
  fs.writeFileSync(`${evidence}/test-contract-sources.json`, JSON.stringify({ files: contract, backendBuiltOrPublished: false }, null, 2), { flag: "wx" });
  } else {
    ({api, staticFiles} = read(`${evidence}/runtime-before.json`));
    fs.copyFileSync(`${evidence}/candidate.json`, `${evidence}/candidate-before-scoped-race-and-date-repair.json`, fs.constants.COPYFILE_EXCL);
  }
  fs.copyFileSync(`${root}/${changedSource}`, `${candidate}/${changedSource}`);
  fs.writeFileSync(`${candidate}/${dateSource}`, datePatch);
  for (const file of tests) {
    fs.mkdirSync(path.dirname(`${candidate}/${file}`), { recursive: true });
    fs.copyFileSync(`${root}/${file}`, `${candidate}/${file}`, refresh ? 0 : fs.constants.COPYFILE_EXCL);
  }
  const cssRelative = "frontend/src/styles.css";
  fs.writeFileSync(`${candidate}/${cssRelative}`, `${fs.readFileSync(`${baseline}/${cssRelative}`, "utf8")}\n${css}`);
  fs.writeFileSync(`${work}/owner-ui.css`, css);
  const allFiles = files(candidate);
  const modified = allFiles.filter(file => !fs.existsSync(`${baseline}/${file}`) || sha(`${baseline}/${file}`) !== sha(`${candidate}/${file}`));
  assert.deepEqual(modified.sort(), [changedSource, dateSource, cssRelative, ...tests].sort());
  for (const directory of ["frontend", "shared/domain"]) for (const file of files(`${baseline}/${directory}`)) assert(fs.existsSync(`${candidate}/${directory}/${file}`), "Protected source disappeared");
  const manifest = { status: "PREPARED", task, id, candidate, baseline, preparedAt: new Date().toISOString(), modified, cssSupplement: `${work}/owner-ui.css`, cssSupplementSha256: sha(`${work}/owner-ui.css`), backendChanged: false, apiRestartRequired: false, noDependenciesChanged: true, files: allFiles.map(file => ({ path: file, sha256: sha(`${candidate}/${file}`) })) };
  fs.writeFileSync(`${evidence}/candidate.json`, JSON.stringify(manifest, null, 2), { flag: refresh ? "w" : "wx" });
  console.log(JSON.stringify({ status: "PREPARED", task, modified, protectedStaticFiles: staticFiles.length, apiPid: api.pid }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.includes("--prepare-e2e-test-inputs")) prepareE2ETestInputs();
  else await prepare();
}
