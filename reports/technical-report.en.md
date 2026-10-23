# NIVASafe image consent, provider identity and safe release

| Field / مشخصه | Value / مقدار |
|---|---|
| Project | NIVASafe |
| Type | Technical |
| Language | English |
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Release | release-rula-image-experience-20261019-01 |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf; preserved dirty working tree |
| Delivery | CODE DEPLOYED; LIVE IMAGE DISABLED; provider acceptance PARTIAL |

## Scope and observed root causes

Preserve R6/R7/R8 geometry, side processing, historic scoring and human-review enforcement; no accuracy tuning or second model. Replace repeated image-card copy/filenames and giant fallback UX with compact shared cards and per-image review. Keep role/subscription/quota/tenant/file controls.

1. Production image requests were blocked by missing real platform privacy approval before the provider. Actual effective flags remain empty; no organization allowlist or fabricated authorization added.
2. Authenticated Arvan HTTP200 returned requested GPT-5-Mini as openai/gpt-5-mini. The application rejected this exact namespace at provider-model identity validation (AI_MODEL_MISMATCH -> application503), before posture JSON validation. Red tests reproduced it; allow only this exact Arvan alias for the configured family and retain the actual returned ID. Bare GPT-5-Mini and dated gpt-5-mini-2025-08-07 remain accepted. Wrong families/namespaces/suffixes and GPT substitution for chat are denied. No request-model, endpoint, fallback or chatbot behavior change.
3. Two image requests reached their120s deadline with no upstream HTTP response. The upstream delay cause is UNKNOWN. Final successful image requests4/5/6 were HTTP200, parsed and persisted; no anatomy success inferred from HTTP. There was no accepted final response turning into application502 in this bounded subset.
4. The full browser run failed at report reload waiting for networkidle while existing automatic RULA text generation/retries continued. The hard10-call budget was reached; last text response was not observed before shutdown, so it is UNKNOWN, not a fabricated429/503. The failed run remains FAIL. Subsequent actual saved-record reopen/GET/PDF in two ordinary-user organizations passed with provider dispatch disabled; these are separate checks. Organization B BOTH and repeated RIGHT standalone remain incomplete.

## Consent, privacy and architecture

Current notice version rula-image-consent-2026-10-19-v1 explicitly discloses unverified gateway terms and disabled public transfer. A fresh image batch or tenant switch revokes prior consent; registration/draft restoration do not grant it. Missing/outdated version403 and audit write failure prevent dispatch. Existing AuditLog captures actor/org/server time/request ID, model/purpose/side/locale and original-upload SHA256 before existing normalization/provider dispatch. Six synthetic image receipts exist; no raw photo, filename, full prompt, JWT or key stored in those receipts. No schema migration or new dependency. A final verified-terms notice version must replace this provisional wording before activation.

