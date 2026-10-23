# NIVASafe — RULA model routing, 502 and final-candidate evidence

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical report |
| Language | English |
| Gregorian / Jalali | 2026-10-18 / 1405-07-26 |
| Generated UTC | 2026-10-18T20:00:41.882Z |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| Candidate | rula-versioned-tables-candidate-20261018-05 |
| Delivery | NOT DEPLOYED; staging technical E2E verified; accuracy gate FAIL |

## Release decision

**SOURCE FIXED / STAGING TECHNICAL E2E PASS / ACCURACY FAIL / CODE NOT DEPLOYED / LIVE VISION NOT ENABLED.** Technical pass is not anatomical accuracy acceptance. No PM2/service restart, live static replacement, live account/credential mutation, schema migration or production data update occurred.

## Confirmed mechanisms and unresolved history

- The prior historical application 502 followed provider 200, but its exact failing response was never retained. Historical offending JSON/path remains **UNKNOWN**. Do not re-label it as invalid credentials or missing vision entitlement.
- A reproducible valid-output failure exists in the previous scoring mapper: legs at 90° with support score 1 became score 3; the parser's maximum leg score is 2, so it rejected the entire side. Wrist base-angle bands could likewise exceed the wrist limit. New mapping treats leg support categorically, corrects base-angle bands and keeps all image rows review-required. This proves a repaired mechanism, not that it was the original historical response.
- The previous calculator used weighted arithmetic averaging rather than A/B/C lookups. The chosen reference is the [Cornell February 2001 worksheet](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf). Its table/angle conventions are versioned; see also [Cornell's RULA notes](https://ergo.human.cornell.edu/ahRULA.html) about differences among published worksheet versions. Independent ergonomic certification is not claimed.
- Existing records are not bulk rescored. Untagged persisted inputs are read as legacy-average-v1; new/reviewed assessments are server-tagged cornell-worksheet-2001-tables-v1. Client attempts to select legacy scoring for a new assessment are ignored. Real isolated HTTP/DB checks proved neutral legacy metadata edits retain 2 while new table-based neutral assessments return 1. Live read-only inspection found 51 assessments, 44 different under the new tables, zero out-of-range part indices; no values were written.
- Source permitted risk-provider overrides/fallbacks; the legacy CLI explicitly requested GPT-4.1-Mini. These are now constrained. The actual active compiled provider still contains GPT-4.1-Mini primary / GPT-4o-mini fallback for RULA, a real deployment/source drift. These paths can explain reachable noncompliant dispatch, but do not attribute any particular billing row without provider request evidence.
- reasoning_effort remains omitted for Arvan image/structured requests. RULA transport remains bounded (default 60 s; configurable cap 120 s, tested in staging). Earlier 60 s aborts did not recur in these new runs; the latency root cause remains unproved. Ambiguous automatic paid replays are disabled; explicit manual recovery is retained.

## Provider/model contract and usage attribution

Assessment requests use **GPT-5-Mini**, accepted as **gpt-5-mini-2025-08-07**, through HTTPS api.arvancloudai.ir /v1/chat/completions. The one authenticated /v1/models request returned 200 and listed GPT-5-Mini and DeepSeek-V4-Flash. Catalog presence alone does not prove inference. Current staging requests proved vision acceptance; no real DeepSeek or FMEA AI/image inference was made this turn. Source routes and regression tests constrain both assessment families; chat remains DeepSeek-V4-Flash and was not migrated to GPT.

Provider credentials were loaded from protected settings only in memory. Observations record authorization presence/equality booleans, not keys or fingerprints. Current runs have PID, time and safe provider request IDs; the Arvan account usage export was not available. Earlier reports/CLI probes and the active older adapter contain other GPT names, but full account-consumer attribution remains unproved. Codex's own model is separate from NIVASafe's outbound model selection.

| Run | PID | Image/text calls | Upstream 200 | App 502/429 | Result |
|---|---|---|---|---|---|
| model-locked-r3 | 4360 | 3/1 | 4 | 0/2 | FAIL |
| model-locked-r3-browser-followup | 14416 | 3/0 | 3 | 0/0 | FAIL |
| model-locked-tables-r4-browser | 12072 | 2/2 | 4 | 0/0 | FAIL |
| versioned-r5-final-live-provider | 11752 | 3/0 | 3 | 0/0 | PASS |
| versioned-r5-both-stability | 756 | 2/0 | 2 | 0/0 | PASS |

There were 16 new bounded inference attempts across these code/harness revisions (13 image calls), all observed upstream HTTP 200. The additional final repeats followed a material scoring/provenance rebuild; paid text/browser probes were not repeated for the stability-only run. Earlier operator evidence was read before any new call and is historical, not included in this count. The first run had two local 429s after negative tests consumed the route's 8/minute limit. No rate limit was weakened. Later failures were test-harness issues (review started before the UI's second side finished, mobile form not opened, stale PDF selector, unactivated new disposable fixture user); their artifacts are retained, not overwritten.

