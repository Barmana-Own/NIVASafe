# NIVASafe Final Changelog and Release Handover

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Attributed change log and operational handover |
| Gregorian date | 2026-10-16 |
| Jalali date | 1405/07/24 |
| Repository | C:\NIVASafe, main, e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| Production mutation | None recorded |

## Scope and attribution

The phase 01, 02 and 03 reports identify focused changes, but the working tree already contained hundreds of modifications. Git status had 384 changed/untracked entries at this audit's start and 392 after adding the eight reports in this handover; prior phase records listed 375 and 378. Grouping below follows phase reports; no claim is made that every non-report change belongs to those prompts.

## Prompt 01 — UI/UX focused changes

| Path | Reported purpose | Verification |
|---|---|---|
| frontend/src/features/support/SupportPage.tsx | Preserve visible support-thread content during list refresh | Synthetic browser reply/refresh interaction |
| frontend/src/features/admin/AdminPanelPage.tsx | Accessible AI quota-save status | Synthetic fixture changed 1,000,000 to 1,250,000 |
| frontend/src/i18n.tsx | Persian/English status copy | Source and fixture UI |
| frontend/tests/e2e/fixtures.ts | Synthetic support/quota/notification fixtures | Syntax parsing only; Playwright suite not run |
| frontend/tests/e2e/testData.ts | Test data aligned with API and one-million default | Fixture only |
| frontend/tests/e2e/interaction.spec.ts | Regression scenarios for support, quota and notifications | Not executed by Playwright |
| frontend/tests/e2e/touch-targets.spec.ts | Touch-target checks | Not executed by Playwright |
| frontend/src/styles/foundations.css | Theme-token contrast for RULA detected-posture toggle | Focused UI test and sampled contrast measurements |
| frontend/src/components/enterprisePresentation.test.tsx | CSS regression assertion | 15 focused tests passed in phase 01 |

The compact RULA/FMEA tables and broader responsive flows were already in the saved source according to the phase report. Navigation, routes and workflows were preserved; no new sidebar item or page was attributed to this phase.

## Prompt 02 — RULA and support fixes

| Path | Reported purpose | Verification |
|---|---|---|
| backend/src/modules/support.ts | Allow only active database-confirmed protected system admin fallback when optional support allowlists are absent; retain organization scope and audit | Isolated MariaDB/API/browser journey |
| backend/src/support.test.ts | Regression tests for operator policy, privacy and ticket lifecycle | Support module 20/20; exact focused invocation not retained |
| frontend/vite.config.ts | Environment/config-loader behavior; later adjusted again in prompt 03 | Isolated build/test reports |
| project-state.json | Record stage/checkpoint state | Current state says release blocked |
| reports/customer-report.* and reports/technical-report.* | Prior phase handover documents | Historical artifacts retained |

No production role, support allowlist, provider credential, privacy approval, database record or upload was changed.

### Support staging evidence

Member ticket create returned 201; identical idempotency replay 200; conflicting key reuse 409. Member/admin public replies returned 201. Status/priority/assignment update returned 200. Data remained after reload. Cross-organization lookup returned 404, unauthenticated access 401, internal notes were not returned to the member, and three notification records were created. Browser verification used the existing /support and /admin pages against isolated staging; external notification delivery and production deployment were not proven.

### RULA staging evidence

One synthetic PNG request reached the reported ArvanCloud-compatible gateway. Upstream HTTP 401; application HTTP 503 RULA_IMAGE_AI_UNAVAILABLE; sanitized request ID b8e12c19-f17b-4c7a-9cdd-875209157873; no score saved. Authentication, organization/role, quota, image consent, signature and provider-approval gates passed before provider invocation. No successful image-analysis result or persistence chain passed.

## Prompt 03 — integrated final QA configuration

| Path | Reported purpose |
|---|---|
| frontend/package.json | Use Vite runner config loader in build/test scripts |
| frontend/vite.config.ts | Avoid scanning protected local environment files in production/test/CI; preserve process VITE variables |
| backend/package.json | Use runner config loader in tests; cap test workers at two |
| backend/vitest.config.ts | Disable local environment-file loading in tests |
| scripts/verify-release.mjs | Assert config-loader/test-script expectations |