Official Arvan [privacy policy](https://www.arvancloud.ir/en/legal/privacy-policy), [terms](https://www.arvancloud.ir/en/legal/terms) and [DPA](https://www.arvancloud.ir/en/legal/data-processing-agreement) were reviewed; applicability and specific image retention/training/location/deletion terms for this actual API account remain unproved. No universal legal ruling is asserted. Owner/provider decisions and exact proposed approval wording: docs/legal/rula-image-platform-approval.2026-10-19.md. General consent does not establish rights over someone else's photograph.

## Actual acceptance

| Item | Verdict |
|---|---|
| SOURCE FIXED | PASS,20 application/test files plus probe and authorized deployment config |
| STAGING IMAGE E2E | PARTIAL; B LEFT and A BOTH image processing/manual edits/save/relogin/GET/report/PDF succeeded; complete uninterrupted run FAIL |
| Human-review/tampering | PASS; unreviewed finalization400; no invented angles |
| Manual closed-gate workflow | PASS,2 ordinary organizations,390/1280,save/reload/PDF/cross-tenant denial,zero provider calls |
| Provider budget |10/10:6 image attempts,4 automatic report-text attempts; histories retained |
| Models | Requested GPT-5-Mini; observed GPT-5-Mini,gpt-5-mini-2025-08-07,openai/gpt-5-mini. Chat DeepSeek-V4-Flash checked locally/runtime only |
| Account-wide model attribution | UNPROVED; no usage export/dashboard; only this run's timestamp/model/request-ID/fingerprint/origin recorded |
| CODE DEPLOYED | PASS,23 public document/asset hashes,health200/DBup,8 anonymous401 denials,public Chrome390/1280 no JS/API errors |
| LIVE VISION ENABLED | NO; both effective PM2 platform flags empty |
| Anatomical accuracy | NOT independently validated; optimization paused |

## Security, preservation and remaining work

No known material security defect introduced by this scope remains: consent before dispatch, durable audit, existing authorization/file gates, controlled diagnostics, model allowlist and escaped UI verified. Production/staging422 column contracts across37 tables matched read-only. No production user record query, migration, upload mutation or DB restore.68 changed-source/artifact files scanned for configured secrets/private keys. No dependency change; a new dependency advisory scan was NOT_RUN. Root dirty work and all required routes/features/scoring versions/assets preserved. Only user-requested repeated copy/controls were intentionally removed; original support/manual/review capabilities remain.

Initial harness failures (missing isolated fixture/config copies, strict test typing, title exact-match locator, evidence-path replacement, schema physical-column ordering and reload networkidle) are preserved with corrections; application tests were not deleted/weakened. Existing PM2 wmic ENOENT metric warnings did not fail the isolated rollback health checks.

Before image activation: complete real provider/platform approval record, revise the notice to verified conditions, finish bounded provider stability and second-organization BOTH acceptance. No owner permission is needed for those routine engineering tests once actual authorization exists. No further paid call was made in this task.

## Validation commands / دستورات اعتبارسنجی

| Package | Executed command | Exit |
|---|---|---|
| frontend | `corepack pnpm run test` | 0 |
| frontend | `corepack pnpm run typecheck` | 0 |
| frontend | `corepack pnpm run lint` | 0 |
| frontend | `corepack pnpm run build` | 0 |
| shared/domain | `corepack pnpm run test` | 0 |
| shared/domain | `corepack pnpm run typecheck` | 0 |
| shared/domain | `corepack pnpm run lint` | 0 |
| shared/domain | `corepack pnpm run build` | 0 |
| backend | `corepack pnpm run test` | 0 |
| backend | `corepack pnpm run typecheck` | 0 |
| backend | `corepack pnpm run lint` | 0 |
| backend | `corepack pnpm run build` | 0 |

API contract:93 frontend paths/155 backend routes; exit0. Release verifier:29 checks; exit0. Test totals:638 backend/69files,435 frontend/62files,19 domain/2files;1092 unique tests. See validation.json,validation-backend-r2.json,contracts-r2.json and individual logs. Existing Vite chunk-size warning remains non-blocking.

## Changed files / فایل‌های تغییرکرده

| Path | Change |
|---|---|
| `frontend/src/features/assessments/AssessmentPages.tsx` | Modified |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.test.ts` | Modified |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.ts` | Modified |
| `frontend/src/features/assessments/rulaImageConsent.ts` | Added |
| `frontend/src/features/assessments/RulaImageConsentDialog.test.tsx` | Added |
| `frontend/src/features/assessments/RulaImageConsentDialog.tsx` | Added |
| `frontend/src/features/assessments/RulaPostureImageCard.test.tsx` | Added |
| `frontend/src/features/assessments/RulaPostureImageCard.tsx` | Added |
| `frontend/src/i18n.test.ts` | Modified |
| `frontend/src/i18n.tsx` | Modified |
| `frontend/src/styles/assessments.css` | Modified |
| `backend/src/ai-provider.test.ts` | Modified |
| `backend/src/ai-provider.ts` | Modified |
| `backend/src/assessment-routing-policy.test.ts` | Modified |
| `backend/src/image-analysis-diagnostics.test.ts` | Modified |
| `backend/src/image-analysis-diagnostics.ts` | Modified |
| `backend/src/modules/assessments.ts` | Modified |
| `backend/src/rula-image-consent.ts` | Added |
| `backend/src/rula-registered-member.test.ts` | Modified |
| `backend/src/rula-three-stage.test.ts` | Modified |
| `scripts/probe-efficient-vision-model.mjs` | Exact Arvan response namespace, no request/endpoint change |
| `deployment/ecosystem.config.cjs` | Authorized API entry/version cutover only; gates/worker preserved |

Legal documents: docs/legal/rula-image-processing-review.2026-10-19.md; docs/legal/rula-image-platform-approval.2026-10-19.md; docs/rula-image-platform-access.md. Release scripts: scripts/releases/rula-image-experience-20261019-01/{backup-protected-config.ps1,prepare.mjs,rehearse.mjs,release.mjs}. Required stage documents, state, manifest, integrity and dated reports updated; unrelated source, schemas, assets and dependencies preserved.

## Artifact identity / هویت نسخه

- Backend/frontend release: release-rula-image-experience-20261019-01; staging marker rula-image-experience-20261019-01-r2; PID8960, SYSTEM, NIVASafe-API scheduled task/PM2; API listener127.0.0.1:5044.
- Backend entry: C:\ProgramData\NIVASafe\releases\release-rula-image-experience-20261019-01\backend\dist\server.js
- Frontend root: C:/inetpub/nivasafe/app-com; index SHA256: 1d18d2d8266449731a5ff883705542adac5503db0ed65259b61d3294ee24bcf2
- Compiled module hashes: C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01/runtime-after.json; C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01/prepared.json. Source hashes: C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01/scope-security-integrity.json.
- Backup: C:/ProgramData/NIVASafe/backups/release-rula-image-experience-20261019-01; protected .env and runtime rollback state access remains SYSTEM/Administrators only.
- Rollback: `C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-image-experience-20261019-01\release.mjs rollback`; guarded code/config/index restore, no data rollback. Actual old/new/old service rehearsal and static swap passed before cutover.

## Stage reconciliation / مراحل در دامنهٔ انتشار امن

| Stage | Status | Observable work |
|---|---|---|
| 01 | PASS (code-only scope) | Public access means all eligible memberships after one actual platform approval, explicit informed image consent, no fabricated provider approval and no anatomical optimization. Source baseline and old release preserved. |
| 02 | PASS (code-only scope) | Compact image cards retain per-image edit/remove/retry and controlled status. Filename duplication, support link inside each card and giant fallback block intentionally replaced. Versioned bilingual disclosure is in a separate consent dialog; mobile/desktop and RTL/LTR verified. |
| 03 | PASS (code-only scope) | Shared RulaPostureImageCard, RulaImageConsentDialog and typed notice added; new image batches/tenant changes clear consent.435 tests, typecheck/lint/build and16 component browser states passed. |
| 04 | PASS (code-only scope) | Current consent version required and durable actor/tenant-bound audit receipt awaited before provider dispatch. Exact authenticated Arvan response alias openai/gpt-5-mini accepted only for the configured GPT-5-Mini family; request model and endpoint unchanged.638 backend tests passed. |
| 05 | PASS (code-only scope) | Existing AuditLog JSON stores consent version, selected-upload fingerprint and request identity. No schema/migration required. Production/staging422 column contracts across37 tables equal using read-only information_schema; no production records read/written. |
| 06 | PASS (code-only scope) | Image multipart adds imageAnalysisConsentVersion; missing/outdated versions403. Existing paths preserved:93 frontend paths/155 backend routes. Genuine final-candidate3 image requests parsed;2 provider-derived assessments saved/reopened/PDF. |
| 07 | PASS (code-only scope) | Existing server-side membership/role/subscription/quota/tenant checks preserved. Two ordinary-user organizations tested; unauthorized401, consent403, invalid file415, unreviewed finalization400 and cross-organization404. No per-organization image allowlist. |
| 08 | PASS (code-only scope) | Default-unchecked consent, audit-failure dispatch denial, safe response identity allowlist, escaped UI and existing file/auth gates verified. Configured-secret/private-key scan68 files PASS; protected rollback config remains SYSTEM/Administrators only. No dependencies or security controls weakened. |
| 09 | PASS (code-only scope) | 1092 unique tests passed:638 backend,435 frontend,19 domain. Twelve applicable package checks exit0;93/155 contract and29 release checks exit0. Original full provider/browser run FAIL and subsequent zero-provider reopen PASS are separate evidence. Full feature acceptance remains PARTIAL. |
| 10 | PASS (code-only scope) | Exact Arvan namespace mismatch reproduced red/green and repaired. Image120s timeouts remain UNKNOWN upstream cause. Reload networkidle wait failed amid automatic report text calls;10-call hard budget enforced. Actual saved records reopened in Chrome390/1280 with provider disabled;16 component cases and2 public login cases passed. Safari/WebKit NOT_RUN. |
| 11 | PASS (code-only scope) | DEPLOYED_CODE_ONLY release-rula-image-experience-20261019-01; PID8960 SYSTEM via existing NIVASafe-API/PM2. Backup C:/ProgramData/NIVASafe/backups/release-rula-image-experience-20261019-01. Operational old/new/old rehearsal and static rollback passed;23 public hashes/health checks and8 anonymous401 checks passed. Both image gates remain empty; no migration, protected-env edit, worker/Nginx restart or production assessment write. |
| 12 | PASS (code-only scope) | PASS only for this closed-image-feature safe code release after source/artifact parity, secret/ACL/schema/auth/rollback/public runtime verification. Full product/image acceptance is BLOCKED pending real provider terms/platform decision, final notice revision and remaining provider stability/second-organization BOTH checks. No independent anatomical validation claimed. |

Every PASS in this table is scoped to code release with public image gates closed. Whole-product RULA acceptance remains BLOCKED. Clean migration replay and Safari/WebKit are NOT_RUN; no schema change or Safari coverage is claimed.

## Evidence / شواهد

All relative evidence files are under `C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01`: acceptance.json; provider-request-provenance.json; provider-failure-audit.json; final-both-browser.json (FAIL preserved); reopen-after-budget.json (separate PASS); closed-manual-browser.json; browser-components.json; public-browser.json; schema-security.json; protected-backup-after.json; operational-rollback.json; deployment.json; runtime-after.json. Original snapshots and failed harness logs retained.