## Final candidate and persistence

Paid E2E marker **rula-versioned-tables-candidate-20261018-05**, PID **11752**, Windows identity **SRV9298144857\Administrator**. Repeated stability PID **756**, identical component hashes. Backend entrypoint: `C:\NIVASafe\.local\rula-final-candidate-20261017-053748\backend\dist\server.js`. API 5153; disposable DB 53306 with checked datadir `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\mariadb\data`; separate uploads/JWT secrets. Disposable schema bootstrap used db push --skip-generate with no data-loss flag; this is not historical migration replay or a production migration. Generated Prisma 6.19.3 was reused.

Final combined BOTH and independent browser RIGHT/LEFT calls returned genuine observations. Seven rows per side were retained, with human-review flags. The API exercises save 201, attachment/link, review update, fresh login/GET, report and PDF 200. Browser BOTH edited all 14 rows against the geometric reference, saved, reloaded and opened the same assessment after a fresh-context login. Staging suffixes: API `1fbb9e1d`, browser `006d4b99`. These are synthetic accounts/data, not a clinical review. Repeated BOTH runs also persisted/reopened/reported successfully.

The original simple stick figure and the new two-panel labeled geometric reference are only two synthetic fixtures, not a representative accuracy study. Final angle comparisons: **14/20** within the engineering ±15° threshold; maximum **90°**. Left upper-arm/forearm estimates can be materially wrong. Similar final scores can mask these errors. Automatic measurement accuracy therefore **FAILS**, despite valid JSON and HTTP 200.

## Browser/security evidence

Real installed Chrome **155.0.8059.80** via isolated playwright-core **1.64.1**, without intercepted API/provider responses. 390/1280 px English layout had scrollWidth equal to innerWidth and no page exceptions. Paid success E2E ran on the versioned backend; the final frontend's subsequent error-only manual-retry change was rebuilt and separately exercised against the real staging API with provider disabled. Final bundle verified mobile login/reopen/PDF, actual 503 privacy-gate errors, explicit manual retry and zero persisted scores after failure, with zero provider calls. WebKit/Safari/iOS and Persian RTL were not run this turn.

Actual staging negative statuses: missing auth 401, cross-tenant 401, viewer 403, missing consent 403, invalid signature 415. New input-bound tests return 400 before persistence. All image observations require human review; no privacy/provider authorization was disabled. Current synthetic successful writes are isolated. Concurrent external paid-request deduplication is not independently certified; automatic replay of ambiguous failures is prevented, and the server's quota/authorization regression tests pass.

Final review covered routing, external response parsing, score indices, provenance, error redaction, privacy/tenant checks and retry behavior. Candidate dependency audit returned zero findings. Support/FMEA/chat tests pass as source regressions; public support or real chat/FMEA AI acceptance is **NOT_RUN**, and no such live PASS is claimed.

## Commands, failures and toolchain

### Tools actually invoked