These were source-tree changes only. Candidate assets were generated under C:\Users\Administrator\AppData\Local\Temp\NIVASafe-debug-phase02-20261016-070300. They were not copied to C:\inetpub\nivasafe\app-com.

## Pre-existing or uncertain working-tree changes

- Git status count: 384 at audit start and 392 after these reports; earlier phase checkpoints: 375 and 378. Roughly 370 unrelated entries were reported as pre-existing at the start of prompt 01.
- Working-tree package diffs include Fastify and Nodemailer version edits and removal of frontend @playwright/test plus test:e2e scripts, while Playwright configuration and E2E sources remain. Prompt 03 recorded these as pre-existing to its pass; exact original author and first edit time are uncertain.
- Other unlisted files, generated snapshots, migrations, documentation and features are not attributed to prompts 01–03 without a prior checkpoint diff.
- Do not replace this work from the older NIVASafe-Project-Source-2026-10-15.zip.

## Dependencies, configuration and migrations

- No new dependency was reported by prompts 01–03.
- Root package pins pnpm@10.13.1; active CLI reports 11.25.0. @playwright/test and frontend E2E scripts are absent from the current package baseline, while Playwright config/source remain.
- Relevant configuration key names: RULA_IMAGE_PRIVACY_APPROVED_PROVIDER and RULA_IMAGE_VISION_SUPPORTED_PROVIDER (not modified); SUPPORT_OPERATOR_USER_IDS and SUPPORT_OPERATOR_ORGANIZATION_IDS (not changed in production); AI_RISK_PROVIDER and independent model/provider settings (no runtime secret values changed).
- No database migration was applied or deployed. Disposable migration replay stopped after eight steps with MySQL 1060 duplicate globalRole; three historical checksums differed from production. Reconcile the baseline before any future migration.

## Production assets, backup and rollback

- Active static root: C:\inetpub\nivasafe\app-com. Deployed JS index-Oi8C_V4d.js hash 0A7DC090FA40F3333131629F0D71EAD62B01242834E7A982A5E062C9F12A1287 and CSS index-dHBcyaJi.css hash 259CF6FFE851CDFDED77536B65DDC670E2423BAC1D7BEDA1259C088E5BC17B17.
- Candidate JS index-DfoYd8t8.js hash 55F60A8F0AF85683CF34DCA329200CEA9265E9F974A665297F48AACAE36E8647 and CSS index-BYkR_3Tt.css hash 53B8C769E1A8758E56E64206D755757E47A735B8C030C4E6BBB695988A81289D remain under the isolated temp workspace. Hash mismatch confirms they are not deployed static assets.
- Local health returned HTTP 200, database up, version 0.1.0. Active backend process command line and exact source build were inaccessible.
- Backup: C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z. Manifest lists a 2,404,630-byte working-tree patch, 35 uploads / 20,890,437 bytes and a 2,553,589-byte SQL dump (38 CREATE TABLE statements, SHA-256 16940E05101B9312D9D73DBDB68E638CC995B446BF1929D3539B19B9AFB614FB). Restore verification remains pending.
- Previous release directory: C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update.
- No service restart, cutover, live DB write or rollback occurred. Previous release readiness was not tested. The server manager command could not be safely identified from this execution identity; no invented restart/rollback command is provided.
- If a later release fails, retain post-release data and revert artifacts only through the verified service manager. Use a database rollback only after backup restoration is proven safe. No database rollback applies here because no live migration/write occurred.

## Validation artifacts

- UI screenshots and sanitized browser records: reports/uiux-evidence/
- Isolated build/test logs: reports/evidence/phase03-final-validation-20261016/
- Phase reports: reports/final-ui-ux-validation.md and reports/final-debug-rula-tickets.md
- Final isolated summary: reports/NIVASafe-FINAL-TECHNICAL.md and reports/NIVASafe-FINAL-CHECKLIST.md

Final isolated counts were 737/737 tests (backend 403, frontend 322, domain 12), 90 frontend API paths / 154 backend routes, and 29 release checks. Root pnpm wrappers failed before task execution under pnpm 11.25.0; pnpm audit failed with registry EACCES. These are not production acceptance.

