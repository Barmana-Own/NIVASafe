# Technical Report: Intermittent RULA BOTH Failure

| Item | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical report |
| Language | English |
| Jalali date | 1405-07-26 |
| Gregorian date | 2026-10-18 |
| Status | PARTIAL / BLOCKED; candidate built, new runtime and live deployment not verified |

## Scope and environment

Work was performed in the actual checkout `C:\NIVASafe`; the working tree already contained extensive unrelated changes, and no reset or clean operation was used. The isolated backend candidate is at `C:\NIVASafe\.local\rula-final-candidate-20261017-053748\backend`. Its earlier runtime marker was `rula-401-differential-candidate-20261018-01`. No process was started from that candidate after the current changes.

The local live API health endpoint at `127.0.0.1:5044` returned HTTP 200, version `0.1.0`, and MySQL up. The current snapshot showed PID 14048 (`node`), but the executable path was unreadable to Codex identity `srv9298144857\codexsandboxoffline`. Staging ports 5153, 53306, 15144, and 9226 had no listeners. The protected `.env` was not readable by the current identity. The local static root `C:\inetpub\nivasafe\app-com` still had index hash `E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9`, JS hash `2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17`, and CSS hash `EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86`. No live service or data was changed.

## 502 diagnosis

In the earlier failed candidate run, the `/api/v1/rula/posture-image-analysis` path converted two upstream ArvanCloud HTTP 200 responses into `RULA_IMAGE_AI_INVALID_RESPONSE` / HTTP 502. Application request ID: `a41a4fcd-f7d2-461b-9b82-3c1c19e02dce`. Upstream request IDs: `31f36d300656499ffaa9669a7fdc3a3f` and `aef41bceeca45bf945cdffb3b4a9b345`; durations were 12.587 s and 9.737 s. A separate BOTH run with the same old marker succeeded: one upstream HTTP 200 in 10.902 s, persisted the assessment, reloaded it in a fresh login, and generated JSON/PDF reports with HTTP 200. Observed matrix: one failed and one passed application BOTH attempt; too small a sample to establish stability.

The failure layer is confirmed as response validation/parsing. The prior run did not retain the model answer or response-shape metadata, so it is unknown whether the JSON, side container, a body-part field, overlay, or another field was invalid. The evidence does not establish a missing vision entitlement; both recorded upstream calls returned HTTP 200. Earlier direct text and image HTTP 200 probes were from the previous candidate, not the newly built candidate.

## Changes in this execution

| File | Scoped change |
|---|---|
| `backend/src/rula-posture-ai.ts` | Made the nested BOTH response contract explicit; parser errors now identify stable categories for invalid JSON, missing side containers, incomplete LEFT/RIGHT results, and invalid overlays. Validation remains fail-closed. |
| `backend/src/rula-posture-ai.test.ts` | Added a BOTH prompt contract test and incomplete-side diagnostic test. |
| `backend/src/image-analysis-diagnostics.ts` | Added an allowlist for validation reason codes; response text remains excluded from audit metadata. |
| `backend/src/image-analysis-diagnostics.test.ts` | Added coverage that retains only the allowed code and drops private response text. |
| `backend/src/rula-registered-member.test.ts` | Added route-level assertion for safe diagnostic persistence and response-text exclusion. |

These files already had other changes in the working tree before this execution. Current-turn changes were compared to the start snapshot in `C:\NIVASafe\.local\rula-502-contract-fix-20261018\before`; there is no separate start snapshot for `rula-registered-member.test.ts`. No schema, migration, provider adapter, authorization, consent, UI, or live backend changes were made. The prompt change is a reasonable contract-compliance mitigation, not a verified fix until the updated candidate passes real-provider runs.

## Candidate identity and hashes

The isolated candidate backend was built at the path above. Source hashes:

| File | SHA-256 |
|---|---|
| `backend/src/rula-posture-ai.ts` | `BD2990401413F6BF126ACD20DAD755AE5959C1AC7E49F656BAF3B5301D03A6A1` |
| `backend/src/image-analysis-diagnostics.ts` | `E70355BE208851C96774FA32D6FD60D76D4EE22674A03DF062882D4484EFAB16` |

Build artifact hashes:

| File | SHA-256 |
|---|---|
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `backend/dist/rula-posture-ai.js` | `D613E5CF59108FF11EACA0611DC2AABF13A1DD7BD841C6F2AF698D8D22DB08BC` |
| `backend/dist/image-analysis-diagnostics.js` | `E53C574DF2E39DCE27A9E348BF7201E9335DCF408E0F24E8B2C555AC74E16C12` |

The updated artifact has not run under a process. A new marker, `rula-both-schema-contract-candidate-20261018-02`, is set in the prepared isolated runner. The runner at `C:\NIVASafe\.local\rula-both-502-final-candidate-20261018\run-candidate-e2e.mjs` has SHA-256 `B23742A39F850A6B388559EDD0FDA41E1CAFEA10662EC7514D8540B5CA9407EB`; `node --check` passed. It is bounded to five analysis inputs (RIGHT, LEFT, and three independent BOTH requests), one text probe, and the route's single malformed-response retry; expected maximum is 11 provider calls. It records repeated 502s without stopping later BOTH attempts. Successful paths exercise save, manual-review state, fresh login, reload, JSON report, and PDF.

## Candidate validation

| Command / result | Outcome |
|---|---|
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner --maxWorkers=2` in candidate backend | PASS; 60 files, 414 tests; exit 0 |
| `C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit` in candidate backend | PASS; exit 0 |
| `C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json` in candidate backend | PASS; exit 0 |
| Four focused RULA Vitest files in `C:\NIVASafe\frontend` | PASS; 4 files, 29 tests; exit 0 |
| `C:\Runtime\node\node.exe scripts/check-api-contract.mjs` | PASS; 90 frontend paths, 154 backend routes; exit 0 |
| `C:\Runtime\node\node.exe scripts/verify-release.mjs` | PASS; 29 checks; exit 0 |
| `pnpm --version` | 11.25.0; repository pins `pnpm@10.13.1`; pinned package-manager wrapper was not run. |

Outputs are stored under `C:\NIVASafe\.local\rula-502-contract-fix-20261018\`. No live smoke, migration, or seed command ran. The full pnpm workspace, frontend build/typecheck, and browser E2E were not run. Focused frontend tests used source checkout, not a public browser/static bundle.

## Browser, security, and deployment

No native Debug plugin tool was callable in this session. PowerShell, Node/Vitest, and read-only CUA browser context were used. CUA showed the old route `http://127.0.0.1:15144/rula/rula-e2e-1/report` with a connection failure; it is not evidence for the current candidate. Playwright is not installed and Safari/WebKit was not tested. The new staging run was blocked because protected runtime configuration was inaccessible to the current identity and staging MariaDB was stopped. No ACL or task privilege was changed.

No production backend or frontend was deployed. No live service was restarted, no database/schema/record/upload was changed, and no production backup or rollback rehearsal was performed. The public artifact/version was not verified after these source changes. Live vision/privacy approvals remain closed or unverified. See `reports/evidence/rula-both-502-2026-10-18/ADMIN-RUNBOOK.md` for a bounded staging rerun.

## Next gate

An authorized Windows operator must run the candidate harness under an identity already permitted to read the protected provider configuration and isolated MariaDB datadir, then provide the resulting sanitized evidence. Browser acceptance with an approved staging member and real Chromium is a separate required check. Consider release only after repeated BOTH runs pass, code rollback is verified, and live privacy/vision authorization is documented independently. Current status remains `NOT DEPLOYED / LIVE FEATURE BLOCKED`.