The bundled Debug entry, diagnosis and test-driven-development skills were used. Native Debug/Chrome DevTools plugin tools were not callable in this session; none are claimed to have run. Actual execution used PowerShell through exec_command, Node.js fetch/process/file tools, MariaDB CLI, generated Prisma Client, Vitest/TypeScript/Turbo, installed Chrome via isolated Playwright Core, local image inspection, and primary-document web lookup. UI UX Designer native tools were not used. The NIVASafe-named task inventory contained only the existing API and Nginx tasks; no new AI scheduled task was created. Historical isolated snapshots/reports were preserved, not rewritten as current model-call implementations.

The final validation shell prefixed only its own PATH with C:\Runtime\node and set COREPACK_ENABLE_NETWORK=0. It executed C:\Runtime\node\pnpm.cmd exec turbo build/lint/typecheck/test --force, with each exact command and exit code retained in the pinned-final logs. No Windows access action is now required to unblock this runner.

| Command | Environment / exit / result |
|---|---|
| pnpm --version | Corepack/pinned shim: 10.13.1; global fallback remains 11.25.0 |
| pnpm exec turbo build --force | Isolated candidate; exit 0; all three packages freshly built |
| pnpm exec turbo lint --force | Isolated; exit 0; TypeScript checks, not ESLint |
| pnpm exec turbo typecheck --force | Isolated; exit 0 |
| pnpm exec turbo test --force | Isolated; exit 0; backend 439, frontend 345, domain 19 = 803 tests |
| pnpm verify:contract | Actual source checkout; exit 0; 90 frontend paths / 154 routes |
| pnpm verify:release | Actual source; exit 0; 29 static checks, not deployment proof |
| pnpm audit --prod --json | Isolated candidate; exit 0; zero advisories at all severities |
| node run-candidate-e2e.mjs (final 05) | Operator staging; exit 0; real provider, API, MariaDB and Chrome |
| node run-candidate-e2e.mjs (two-repeat stability) | Operator staging; exit 0; bounded real BOTH repetitions |
| node finish-readonly-browser.mjs | Operator staging; exit 0; provider disabled, real API/DB/browser recovery |
| pnpm build (earlier actual root) | Exit 2: missing root backend @prisma/client/vitest/type dependencies; no destructive dependency repair |
| pnpm verify:contract / verify:release (earlier isolated wrapper) | Exit 1: scripts absent from old isolated copy; actual source scripts subsequently passed |

Earlier Turbo reused cached results under the Git-ignored isolated directory. Those cached logs were not accepted as final source evidence. Forced fresh runs were used. Corepack was 10.13.1 but Turbo initially found the global 11.25.0 child shim; final commands prepend C:\Runtime\node only in that process, so both parent/children use the pinned shim. No global package-manager change occurred. Final Node executable used for staging is C:\Runtime\node\node.exe, v22.22.3.

One earlier full test run had a cold Windows transform timeout; its unfinished test then affected the next fetch mock. Provider tests now transform the graph during collection and restore timers/globals in cleanup. Subsequent fresh full runs passed without retries. Root EPERM was an identity/protected-path restriction, not proven Defender/lock corruption; the already-authorized operator route ran isolated validation successfully. No ACL, Defender, firewall or live node_modules change was made. Root missing dependencies remain distinct from that access issue. Vite's existing >500 kB chunk warning remains.

## Active service, release and recovery

Live API PID 14048, NT AUTHORITY\SYSTEM, entrypoint C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js. Existing task NIVASafe-API starts run-pm2.cmd; PM2 app is nivasafe-api. Existing Nginx task serves the public host; verified static root is C:\inetpub\nivasafe\app-com. No privileged task was created and SYSTEM was not impersonated.

Active provider SHA-256: **8784D5C1124B8E727ED33E73E546DA92A0C91243671C89EE521EC67744206FCF**. Candidate provider: **DF7ABDED9E4DFEF13D20EF1F1466E771F18F6ABC35F2CA0AB690BE8D3CEE6A07**. The server.js hash alone is identical because dependencies changed; it cannot establish release freshness. Public JS remains **2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17**, CSS **EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86**. Public/local health and public login/assets returned 200. No authenticated public image test occurred.

Recovery: `C:\NIVASafe\.local\rula-model-contract-20261018-113940\backend-code-recovery`. All 117 active compiled files and 17 packaged domain files were copied/reconstructed to separate safe locations and hash matched. Protected config was not copied to an unprotected directory. This is file recovery, not a completed PM2 cutover/rollback rehearsal. No schema change is required; no live migration/history rewrite or database restore was attempted.

Release remains held at the failed accuracy gate. Production image approvals are not established (RULA_IMAGE_PRIVACY_APPROVED_PROVIDER and RULA_IMAGE_VISION_SUPPORTED_PROVIDER absent from inspected protected sources). No code/static publication or live feature activation occurred. A narrower code-only release also has not been executed or represented as accepted. Obtain documented ergonomic acceptance and organizational image-processing approval before live activation; working gateway authentication does not supply either approval.

## Exact source paths changed in this task

These are scoped edits within an already heavily modified repository, not a claim that every diff in these files belongs to this task. Revision remains e5bf3f050bd6e127e13918c8d3eefcd3f8376acf; no commit/reset/clean occurred. The recoverable checkpoint is `C:\NIVASafe\.local\rula-model-contract-20261018-113940\before`. Earlier fixture/checkpoint attribution remains uncertain where no pre-task file snapshot existed.

- `C:\NIVASafe\backend\src\ai-provider.ts`
- `C:\NIVASafe\backend\src\ai-provider.test.ts`
- `C:\NIVASafe\backend\src\assessment-routing-policy.test.ts`
- `C:\NIVASafe\backend\src\rula-posture-ai.ts`
- `C:\NIVASafe\backend\src\rula-posture-ai.test.ts`
- `C:\NIVASafe\backend\src\image-analysis-diagnostics.ts`
- `C:\NIVASafe\backend\src\image-analysis-diagnostics.test.ts`
- `C:\NIVASafe\backend\src\modules\assessments.ts`
- `C:\NIVASafe\backend\src\modules\reports.ts`
- `C:\NIVASafe\backend\src\rula-three-stage.test.ts`
- `C:\NIVASafe\backend\src\fmea-detail-generation.test.ts`
- `C:\NIVASafe\backend\src\rula-registered-member.test.ts`
- `C:\NIVASafe\backend\src\rula-report.ts`
- `C:\NIVASafe\backend\src\rula-report.test.ts`
- `C:\NIVASafe\backend\src\rula-multi-image.test.ts`
- `C:\NIVASafe\shared\domain\src\index.ts`
- `C:\NIVASafe\shared\domain\src\index.test.ts`
- `C:\NIVASafe\shared\domain\src\rula-tables.ts`
- `C:\NIVASafe\shared\domain\src\rula-reference.test.ts`
- `C:\NIVASafe\frontend\src\features\assessments\AssessmentPages.tsx`
- `C:\NIVASafe\frontend\src\features\assessments\RulaEvaluationRowDialog.tsx`
- `C:\NIVASafe\frontend\src\features\assessments\assessmentAiFailure.ts`
- `C:\NIVASafe\frontend\src\features\assessments\assessmentAiFailure.test.ts`
- `C:\NIVASafe\scripts\probe-efficient-vision-model.mjs`

No routes/sidebar entries, database structure or support implementation were added/removed. Root build outputs changed during one unsuccessful root build, but active packaged runtime artifacts and its separate domain package were not overwritten. Tool-only Playwright dependency is isolated under .local/rula-browser-tools; root manifests/lockfile were not upgraded.

## Stage/handoff state

Stages 01–07 reused the existing product/architecture, confined changes to RULA/routing/scoring, retained schema, contract and auth boundaries. Stage 08 security review and Stage 09 executable validation passed for this scope. Stage 10 technical journeys pass but anatomical accuracy fails. Stage 11 publication was not performed; Stage 12 overall acceptance is not granted. The task/project is **not complete**. No old Windows/browser permission blocker is being recycled: operator access and real browser execution worked.

Evidence inventory: candidate-manifest.json, acceptance-matrix.md, per-run JSON/JSONL, pinned-final logs, authenticated-model-catalog.json, live-schema-readonly.json, public-and-artifact-check.json, recovery manifests and actual screenshots under `C:\NIVASafe\reports\evidence\rula-model-contract-2026-10-18`.
